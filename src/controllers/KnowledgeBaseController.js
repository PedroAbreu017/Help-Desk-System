// src/controllers/KnowledgeBaseController.js - Controller MVC para Base de Conhecimento
const KnowledgeBaseService = require('../services/KnowledgeBaseService');
const { createError } = require('../middleware/errorHandler');

class KnowledgeBaseController {
    // GET /api/knowledge-base - Listar artigos
    static async listArticles(req, res, next) {
        try {
            const result = await KnowledgeBaseService.listArticles(req.query);

            res.json({
                success: true,
                data: result
            });

            console.log(`📚 Base de conhecimento consultada - ${result.articles.length}/${result.total_count} artigos`);
        } catch (error) {
            console.error('❌ Erro ao listar artigos:', error.message);
            next(createError(error.message, 400, 'ARTICLES_LIST_ERROR'));
        }
    }

    // GET /api/knowledge-base/:id - Buscar artigo específico
    static async getArticle(req, res, next) {
        try {
            const article = await KnowledgeBaseService.findArticle(req.params.id, true);
            
            if (!article) {
                return next(createError('Artigo não encontrado', 404, 'ARTICLE_NOT_FOUND'));
            }

            // Buscar artigos relacionados
            const relatedArticles = await KnowledgeBaseService.getRelatedArticles(article.id);

            res.json({
                success: true,
                data: {
                    article,
                    related_articles: relatedArticles
                }
            });

            console.log(`📖 Artigo consultado: ${article.title} (views: ${article.views})`);
        } catch (error) {
            console.error('❌ Erro ao buscar artigo:', error.message);
            next(createError(error.message, 400, 'ARTICLE_GET_ERROR'));
        }
    }

    // POST /api/knowledge-base - Criar novo artigo
    static async createArticle(req, res, next) {
        try {
            const authorId = req.user?.id;
            if (!authorId) {
                return next(createError('Usuário autenticado é obrigatório', 401, 'USER_REQUIRED'));
            }

            const article = await KnowledgeBaseService.createArticle(req.body, authorId);

            res.status(201).json({
                success: true,
                message: 'Artigo criado com sucesso',
                data: article
            });

            console.log(`📝 Artigo criado: ${article.title} por ${req.user.name}`);
        } catch (error) {
            console.error('❌ Erro ao criar artigo:', error.message);
            next(createError(error.message, 400, 'ARTICLE_CREATE_ERROR'));
        }
    }

    // PUT /api/knowledge-base/:id - Atualizar artigo
    static async updateArticle(req, res, next) {
        try {
            const updatedBy = req.user?.name || 'Sistema';
            const article = await KnowledgeBaseService.updateArticle(req.params.id, req.body, updatedBy);

            res.json({
                success: true,
                message: 'Artigo atualizado com sucesso',
                data: article
            });

            console.log(`✏️ Artigo atualizado: ${article.title} por ${updatedBy}`);
        } catch (error) {
            console.error('❌ Erro ao atualizar artigo:', error.message);
            
            if (error.message === 'Artigo não encontrado') {
                return next(createError(error.message, 404, 'ARTICLE_NOT_FOUND'));
            }
            
            next(createError(error.message, 400, 'ARTICLE_UPDATE_ERROR'));
        }
    }

    // DELETE /api/knowledge-base/:id - Deletar artigo
    static async deleteArticle(req, res, next) {
        try {
            const article = await KnowledgeBaseService.deleteArticle(req.params.id);

            res.json({
                success: true,
                message: 'Artigo deletado com sucesso',
                data: article
            });

            console.log(`🗑️ Artigo deletado: ${article.title}`);
        } catch (error) {
            console.error('❌ Erro ao deletar artigo:', error.message);
            
            if (error.message === 'Artigo não encontrado') {
                return next(createError(error.message, 404, 'ARTICLE_NOT_FOUND'));
            }
            
            next(createError(error.message, 400, 'ARTICLE_DELETE_ERROR'));
        }
    }

    // POST /api/knowledge-base/:id/rate - Avaliar artigo
    static async rateArticle(req, res, next) {
        try {
            const { is_helpful } = req.body;
            const userId = req.user?.id;

            if (typeof is_helpful !== 'boolean') {
                return next(createError('Campo is_helpful é obrigatório e deve ser booleano', 400, 'MISSING_RATING'));
            }

            const article = await KnowledgeBaseService.rateArticle(req.params.id, is_helpful, userId);

            res.json({
                success: true,
                message: 'Avaliação registrada com sucesso',
                data: {
                    article_id: article.id,
                    is_helpful,
                    helpful_count: article.helpful_count,
                    not_helpful_count: article.not_helpful_count
                }
            });

            console.log(`👍 Artigo ${article.title} avaliado como ${is_helpful ? 'útil' : 'não útil'}`);
        } catch (error) {
            console.error('❌ Erro ao avaliar artigo:', error.message);
            
            if (error.message === 'Artigo não encontrado') {
                return next(createError(error.message, 404, 'ARTICLE_NOT_FOUND'));
            }
            
            if (error.message.includes('já avaliou')) {
                return next(createError(error.message, 409, 'ALREADY_RATED'));
            }
            
            next(createError(error.message, 400, 'RATING_ERROR'));
        }
    }

    // GET /api/knowledge-base/categories - Listar categorias
    static async getCategories(req, res, next) {
        try {
            const categories = await KnowledgeBaseService.getCategories();

            res.json({
                success: true,
                data: categories
            });
        } catch (error) {
            console.error('❌ Erro ao buscar categorias:', error.message);
            next(createError(error.message, 500, 'CATEGORIES_ERROR'));
        }
    }

    // GET /api/knowledge-base/tags - Listar tags populares
    static async getPopularTags(req, res, next) {
        try {
            const limit = Math.min(parseInt(req.query.limit) || 20, 50);
            const tags = await KnowledgeBaseService.getPopularTags(limit);

            res.json({
                success: true,
                data: tags
            });
        } catch (error) {
            console.error('❌ Erro ao buscar tags:', error.message);
            next(createError(error.message, 500, 'TAGS_ERROR'));
        }
    }

    // GET /api/knowledge-base/search - Busca básica
    static async search(req, res, next) {
        try {
            const { q } = req.query;
            
            if (!q || q.trim() === '') {
                return next(createError('Termo de busca é obrigatório', 400, 'MISSING_SEARCH_TERM'));
            }

            const result = await KnowledgeBaseService.listArticles({
                search: q,
                ...req.query
            });

            res.json({
                success: true,
                data: {
                    ...result,
                    search_term: q
                }
            });

            console.log(`🔍 Busca na base de conhecimento: "${q}" - ${result.articles.length} resultados`);
        } catch (error) {
            console.error('❌ Erro na busca:', error.message);
            next(createError(error.message, 400, 'SEARCH_ERROR'));
        }
    }

    // POST /api/knowledge-base/search/advanced - Busca avançada
    static async advancedSearch(req, res, next) {
        try {
            const results = await KnowledgeBaseService.advancedSearch(req.body);

            res.json({
                success: true,
                data: {
                    results,
                    count: results.length,
                    search_params: req.body
                }
            });

            console.log(`🔍 Busca avançada realizada - ${results.length} resultados`);
        } catch (error) {
            console.error('❌ Erro na busca avançada:', error.message);
            next(createError(error.message, 400, 'ADVANCED_SEARCH_ERROR'));
        }
    }

    // GET /api/knowledge-base/:id/related - Artigos relacionados
    static async getRelatedArticles(req, res, next) {
        try {
            const limit = Math.min(parseInt(req.query.limit) || 5, 20);
            const relatedArticles = await KnowledgeBaseService.getRelatedArticles(req.params.id, limit);

            res.json({
                success: true,
                data: relatedArticles
            });
        } catch (error) {
            console.error('❌ Erro ao buscar artigos relacionados:', error.message);
            next(createError(error.message, 400, 'RELATED_ARTICLES_ERROR'));
        }
    }

    // GET /api/knowledge-base/category/:category - Artigos por categoria
    static async getArticlesByCategory(req, res, next) {
        try {
            const result = await KnowledgeBaseService.listArticles({
                category: req.params.category,
                ...req.query
            });

            res.json({
                success: true,
                data: {
                    ...result,
                    category: req.params.category
                }
            });

            console.log(`📂 Artigos da categoria ${req.params.category}: ${result.articles.length}`);
        } catch (error) {
            console.error('❌ Erro ao buscar por categoria:', error.message);
            next(createError(error.message, 400, 'CATEGORY_ARTICLES_ERROR'));
        }
    }

    // GET /api/knowledge-base/popular - Artigos mais visualizados
    static async getPopularArticles(req, res, next) {
        try {
            const limit = Math.min(parseInt(req.query.limit) || 10, 50);
            const result = await KnowledgeBaseService.listArticles({
                sort_by: 'views',
                sort_order: 'desc',
                limit
            });

            res.json({
                success: true,
                data: result.articles
            });

            console.log(`🔥 Artigos populares consultados: ${result.articles.length}`);
        } catch (error) {
            console.error('❌ Erro ao buscar artigos populares:', error.message);
            next(createError(error.message, 500, 'POPULAR_ARTICLES_ERROR'));
        }
    }

    // GET /api/knowledge-base/recent - Artigos recentes
    static async getRecentArticles(req, res, next) {
        try {
            const limit = Math.min(parseInt(req.query.limit) || 10, 50);
            const result = await KnowledgeBaseService.listArticles({
                sort_by: 'created_at',
                sort_order: 'desc',
                limit
            });

            res.json({
                success: true,
                data: result.articles
            });

            console.log(`🆕 Artigos recentes consultados: ${result.articles.length}`);
        } catch (error) {
            console.error('❌ Erro ao buscar artigos recentes:', error.message);
            next(createError(error.message, 500, 'RECENT_ARTICLES_ERROR'));
        }
    }

    // GET /api/knowledge-base/stats - Estatísticas da base de conhecimento
    static async getStats(req, res, next) {
        try {
            const [categories, tags, articles] = await Promise.all([
                KnowledgeBaseService.getCategories(),
                KnowledgeBaseService.getPopularTags(10),
                KnowledgeBaseService.listArticles({ limit: 1 }) // Apenas para contar total
            ]);

            const stats = {
                total_articles: articles.total_count,
                total_categories: categories.length,
                total_tags: tags.length,
                categories_breakdown: categories,
                popular_tags: tags,
                most_viewed_threshold: 100 // Poderia vir de uma query específica
            };

            res.json({
                success: true,
                data: stats
            });

            console.log(`📊 Estatísticas da base de conhecimento: ${stats.total_articles} artigos`);
        } catch (error) {
            console.error('❌ Erro ao gerar estatísticas:', error.message);
            next(createError(error.message, 500, 'STATS_ERROR'));
        }
    }

    // POST /api/knowledge-base/bulk - Operações em lote
    static async bulkOperations(req, res, next) {
        try {
            const { action, article_ids, data } = req.body;

            if (!action || !article_ids || !Array.isArray(article_ids)) {
                return next(createError('Ação e IDs dos artigos são obrigatórios', 400, 'MISSING_BULK_DATA'));
            }

            if (article_ids.length > 20) {
                return next(createError('Máximo 20 artigos por operação', 400, 'TOO_MANY_ARTICLES'));
            }

            const validActions = ['delete', 'update_category', 'update_status'];
            if (!validActions.includes(action)) {
                return next(createError(`Ação inválida. Use: ${validActions.join(', ')}`, 400, 'INVALID_BULK_ACTION'));
            }

            const updatedBy = req.user?.name || 'Sistema';
            const results = [];
            const errors = [];

            for (const articleId of article_ids) {
                try {
                    let result;
                    switch (action) {
                        case 'delete':
                            result = await KnowledgeBaseService.deleteArticle(articleId);
                            break;
                        case 'update_category':
                            result = await KnowledgeBaseService.updateArticle(articleId, { category: data.category }, updatedBy);
                            break;
                        case 'update_status':
                            result = await KnowledgeBaseService.updateArticle(articleId, { status: data.status }, updatedBy);
                            break;
                    }
                    results.push({ article_id: articleId, success: true, data: result });
                } catch (error) {
                    errors.push({ article_id: articleId, success: false, error: error.message });
                }
            }

            res.json({
                success: true,
                message: `Ação ${action} executada em lote`,
                data: {
                    action,
                    total_processed: article_ids.length,
                    successful: results.length,
                    failed: errors.length,
                    results,
                    errors
                }
            });

            console.log(`📦 Ação em lote ${action} executada em ${article_ids.length} artigos por ${updatedBy}`);
        } catch (error) {
            console.error('❌ Erro na operação em lote:', error.message);
            next(createError(error.message, 400, 'BULK_OPERATION_ERROR'));
        }
    }

    // GET /api/knowledge-base/export - Exportar artigos
    static async exportArticles(req, res, next) {
        try {
            const format = req.query.format || 'json';
            const filters = req.query;

            if (!['json', 'csv'].includes(format)) {
                return next(createError('Formato deve ser json ou csv', 400, 'INVALID_FORMAT'));
            }

            const result = await KnowledgeBaseService.listArticles(filters);

            const exportData = {
                exported_at: new Date().toISOString(),
                filters_applied: filters,
                total_articles: result.total_count,
                articles: result.articles
            };

            if (format === 'csv') {
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename=knowledge_base.csv');
                res.send('CSV export não implementado ainda');
            } else {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', 'attachment; filename=knowledge_base.json');
                res.json({
                    success: true,
                    data: exportData
                });
            }

            console.log(`📁 ${result.articles.length} artigos exportados em formato ${format}`);
        } catch (error) {
            console.error('❌ Erro ao exportar artigos:', error.message);
            next(createError(error.message, 500, 'EXPORT_ERROR'));
        }
    }
}

module.exports = KnowledgeBaseController;