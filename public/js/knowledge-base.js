// public/js/knowledge-base.js - Frontend Corrigido da Base de Conhecimento
class KnowledgeBase {
    constructor() {
        this.articles = [];
        this.categories = [];
        this.currentCategory = 'all';
        this.currentSearch = '';
        this.currentPage = 1;
        this.articlesPerPage = 10;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadCategories();
        this.loadArticles();
    }

    bindEvents() {
        // Busca
        const searchInput = document.getElementById('kb-search');
        const searchBtn = document.querySelector('.btn-search');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentSearch = e.target.value;
                this.loadArticles();
            });
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.loadArticles();
            });
        }

        // Filtros de categoria
        document.querySelectorAll('.kb-category').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active de todos
                document.querySelectorAll('.kb-category').forEach(b => b.classList.remove('active'));
                // Adiciona active no clicado
                e.target.classList.add('active');
                
                this.currentCategory = e.target.dataset.category;
                this.currentPage = 1;
                this.loadArticles();
            });
        });
    }

    // Função de loading simples (substitui showLoading/hideLoading)
    showLoadingState(element, show = true) {
        if (!element) return;
        
        if (show) {
            element.style.opacity = '0.5';
            element.style.pointerEvents = 'none';
        } else {
            element.style.opacity = '1';
            element.style.pointerEvents = 'auto';
        }
    }

    async loadCategories() {
        try {
            console.log('🏷️ Carregando categorias...');
            
            const response = await fetch('/api/knowledge-base/categories');
            const data = await response.json();

            if (data.success && data.data) {
                this.categories = data.data;
                this.renderCategories();
                console.log('✅ Categorias carregadas:', this.categories.length);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar categorias:', error);
            this.showNotification('Erro ao carregar categorias', 'error');
        }
    }

    async loadArticles() {
    try {
        console.log('📚 Carregando artigos...');
        const articlesContainer = document.getElementById('kb-articles');
        
        // Mostrar estado de loading
        this.showLoadingState(articlesContainer, true);

        // Construir URL com parâmetros
        const params = new URLSearchParams();
        if (this.currentSearch) params.set('search', this.currentSearch);
        if (this.currentCategory !== 'all') params.set('category', this.currentCategory);
        params.set('limit', this.articlesPerPage);
        params.set('offset', (this.currentPage - 1) * this.articlesPerPage);

        const response = await fetch(`/api/knowledge-base?${params}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();

        if (data && data.success && data.data) {
            this.articles = Array.isArray(data.data) ? data.data : [];
            this.renderArticles();
            
            // Verificar se pagination existe antes de usar
            if (data.pagination && typeof data.pagination === 'object') {
                this.renderPagination(data.pagination);
            } else {
                // Criar paginação mock se não existir
                const mockPagination = {
                    total: this.articles.length,
                    pages: 1,
                    offset: 0,
                    limit: this.articlesPerPage
                };
                this.renderPagination(mockPagination);
            }
            
            console.log('✅ Artigos carregados:', this.articles.length);
        } else {
            throw new Error(data?.message || 'Erro ao carregar artigos');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar artigos:', error);
        this.showError('Erro ao carregar artigos: ' + error.message);
    } finally {
        // Remover estado de loading
        const articlesContainer = document.getElementById('kb-articles');
        this.showLoadingState(articlesContainer, false);
    }
}

    renderCategories() {
        // As categorias já estão no HTML, mas podemos atualizar os badges
        this.categories.forEach(category => {
            const categoryBtn = document.querySelector(`[data-category="${category.name}"]`);
            if (categoryBtn) {
                const badge = categoryBtn.querySelector('.category-count');
                if (badge) {
                    badge.textContent = category.count;
                }
            }
        });
    }

    renderArticles() {
        const container = document.getElementById('kb-articles');
        if (!container) return;

        if (this.articles.length === 0) {
            container.innerHTML = `
                <div class="no-articles">
                    <i class="fas fa-search"></i>
                    <h3>Nenhum artigo encontrado</h3>
                    <p>Tente ajustar sua pesquisa ou filtros.</p>
                </div>
            `;
            return;
        }

        const articlesHTML = this.articles.map(article => `
            <div class="kb-article-card" data-id="${article.id}">
                <div class="article-header">
                    <div class="article-category">
                        <i class="${this.getCategoryIcon(article.category)}"></i>
                        <span class="category-name">${this.formatCategory(article.category)}</span>
                        ${article.priority === 'high' ? '<span class="priority-badge high">Alta Prioridade</span>' : ''}
                    </div>
                    <div class="article-meta">
                        <span class="views"><i class="fas fa-eye"></i> ${article.views || 0}</span>
                        <span class="rating"><i class="fas fa-star"></i> ${this.formatRating(article.rating)}</span>
                    </div>
                </div>
                
                <h3 class="article-title">
                    <a href="#" onclick="knowledgeBase.viewArticle('${article.id}'); return false;">
                        ${article.title}
                    </a>
                </h3>
                
                <p class="article-summary">${article.summary || 'Sem resumo disponível.'}</p>
                
                <div class="article-footer">
                    <div class="article-author">
                        <i class="fas fa-user"></i>
                        <span>Por: ${article.author_name || 'Sistema'}</span>
                    </div>
                    <div class="article-date">
                        <i class="fas fa-calendar"></i>
                        <span>${this.formatDate(article.updated_at)}</span>
                    </div>
                </div>
                
                <div class="article-actions">
                    <button class="btn btn-primary" onclick="knowledgeBase.viewArticle('${article.id}')">
                        <i class="fas fa-eye"></i> Visualizar
                    </button>
                    ${article.tags ? `<div class="article-tags">${this.renderTags(article.tags)}</div>` : ''}
                </div>
            </div>
        `).join('');

        container.innerHTML = articlesHTML;
    }

    renderPagination(pagination) {
        const container = document.querySelector('.kb-pagination');
        if (!container || !pagination) return;

        const { total, pages, offset, limit } = pagination;
        const currentPage = Math.floor(offset / limit) + 1;

        if (pages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '<div class="pagination-info">';
        paginationHTML += `<span>Mostrando ${offset + 1}-${Math.min(offset + limit, total)} de ${total} artigos</span>`;
        paginationHTML += '</div><div class="pagination-controls">';

        // Botão anterior
        if (currentPage > 1) {
            paginationHTML += `<button class="btn-page" onclick="knowledgeBase.goToPage(${currentPage - 1})">
                <i class="fas fa-chevron-left"></i> Anterior
            </button>`;
        }

        // Números das páginas
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(pages, currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            paginationHTML += `<button class="btn-page ${activeClass}" onclick="knowledgeBase.goToPage(${i})">${i}</button>`;
        }

        // Botão próximo
        if (currentPage < pages) {
            paginationHTML += `<button class="btn-page" onclick="knowledgeBase.goToPage(${currentPage + 1})">
                Próximo <i class="fas fa-chevron-right"></i>
            </button>`;
        }

        paginationHTML += '</div>';
        container.innerHTML = paginationHTML;
    }

    goToPage(page) {
        this.currentPage = page;
        this.loadArticles();
        
        // Scroll to top
        document.getElementById('kb-articles').scrollIntoView({ behavior: 'smooth' });
    }

    async viewArticle(articleId) {
        try {
            console.log('👁️ Visualizando artigo:', articleId);
            
            const response = await fetch(`/api/knowledge-base/${articleId}`);
            const data = await response.json();

            if (data.success && data.data) {
                this.showArticleModal(data.data);
            } else {
                throw new Error(data.message || 'Artigo não encontrado');
            }
        } catch (error) {
            console.error('❌ Erro ao carregar artigo:', error);
            this.showNotification('Erro ao carregar artigo: ' + error.message, 'error');
        }
    }

    showArticleModal(article) {
        const modal = document.getElementById('ticket-modal'); // Reutilizar modal existente
        if (!modal) return;

        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');

        if (modalTitle) {
            modalTitle.innerHTML = `
                <i class="${this.getCategoryIcon(article.category)}"></i>
                ${article.title}
            `;
        }

        if (modalBody) {
            modalBody.innerHTML = `
                <div class="article-modal-content">
                    <div class="article-meta-bar">
                        <div class="meta-item">
                            <i class="fas fa-folder"></i>
                            <span>${this.formatCategory(article.category)}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-user"></i>
                            <span>${article.author_name || 'Sistema'}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-calendar"></i>
                            <span>${this.formatDate(article.updated_at)}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-eye"></i>
                            <span>${article.views || 0} visualizações</span>
                        </div>
                        ${article.rating ? `
                        <div class="meta-item">
                            <i class="fas fa-star"></i>
                            <span>${this.formatRating(article.rating)}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    ${article.summary ? `
                    <div class="article-summary-box">
                        <h4><i class="fas fa-info-circle"></i> Resumo</h4>
                        <p>${article.summary}</p>
                    </div>
                    ` : ''}
                    
                    <div class="article-content">
                        ${this.formatArticleContent(article.content)}
                    </div>
                    
                    ${article.tags ? `
                    <div class="article-tags-section">
                        <h4><i class="fas fa-tags"></i> Tags</h4>
                        <div class="tags-list">${this.renderTags(article.tags)}</div>
                    </div>
                    ` : ''}
                    
                    ${article.related_articles && article.related_articles.length > 0 ? `
                    <div class="related-articles">
                        <h4><i class="fas fa-link"></i> Artigos Relacionados</h4>
                        <ul>
                            ${article.related_articles.map(related => `
                                <li><a href="#" onclick="knowledgeBase.viewArticle('${related.id}'); return false;">${related.title}</a></li>
                            `).join('')}
                        </ul>
                    </div>
                    ` : ''}
                    
                    <div class="article-rating">
                        <h4><i class="fas fa-thumbs-up"></i> Este artigo foi útil?</h4>
                        <div class="rating-buttons">
                            <button class="btn btn-success" onclick="knowledgeBase.rateArticle('${article.id}', 5)">
                                <i class="fas fa-thumbs-up"></i> Sim
                            </button>
                            <button class="btn btn-secondary" onclick="knowledgeBase.rateArticle('${article.id}', 3)">
                                <i class="fas fa-meh"></i> Mais ou menos
                            </button>
                            <button class="btn btn-warning" onclick="knowledgeBase.rateArticle('${article.id}', 1)">
                                <i class="fas fa-thumbs-down"></i> Não
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        modal.style.display = 'block';
    }

    async rateArticle(articleId, rating) {
        try {
            const response = await fetch(`/api/knowledge-base/${articleId}/rate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ rating })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Obrigado pelo seu feedback!', 'success');
                // Recarregar artigo para mostrar nova avaliação
                setTimeout(() => this.viewArticle(articleId), 1000);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('❌ Erro ao avaliar artigo:', error);
            this.showNotification('Erro ao enviar avaliação', 'error');
        }
    }

    // Funções auxiliares
    getCategoryIcon(category) {
        const icons = {
            'hardware': 'fas fa-microchip',
            'software': 'fas fa-code',
            'rede': 'fas fa-network-wired',
            'sistema': 'fas fa-server',
            'seguranca': 'fas fa-shield-alt',
            'backup': 'fas fa-database'
        };
        return icons[category] || 'fas fa-file-alt';
    }

    formatCategory(category) {
        const categories = {
            'hardware': 'Hardware',
            'software': 'Software',
            'rede': 'Rede',
            'sistema': 'Sistema',
            'seguranca': 'Segurança',
            'backup': 'Backup'
        };
        return categories[category] || category;
    }

    formatRating(rating) {
        if (!rating) return '0.0';
        return parseFloat(rating).toFixed(1);
    }

    formatDate(dateString) {
        if (!dateString) return 'Data não disponível';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    renderTags(tagsString) {
        if (!tagsString) return '';
        
        const tags = tagsString.split(',').map(tag => tag.trim());
        return tags.map(tag => `<span class="tag">${tag}</span>`).join('');
    }

    // Substitua a função formatArticleContent() no seu knowledge-base.js atual

formatArticleContent(content) {
    if (!content) return '<p>Conteúdo não disponível.</p>';
    
    // Escape HTML perigoso
    let formattedContent = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Processar blocos de código primeiro (para não interferir com outros formatadores)
    formattedContent = formattedContent.replace(/```([\s\S]*?)```/g, (match, code) => {
        return `<pre style="background: #2d3748; color: #e2e8f0; padding: 1rem; border-radius: 6px; overflow-x: auto; margin: 1rem 0;"><code>${code.trim()}</code></pre>`;
    });

    // Código inline
    formattedContent = formattedContent.replace(/`([^`]+)`/g, '<code style="background: #f1f5f9; color: #e11d48; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>');

    // Headers (do maior para menor)
    formattedContent = formattedContent
        .replace(/^#### (.*$)/gim, '<h4 style="color: #1e293b; margin: 1.5rem 0 0.5rem 0; font-size: 1.1rem; font-weight: 600;">$1</h4>')
        .replace(/^### (.*$)/gim, '<h3 style="color: #334155; margin: 1.5rem 0 0.75rem 0; font-size: 1.2rem; font-weight: 600;">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 style="color: #475569; margin: 2rem 0 1rem 0; font-size: 1.4rem; font-weight: 700; border-left: 4px solid #3b82f6; padding-left: 1rem;">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 style="color: #1e293b; margin: 2rem 0 1rem 0; font-size: 1.8rem; font-weight: 700; border-bottom: 2px solid #3b82f6; padding-bottom: 0.5rem;">$1</h1>');

    // Bold e italic
    formattedContent = formattedContent
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #1e293b; font-weight: 600;">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em style="color: #475569;">$1</em>');

    // Links
    formattedContent = formattedContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color: #3b82f6; text-decoration: underline;">$1</a>');

    // Processar listas
    formattedContent = formattedContent.replace(/^- (.+)$/gm, '<li style="margin: 0.25rem 0; line-height: 1.6;">$1</li>');
    
    // Agrupar li's consecutivos em ul
    formattedContent = formattedContent.replace(/(<li[^>]*>.*?<\/li>\s*)+/gs, (match) => {
        return `<ul style="margin: 1rem 0; padding-left: 1.5rem; list-style-type: disc;">${match}</ul>`;
    });

    // Converter parágrafos (quebras duplas)
    const paragraphs = formattedContent.split('\n\n');
    formattedContent = paragraphs.map(paragraph => {
        paragraph = paragraph.trim().replace(/\n/g, '<br>');
        
        // Se já é um elemento HTML, não envolver em <p>
        if (paragraph.match(/^<(h[1-6]|ul|ol|pre|div|blockquote)/)) {
            return paragraph;
        }
        
        // Se tem conteúdo, envolver em <p>
        if (paragraph.length > 0) {
            return `<p style="margin-bottom: 1rem; line-height: 1.7; text-align: justify;">${paragraph}</p>`;
        }
        
        return '';
    }).filter(p => p.length > 0).join('');

    return formattedContent || '<p>Conteúdo não disponível.</p>';
}

    showError(message) {
        const container = document.getElementById('kb-articles');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erro</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="knowledgeBase.loadArticles()">
                        <i class="fas fa-retry"></i> Tentar novamente
                    </button>
                </div>
            `;
        }
    }

    showNotification(message, type = 'info') {
        // Usar sistema de toast existente ou criar simples
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // Se existir função de toast global, usar
        if (typeof showToast !== 'undefined') {
            showToast(message, type);
        } else {
            // Notificação simples
            alert(message);
        }
    }
}

// Inicializar quando a seção de knowledge base for carregada
let knowledgeBase = null;

// Observer para inicializar quando a seção aparecer
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const kbSection = document.getElementById('knowledge-base-section');
            if (kbSection && kbSection.classList.contains('active') && !knowledgeBase) {
                console.log('🚀 Inicializando Knowledge Base...');
                knowledgeBase = new KnowledgeBase();
            }
        }
    });
});

// Inicializar observer
if (document.getElementById('knowledge-base-section')) {
    observer.observe(document.getElementById('knowledge-base-section'), {
        attributes: true,
        attributeFilter: ['class']
    });
    
    // Se já estiver ativo, inicializar imediatamente
    if (document.getElementById('knowledge-base-section').classList.contains('active')) {
        knowledgeBase = new KnowledgeBase();
    }
}