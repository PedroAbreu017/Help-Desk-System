// src/routes/knowledge-base.js - Rotas da Base de Conhecimento Refatoradas MVC
const express = require('express');
const router = express.Router();
const KnowledgeBaseController = require('../controllers/KnowledgeBaseController');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');

// Rotas públicas (sem autenticação)
router.get('/', asyncHandler(KnowledgeBaseController.listArticles));
router.get('/search', asyncHandler(KnowledgeBaseController.search));
router.get('/categories', asyncHandler(KnowledgeBaseController.getCategories));
router.get('/tags', asyncHandler(KnowledgeBaseController.getPopularTags));
router.get('/popular', asyncHandler(KnowledgeBaseController.getPopularArticles));
router.get('/recent', asyncHandler(KnowledgeBaseController.getRecentArticles));
router.get('/stats', asyncHandler(KnowledgeBaseController.getStats));
router.get('/category/:category', asyncHandler(KnowledgeBaseController.getArticlesByCategory));
router.get('/:id', asyncHandler(KnowledgeBaseController.getArticle));
router.get('/:id/related', asyncHandler(KnowledgeBaseController.getRelatedArticles));

// Rotas protegidas (com autenticação)
router.use(authenticateToken);

router.post('/', asyncHandler(KnowledgeBaseController.createArticle));
router.put('/:id', asyncHandler(KnowledgeBaseController.updateArticle));
router.delete('/:id', asyncHandler(KnowledgeBaseController.deleteArticle));
router.post('/:id/rate', asyncHandler(KnowledgeBaseController.rateArticle));
router.post('/search/advanced', asyncHandler(KnowledgeBaseController.advancedSearch));
router.post('/bulk', asyncHandler(KnowledgeBaseController.bulkOperations));
router.get('/export', asyncHandler(KnowledgeBaseController.exportArticles));

module.exports = router;