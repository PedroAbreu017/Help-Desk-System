// src/routes/knowledge-base.js - Rotas da Base de Conhecimento (CORRIGIDO)
const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/database');

// GET /api/knowledge-base - Listar artigos
router.get('/', async (req, res, next) => {
    try {
        console.log('🔍 Knowledge Base Query iniciada');
        
        const {
            search = '',
            category = '',
            tags = '',
            limit = 20,
            offset = 0,
            sort = 'updated_at',
            order = 'DESC'
        } = req.query;

        // Validar e sanitizar parâmetros
        const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
        const safeOffset = Math.max(parseInt(offset) || 0, 0);
        
        console.log('📊 Parâmetros:', { search, category, tags, safeLimit, safeOffset });

        // Query base para artigos
        let query = `
            SELECT 
                kb.id, 
                kb.title, 
                kb.slug, 
                kb.summary, 
                kb.category, 
                kb.subcategory,
                kb.tags, 
                kb.priority, 
                kb.status, 
                kb.views, 
                kb.rating,
                kb.created_at, 
                kb.updated_at,
                'Administrador' as author_name
            FROM knowledge_base kb 
            WHERE kb.status = 'published'
        `;

        // Query para contagem
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM knowledge_base kb 
            WHERE kb.status = 'published'
        `;

        let params = [];
        let countParams = [];

        // Aplicar filtros (mesma lógica para ambas as queries)
        if (search.trim()) {
            const searchCondition = ` AND (kb.title LIKE ? OR kb.summary LIKE ? OR kb.content LIKE ?)`;
            const searchTerm = `%${search.trim()}%`;
            
            query += searchCondition;
            countQuery += searchCondition;
            
            params.push(searchTerm, searchTerm, searchTerm);
            countParams.push(searchTerm, searchTerm, searchTerm);
        }

        if (category.trim()) {
            const categoryCondition = ` AND kb.category = ?`;
            
            query += categoryCondition;
            countQuery += categoryCondition;
            
            params.push(category.trim());
            countParams.push(category.trim());
        }

        if (tags.trim()) {
            const tagsCondition = ` AND kb.tags LIKE ?`;
            const tagsValue = `%${tags.trim()}%`;
            
            query += tagsCondition;
            countQuery += tagsCondition;
            
            params.push(tagsValue);
            countParams.push(tagsValue);
        }

        console.log('📊 Count Query:', countQuery);
        console.log('📊 Count Params:', countParams);

        // Executar query de contagem primeiro
        let total = 0;
        try {
            const countResult = await executeQuery(countQuery, countParams);
            console.log('📊 Count Result:', countResult);
            
            if (countResult && Array.isArray(countResult) && countResult.length > 0) {
                total = countResult[0].total || 0;
            }
            
            console.log('📊 Total calculado:', total);
        } catch (countError) {
            console.error('❌ Erro na query de contagem:', countError);
            total = 0; // Fallback para zero em caso de erro
        }

        // Adicionar ordenação e paginação à query principal
        query += ` ORDER BY kb.${sort} ${order.toUpperCase()} LIMIT ${safeLimit} OFFSET ${safeOffset}`;
        
        console.log('🔍 Main Query:', query);
        console.log('📊 Query Params:', params);

        // Executar query principal
        let articles = [];
        try {
            const queryResult = await executeQuery(query, params);
            articles = Array.isArray(queryResult) ? queryResult : [];
        } catch (queryError) {
            console.error('❌ Erro na query principal:', queryError);
            articles = []; // Array vazio em caso de erro
        }

        // Calcular informações de paginação
        const pages = Math.ceil(total / safeLimit);
        const currentPage = Math.floor(safeOffset / safeLimit) + 1;

        const result = {
            success: true,
            data: articles,
            pagination: {
                total,
                limit: safeLimit,
                offset: safeOffset,
                pages,
                currentPage
            }
        };

        console.log('✅ Knowledge Base Query concluída:', `${articles.length} artigos encontrados de ${total} total`);
        res.json(result);

    } catch (error) {
        console.error('❌ Erro em Knowledge Base Query:', error);
        
        // Retornar resposta de erro estruturada
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno',
            data: [],
            pagination: {
                total: 0,
                limit: 20,
                offset: 0,
                pages: 0,
                currentPage: 1
            }
        });
    }
});

// GET /api/knowledge-base/categories - Listar categorias
router.get('/categories', async (req, res, next) => {
    try {
        console.log('🏷️ Categories Query iniciada');

        const query = `
            SELECT 
                category,
                COUNT(*) as count
            FROM knowledge_base 
            WHERE status = 'published'
            GROUP BY category
            ORDER BY count DESC
        `;

        const categories = await executeQuery(query, []);

        // Mapear ícones para categorias
        const iconMap = {
            'hardware': 'fas fa-microchip',
            'software': 'fas fa-code',
            'rede': 'fas fa-network-wired',
            'sistema': 'fas fa-server',
            'seguranca': 'fas fa-shield-alt',
            'backup': 'fas fa-database',
            'email': 'fas fa-envelope',
            'impressora': 'fas fa-print'
        };

        const result = Array.isArray(categories) ? categories.map(cat => ({
            name: cat.category,
            count: cat.count || 0,
            icon: iconMap[cat.category] || 'fas fa-book'
        })) : [];

        console.log('✅ Categories Query concluída:', `${result.length} categorias encontradas`);
        res.json({ success: true, data: result });

    } catch (error) {
        console.error('❌ Erro em Categories Query:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar categorias',
            data: []
        });
    }
});

// GET /api/knowledge-base/popular - Artigos populares
router.get('/popular', async (req, res, next) => {
    try {
        console.log('📈 Popular Articles Query iniciada');

        const query = `
            SELECT 
                kb.id,
                kb.title,
                kb.slug,
                kb.summary,
                kb.category,
                kb.views,
                kb.rating
            FROM knowledge_base kb
            WHERE kb.status = 'published'
            ORDER BY (COALESCE(kb.views, 0) * 0.7 + COALESCE(kb.rating, 0) * 0.3) DESC
            LIMIT 10
        `;

        const articles = await executeQuery(query, []);
        const result = Array.isArray(articles) ? articles : [];

        console.log('✅ Popular Articles Query concluída:', `${result.length} artigos populares`);
        res.json({ success: true, data: result });

    } catch (error) {
        console.error('❌ Erro em Popular Articles Query:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar artigos populares',
            data: []
        });
    }
});

// GET /api/knowledge-base/:id - Obter artigo específico
router.get('/:id', async (req, res, next) => {
    try {
        const articleId = parseInt(req.params.id);
        
        if (!articleId || isNaN(articleId)) {
            return res.status(400).json({
                success: false,
                message: 'ID do artigo inválido'
            });
        }

        console.log('📖 Article Query iniciada para ID:', articleId);

        const query = `
            SELECT 
                kb.*,
                'Administrador' as author_name
            FROM knowledge_base kb
            WHERE kb.id = ? AND kb.status = 'published'
        `;

        const articles = await executeQuery(query, [articleId]);

        if (!articles || !Array.isArray(articles) || articles.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Artigo não encontrado'
            });
        }

        console.log('✅ Article Query concluída:', articles[0].title);
        res.json({ success: true, data: articles[0] });

    } catch (error) {
        console.error('❌ Erro em Article Query:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar artigo'
        });
    }
});

// POST /api/knowledge-base/:id/view - Incrementar visualizações
router.post('/:id/view', async (req, res, next) => {
    try {
        const articleId = parseInt(req.params.id);
        
        if (!articleId || isNaN(articleId)) {
            return res.status(400).json({
                success: false,
                message: 'ID do artigo inválido'
            });
        }

        console.log('👁️ Incrementando views para artigo:', articleId);

        const query = `UPDATE knowledge_base SET views = COALESCE(views, 0) + 1 WHERE id = ? AND status = 'published'`;
        const result = await executeQuery(query, [articleId]);

        // Verificar se o artigo existe e foi atualizado
        if (result && result.affectedRows && result.affectedRows > 0) {
            console.log('✅ Views incrementadas para artigo:', articleId);
            res.json({ success: true, message: 'Visualização registrada' });
        } else {
            res.status(404).json({
                success: false,
                message: 'Artigo não encontrado'
            });
        }

    } catch (error) {
        console.error('❌ Erro ao incrementar views:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao registrar visualização'
        });
    }
});

// POST /api/knowledge-base/:id/rate - Avaliar artigo
router.post('/:id/rate', async (req, res, next) => {
    try {
        const articleId = parseInt(req.params.id);
        const { rating } = req.body;
        
        if (!articleId || isNaN(articleId)) {
            return res.status(400).json({
                success: false,
                message: 'ID do artigo inválido'
            });
        }

        if (!rating || !['positive', 'neutral', 'negative'].includes(rating)) {
            return res.status(400).json({
                success: false,
                message: 'Rating inválido. Use: positive, neutral ou negative'
            });
        }

        console.log('⭐ Rating recebido para artigo:', articleId, 'Rating:', rating);

        // Converter rating para valor numérico
        const ratingValue = rating === 'positive' ? 5 : rating === 'neutral' ? 3 : 1;

        // Verificar se o artigo existe
        const checkQuery = `SELECT id FROM knowledge_base WHERE id = ? AND status = 'published'`;
        const existingArticle = await executeQuery(checkQuery, [articleId]);

        if (!existingArticle || !Array.isArray(existingArticle) || existingArticle.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Artigo não encontrado'
            });
        }

        try {
            // Tentar inserir rating (pode falhar se tabela não existir)
            const insertQuery = `
                INSERT INTO knowledge_base_ratings (article_id, user_id, rating, created_at) 
                VALUES (?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE rating = VALUES(rating), created_at = VALUES(created_at)
            `;
            
            await executeQuery(insertQuery, [articleId, 'anonymous', ratingValue]);

            // Recalcular rating médio do artigo
            const avgQuery = `
                UPDATE knowledge_base kb
                SET rating = (
                    SELECT AVG(rating) 
                    FROM knowledge_base_ratings kbr 
                    WHERE kbr.article_id = kb.id
                )
                WHERE kb.id = ?
            `;
            
            await executeQuery(avgQuery, [articleId]);

            console.log('✅ Rating salvo para artigo:', articleId);
            res.json({ success: true, message: 'Avaliação registrada com sucesso' });

        } catch (ratingError) {
            console.warn('⚠️ Tabela de ratings não existe, simulando rating:', ratingError.message);
            
            // Fallback: atualizar rating diretamente na tabela principal
            const directUpdateQuery = `
                UPDATE knowledge_base 
                SET rating = CASE 
                    WHEN rating IS NULL THEN ?
                    ELSE (rating + ?) / 2
                END
                WHERE id = ?
            `;
            
            await executeQuery(directUpdateQuery, [ratingValue, ratingValue, articleId]);
            
            console.log('✅ Rating simulado salvo para artigo:', articleId);
            res.json({ success: true, message: 'Avaliação registrada com sucesso' });
        }

    } catch (error) {
        console.error('❌ Erro ao salvar rating:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao salvar avaliação'
        });
    }
});

module.exports = router;