// src/services/KnowledgeBaseService.js - Lógica de negócio para base de conhecimento
const { executeQuery } = require('../config/database');
const { generateId } = require('../utils/helpers');

class KnowledgeBaseService {
    // Listar artigos com filtros
    static async listArticles(filters = {}) {
        let query = `
            SELECT kb.*, u.name as author_name 
            FROM knowledge_base kb 
            LEFT JOIN users u ON kb.author_id = u.id 
            WHERE kb.status = 'published'
        `;
        let params = [];

        // Aplicar filtros
        if (filters.category) {
            query += ' AND kb.category = ?';
            params.push(filters.category);
        }

        if (filters.search) {
            query += ' AND (kb.title LIKE ? OR kb.summary LIKE ? OR kb.content LIKE ? OR kb.tags LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (filters.tags) {
            const tags = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
            const tagConditions = tags.map(() => 'kb.tags LIKE ?').join(' OR ');
            query += ` AND (${tagConditions})`;
            tags.forEach(tag => params.push(`%${tag}%`));
        }

        // Ordenação
        const validSortFields = ['title', 'created_at', 'updated_at', 'views'];
        const sortBy = validSortFields.includes(filters.sort_by) ? filters.sort_by : 'created_at';
        const sortOrder = filters.sort_order === 'asc' ? 'ASC' : 'DESC';
        query += ` ORDER BY kb.${sortBy} ${sortOrder}`;

        // Paginação
        const limit = Math.min(parseInt(filters.limit) || 20, 100);
        const offset = parseInt(filters.offset) || 0;
        query += ` LIMIT ${limit} OFFSET ${offset}`;

        // Contar total
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM knowledge_base kb 
            WHERE kb.status = 'published'
        `;
        let countParams = [];

        if (filters.category) {
            countQuery += ' AND kb.category = ?';
            countParams.push(filters.category);
        }

        if (filters.search) {
            countQuery += ' AND (kb.title LIKE ? OR kb.summary LIKE ? OR kb.content LIKE ? OR kb.tags LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (filters.tags) {
            const tags = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
            const tagConditions = tags.map(() => 'kb.tags LIKE ?').join(' OR ');
            countQuery += ` AND (${tagConditions})`;
            tags.forEach(tag => countParams.push(`%${tag}%`));
        }

        const [articles, totalResult] = await Promise.all([
            executeQuery(query, params),
            executeQuery(countQuery, countParams)
        ]);

        const totalCount = totalResult[0].total || 0;

        return {
            articles: articles.map(article => this.formatArticle(article)),
            total_count: totalCount,
            filtered_count: articles.length,
            pagination: {
                limit,
                offset,
                has_more: (offset + limit) < totalCount
            }
        };
    }

    // Buscar artigo por ID ou slug
    static async findArticle(identifier, incrementViews = false) {
        let query = `
            SELECT kb.*, u.name as author_name 
            FROM knowledge_base kb 
            LEFT JOIN users u ON kb.author_id = u.id 
            WHERE (kb.id = ? OR kb.slug = ?) AND kb.status = 'published'
        `;

        const articles = await executeQuery(query, [identifier, identifier]);

        if (articles.length === 0) {
            return null;
        }

        const article = articles[0];

        // Incrementar visualizações se solicitado
        if (incrementViews) {
            await this.incrementViews(article.id);
            article.views = (article.views || 0) + 1;
        }

        return this.formatArticle(article);
    }

    // Criar novo artigo
    static async createArticle(articleData, authorId) {
        // Validar dados básicos
        const validation = this.validateArticle(articleData);
        if (!validation.isValid) {
            throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`);
        }

        // Gerar slug único
        const slug = await this.generateUniqueSlug(articleData.title);

        const articleToCreate = {
            id: generateId(),
            title: articleData.title.trim(),
            slug,
            summary: articleData.summary.trim(),
            content: articleData.content.trim(),
            category: articleData.category.toLowerCase(),
            tags: this.processTags(articleData.tags),
            status: 'published',
            author_id: authorId,
            views: 0,
            helpful_count: 0,
            not_helpful_count: 0,
            created_at: new Date(),
            updated_at: new Date()
        };

        // Inserir artigo
        await executeQuery(`
            INSERT INTO knowledge_base (
                id, title, slug, summary, content, category, tags, 
                status, author_id, views, helpful_count, not_helpful_count,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            articleToCreate.id, articleToCreate.title, articleToCreate.slug,
            articleToCreate.summary, articleToCreate.content, articleToCreate.category,
            articleToCreate.tags, articleToCreate.status, articleToCreate.author_id,
            articleToCreate.views, articleToCreate.helpful_count, articleToCreate.not_helpful_count,
            articleToCreate.created_at, articleToCreate.updated_at
        ]);

        // Buscar artigo criado com dados do autor
        const createdArticle = await this.findArticle(articleToCreate.id);
        return createdArticle;
    }

    // Atualizar artigo
    static async updateArticle(id, updateData, updatedBy) {
        // Verificar se artigo existe
        const existingArticle = await this.findArticle(id);
        if (!existingArticle) {
            throw new Error('Artigo não encontrado');
        }

        // Validar dados de atualização
        const validation = this.validateArticleUpdate(updateData);
        if (!validation.isValid) {
            throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`);
        }

        const updates = [];
        const params = [];

        // Campos que podem ser atualizados
        const allowedFields = ['title', 'summary', 'content', 'category', 'tags', 'status'];
        
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                if (field === 'tags') {
                    updates.push(`${field} = ?`);
                    params.push(this.processTags(updateData[field]));
                } else if (field === 'category') {
                    updates.push(`${field} = ?`);
                    params.push(updateData[field].toLowerCase());
                } else {
                    updates.push(`${field} = ?`);
                    params.push(typeof updateData[field] === 'string' ? updateData[field].trim() : updateData[field]);
                }
            }
        }

        if (updates.length === 0) {
            throw new Error('Nenhum campo válido para atualização');
        }

        // Atualizar slug se título mudou
        if (updateData.title && updateData.title !== existingArticle.title) {
            const newSlug = await this.generateUniqueSlug(updateData.title, id);
            updates.push('slug = ?');
            params.push(newSlug);
        }

        // Adicionar updated_at
        updates.push('updated_at = ?');
        params.push(new Date());
        params.push(id);

        // Executar update
        const query = `UPDATE knowledge_base SET ${updates.join(', ')} WHERE id = ?`;
        await executeQuery(query, params);

        // Retornar artigo atualizado
        const updatedArticle = await this.findArticle(id);
        return updatedArticle;
    }

    // Deletar artigo
    static async deleteArticle(id) {
        const article = await this.findArticle(id);
        if (!article) {
            throw new Error('Artigo não encontrado');
        }

        await executeQuery('DELETE FROM knowledge_base WHERE id = ?', [id]);
        return article;
    }

    // Avaliar artigo (útil/não útil)
    static async rateArticle(id, isHelpful, userId = null) {
        const article = await this.findArticle(id);
        if (!article) {
            throw new Error('Artigo não encontrado');
        }

        // Verificar se usuário já avaliou (se userId fornecido)
        if (userId) {
            const existingRating = await executeQuery(
                'SELECT id FROM article_ratings WHERE article_id = ? AND user_id = ?',
                [id, userId]
            );

            if (existingRating.length > 0) {
                throw new Error('Usuário já avaliou este artigo');
            }

            // Registrar avaliação do usuário
            await executeQuery(
                'INSERT INTO article_ratings (id, article_id, user_id, is_helpful, created_at) VALUES (?, ?, ?, ?, ?)',
                [generateId(), id, userId, isHelpful, new Date()]
            );
        }

        // Atualizar contadores
        const field = isHelpful ? 'helpful_count' : 'not_helpful_count';
        await executeQuery(
            `UPDATE knowledge_base SET ${field} = ${field} + 1 WHERE id = ?`,
            [id]
        );

        // Retornar artigo atualizado
        const updatedArticle = await this.findArticle(id);
        return updatedArticle;
    }

    // Buscar artigos relacionados
    static async getRelatedArticles(articleId, limit = 5) {
        const article = await this.findArticle(articleId);
        if (!article) {
            return [];
        }

        // Buscar por categoria e tags similares
        const tags = article.tags ? article.tags.split(',').map(tag => tag.trim()) : [];
        
        let query = `
            SELECT kb.*, u.name as author_name 
            FROM knowledge_base kb 
            LEFT JOIN users u ON kb.author_id = u.id 
            WHERE kb.id != ? AND kb.status = 'published'
            AND (kb.category = ?
        `;
        let params = [articleId, article.category];

        if (tags.length > 0) {
            const tagConditions = tags.map(() => 'kb.tags LIKE ?').join(' OR ');
            query += ` OR (${tagConditions})`;
            tags.forEach(tag => params.push(`%${tag}%`));
        }

        query += `) ORDER BY kb.views DESC LIMIT ${limit}`;

        const relatedArticles = await executeQuery(query, params);
        return relatedArticles.map(article => this.formatArticle(article));
    }

    // Obter categorias disponíveis
    static async getCategories() {
        const categories = await executeQuery(`
            SELECT category, COUNT(*) as count 
            FROM knowledge_base 
            WHERE status = 'published' 
            GROUP BY category 
            ORDER BY count DESC
        `);

        return categories.map(cat => ({
            name: cat.category,
            display_name: this.getCategoryDisplay(cat.category),
            count: cat.count
        }));
    }

    // Obter tags populares
    static async getPopularTags(limit = 20) {
        const articles = await executeQuery(`
            SELECT tags FROM knowledge_base 
            WHERE status = 'published' AND tags IS NOT NULL AND tags != ''
        `);

        const tagCounts = {};
        articles.forEach(article => {
            if (article.tags) {
                const tags = article.tags.split(',').map(tag => tag.trim());
                tags.forEach(tag => {
                    if (tag) {
                        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                    }
                });
            }
        });

        return Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([tag, count]) => ({ tag, count }));
    }

    // Busca avançada
    static async advancedSearch(searchParams) {
        const {
            query: searchQuery,
            categories,
            tags,
            date_from,
            date_to,
            min_views,
            sort_by = 'relevance'
        } = searchParams;

        if (!searchQuery || searchQuery.trim() === '') {
            throw new Error('Termo de busca é obrigatório');
        }

        let query = `
            SELECT kb.*, u.name as author_name,
            (CASE 
                WHEN kb.title LIKE ? THEN 10
                WHEN kb.summary LIKE ? THEN 5
                WHEN kb.tags LIKE ? THEN 3
                ELSE 1
            END) as relevance_score
            FROM knowledge_base kb 
            LEFT JOIN users u ON kb.author_id = u.id 
            WHERE kb.status = 'published'
            AND (kb.title LIKE ? OR kb.summary LIKE ? OR kb.content LIKE ? OR kb.tags LIKE ?)
        `;

        const searchTerm = `%${searchQuery}%`;
        let params = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];

        // Filtros adicionais
        if (categories && categories.length > 0) {
            const categoryPlaceholders = categories.map(() => '?').join(',');
            query += ` AND kb.category IN (${categoryPlaceholders})`;
            params.push(...categories);
        }

        if (tags && tags.length > 0) {
            const tagConditions = tags.map(() => 'kb.tags LIKE ?').join(' OR ');
            query += ` AND (${tagConditions})`;
            tags.forEach(tag => params.push(`%${tag}%`));
        }

        if (date_from) {
            query += ' AND kb.created_at >= ?';
            params.push(date_from);
        }

        if (date_to) {
            query += ' AND kb.created_at <= ?';
            params.push(date_to);
        }

        if (min_views) {
            query += ' AND kb.views >= ?';
            params.push(min_views);
        }

        // Ordenação
        if (sort_by === 'relevance') {
            query += ' ORDER BY relevance_score DESC, kb.views DESC';
        } else if (sort_by === 'views') {
            query += ' ORDER BY kb.views DESC';
        } else if (sort_by === 'newest') {
            query += ' ORDER BY kb.created_at DESC';
        } else {
            query += ' ORDER BY kb.updated_at DESC';
        }

        const results = await executeQuery(query, params);
        return results.map(article => ({
            ...this.formatArticle(article),
            relevance_score: article.relevance_score
        }));
    }

    // Incrementar visualizações
    static async incrementViews(articleId) {
        await executeQuery(
            'UPDATE knowledge_base SET views = views + 1 WHERE id = ?',
            [articleId]
        );
    }

    // Métodos auxiliares
    static validateArticle(data) {
        const errors = [];

        if (!data.title || data.title.trim().length < 5) {
            errors.push('Título deve ter pelo menos 5 caracteres');
        }

        if (!data.summary || data.summary.trim().length < 10) {
            errors.push('Resumo deve ter pelo menos 10 caracteres');
        }

        if (!data.content || data.content.trim().length < 50) {
            errors.push('Conteúdo deve ter pelo menos 50 caracteres');
        }

        if (!data.category || !this.getValidCategories().includes(data.category.toLowerCase())) {
            errors.push('Categoria inválida');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    static validateArticleUpdate(data) {
        const errors = [];

        if (data.title && data.title.trim().length < 5) {
            errors.push('Título deve ter pelo menos 5 caracteres');
        }

        if (data.summary && data.summary.trim().length < 10) {
            errors.push('Resumo deve ter pelo menos 10 caracteres');
        }

        if (data.content && data.content.trim().length < 50) {
            errors.push('Conteúdo deve ter pelo menos 50 caracteres');
        }

        if (data.category && !this.getValidCategories().includes(data.category.toLowerCase())) {
            errors.push('Categoria inválida');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    static async generateUniqueSlug(title, excludeId = null) {
        let baseSlug = title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');

        let slug = baseSlug;
        let counter = 1;

        while (true) {
            let query = 'SELECT id FROM knowledge_base WHERE slug = ?';
            let params = [slug];

            if (excludeId) {
                query += ' AND id != ?';
                params.push(excludeId);
            }

            const existing = await executeQuery(query, params);
            if (existing.length === 0) break;

            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        return slug;
    }

    static processTags(tags) {
        if (!tags) return '';
        
        if (typeof tags === 'string') {
            return tags.split(',').map(tag => tag.trim()).filter(tag => tag).join(',');
        }
        
        if (Array.isArray(tags)) {
            return tags.map(tag => tag.trim()).filter(tag => tag).join(',');
        }
        
        return '';
    }

    static formatArticle(article) {
        return {
            ...article,
            category_display: this.getCategoryDisplay(article.category),
            tags_array: article.tags ? article.tags.split(',').map(tag => tag.trim()) : [],
            created_at_formatted: new Date(article.created_at).toLocaleString('pt-BR'),
            updated_at_formatted: new Date(article.updated_at).toLocaleString('pt-BR'),
            excerpt: article.content ? article.content.substring(0, 200) + '...' : '',
            reading_time: Math.ceil((article.content || '').split(' ').length / 200) // palavras por minuto
        };
    }

    static getCategoryDisplay(category) {
        const displays = {
            hardware: 'Hardware',
            software: 'Software',
            rede: 'Rede/Internet',
            sistema: 'Sistema',
            seguranca: 'Segurança',
            backup: 'Backup',
            email: 'Email',
            impressora: 'Impressora',
            mobile: 'Mobile',
            cloud: 'Cloud'
        };
        return displays[category] || category;
    }

    static getValidCategories() {
        return ['hardware', 'software', 'rede', 'sistema', 'seguranca', 'backup', 'email', 'impressora', 'mobile', 'cloud'];
    }
}

module.exports = KnowledgeBaseService;