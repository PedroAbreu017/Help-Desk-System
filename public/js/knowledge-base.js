// public/js/knowledge-base.js - Versão Enterprise Limpa baseado em Red Hat/ServiceNow
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
            
            this.showLoadingState(articlesContainer, true);

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
                this.articles = data.data.articles || data.data || [];
                this.renderArticles();
                
                if (data.data.pagination && typeof data.data.pagination === 'object') {
                    this.renderPagination(data.data.pagination);
                } else {
                    const mockPagination = {
                        total: data.data.total_count || this.articles.length,
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
            const articlesContainer = document.getElementById('kb-articles');
            this.showLoadingState(articlesContainer, false);
        }
    }

    renderCategories() {
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
                        ${article.priority === 'alta' ? '<span class="priority-badge high">Alta Prioridade</span>' : ''}
                    </div>
                    <div class="article-meta">
                        <span class="views"><i class="fas fa-eye"></i> ${article.views || 0}</span>
                        <span class="rating"><i class="fas fa-star"></i> ${this.formatRating(article.rating)}</span>
                    </div>
                </div>
                
                <h3 class="article-title">
                    <a href="#" onclick="window.knowledgeBaseManager?.viewArticle('${article.id}'); return false;">
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
                    <button class="btn btn-primary" onclick="window.knowledgeBaseManager?.viewArticle('${article.id}')">
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
        if (!container) return;

        const total = pagination?.total || this.articles.length || 0;
        const limit = pagination?.limit || this.articlesPerPage || 10;
        const offset = pagination?.offset || ((this.currentPage - 1) * limit) || 0;
        const pages = Math.ceil(total / limit);
        const currentPage = Math.floor(offset / limit) + 1;

        if (pages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '<div class="pagination-info">';
        const startItem = offset + 1;
        const endItem = Math.min(offset + limit, total);
        paginationHTML += `<span>Mostrando ${startItem}-${endItem} de ${total} artigos</span>`;
        paginationHTML += '</div><div class="pagination-controls">';

        if (currentPage > 1) {
            paginationHTML += `<button class="btn-page" onclick="window.knowledgeBaseManager?.goToPage(${currentPage - 1})">
                <i class="fas fa-chevron-left"></i> Anterior
            </button>`;
        }

        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(pages, currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            paginationHTML += `<button class="btn-page ${activeClass}" onclick="window.knowledgeBaseManager?.goToPage(${i})">${i}</button>`;
        }

        if (currentPage < pages) {
            paginationHTML += `<button class="btn-page" onclick="window.knowledgeBaseManager?.goToPage(${currentPage + 1})">
                Próximo <i class="fas fa-chevron-right"></i>
            </button>`;
        }

        paginationHTML += '</div>';
        container.innerHTML = paginationHTML;
    }

    goToPage(page) {
        this.currentPage = page;
        this.loadArticles();
        
        const articlesContainer = document.getElementById('kb-articles');
        if (articlesContainer) {
            articlesContainer.scrollIntoView({ behavior: 'smooth' });
        }
    }

    async viewArticle(articleId) {
        try {
            console.log('👁️ Visualizando artigo:', articleId);
            
            const response = await fetch(`/api/knowledge-base/${articleId}`);
            const data = await response.json();

            if (data.success && data.data && data.data.article) {
                this.showArticleModal(data.data.article, data.data.related_articles);
            } else {
                throw new Error(data.message || 'Artigo não encontrado');
            }
        } catch (error) {
            console.error('❌ Erro ao carregar artigo:', error);
            this.showNotification('Erro ao carregar artigo: ' + error.message, 'error');
        }
    }

    showArticleModal(article, relatedArticles = []) {
        const modal = document.getElementById('ticket-modal');
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
                    
                    ${relatedArticles && relatedArticles.length > 0 ? `
                    <div class="related-articles">
                        <h4><i class="fas fa-link"></i> Artigos Relacionados</h4>
                        <ul>
                            ${relatedArticles.map(related => `
                                <li><a href="#" onclick="window.knowledgeBaseManager?.viewArticle('${related.id}'); return false;">${related.title}</a></li>
                            `).join('')}
                        </ul>
                    </div>
                    ` : ''}
                    
                    <div class="article-rating">
                        <h4><i class="fas fa-thumbs-up"></i> Este artigo foi útil?</h4>
                        <div class="rating-buttons">
                            <button class="btn btn-success" onclick="window.knowledgeBaseManager?.rateArticle('${article.id}', 5)">
                                <i class="fas fa-thumbs-up"></i> Sim
                            </button>
                            <button class="btn btn-secondary" onclick="window.knowledgeBaseManager?.rateArticle('${article.id}', 3)">
                                <i class="fas fa-meh"></i> Mais ou menos
                            </button>
                            <button class="btn btn-warning" onclick="window.knowledgeBaseManager?.rateArticle('${article.id}', 1)">
                                <i class="fas fa-thumbs-down"></i> Não
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Event delegation para botões de copiar código
            setTimeout(() => {
                document.querySelectorAll('.code-copy-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const code = btn.getAttribute('data-code')
                            .replace(/&amp;/g, '&')
                            .replace(/&quot;/g, '"')
                            .replace(/&#39;/g, "'")
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>');
                        this.copyCode(btn, code);
                    });
                });
            }, 100);
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
                setTimeout(() => this.viewArticle(articleId), 1000);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('❌ Erro ao avaliar artigo:', error);
            this.showNotification('Erro ao enviar avaliação', 'error');
        }
    }

   formatArticleContent(content) {
    if (!content) return '<p>Conteúdo não disponível.</p>';
    
    let formatted = content;
    let codeBlocks = [];
    
    // 1. Extrair blocos de código PRIMEIRO
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        const placeholder = `___CODEBLOCK_${codeBlocks.length}___`;
        codeBlocks.push({ lang: lang || 'code', code: code.trim() });
        return `\n${placeholder}\n`;
    });
    
    // 2. Processar código inline
    formatted = formatted.replace(/`([^`]+)`/g, '<code style="background:#e3f2fd;color:#1976d2;padding:0.2rem 0.4rem;border-radius:3px;font-family:monospace;font-size:0.9em;">$1</code>');
    
    // 3. Headers (ANTES de processar parágrafos)
    formatted = formatted.replace(/^### (.+)$/gm, '<h3 style="color:#333;margin:1rem 0 0.5rem;font-size:1.1rem;font-weight:600;border-left:3px solid #28a745;padding-left:0.75rem;">$1</h3>');
    formatted = formatted.replace(/^## (.+)$/gm, '<h2 style="color:#333;margin:1.5rem 0 0.75rem;font-size:1.3rem;font-weight:600;border-left:4px solid #007bff;padding-left:1rem;">$1</h2>');
    formatted = formatted.replace(/^# (.+)$/gm, '<h1 style="color:#333;margin:2rem 0 1rem;font-size:1.6rem;font-weight:700;border-bottom:2px solid #007bff;padding-bottom:0.5rem;">$1</h1>');
    
    // 4. Negrito e itálico
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // 5. Listas
    formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*?<\/li>\s*)+/gs, '<ul style="margin:1rem 0;padding-left:1.5rem;">$&</ul>');
    
    // 6. Processar linha por linha para parágrafos
    const lines = formatted.split('\n');
    const processed = [];
    let inParagraph = false;
    let paragraphText = '';
    
    for (let line of lines) {
        line = line.trim();
        
        // Linhas vazias ou placeholders
        if (!line || line.startsWith('___CODEBLOCK_')) {
            if (inParagraph && paragraphText) {
                processed.push(`<p style="margin-bottom:1rem;line-height:1.7;">${paragraphText}</p>`);
                paragraphText = '';
                inParagraph = false;
            }
            processed.push(line);
            continue;
        }
        
        // Já é HTML (header, lista, etc)
        if (line.startsWith('<')) {
            if (inParagraph && paragraphText) {
                processed.push(`<p style="margin-bottom:1rem;line-height:1.7;">${paragraphText}</p>`);
                paragraphText = '';
                inParagraph = false;
            }
            processed.push(line);
            continue;
        }
        
        // Texto normal - adicionar ao parágrafo
        if (paragraphText) paragraphText += ' ';
        paragraphText += line;
        inParagraph = true;
    }
    
    // Parágrafo final se houver
    if (paragraphText) {
        processed.push(`<p style="margin-bottom:1rem;line-height:1.7;">${paragraphText}</p>`);
    }
    
    formatted = processed.join('\n');
    
    // 7. Reinserir blocos de código
    codeBlocks.forEach((block, i) => {
        const langNames = {
            'bash': 'BASH', 'sh': 'SHELL', 'sql': 'SQL',
            'javascript': 'JAVASCRIPT', 'python': 'PYTHON',
            'java': 'JAVA', 'ini': 'CONFIG', 'yaml': 'YAML'
        };
        const displayLang = langNames[block.lang.toLowerCase()] || block.lang.toUpperCase();
        const escapedCode = block.code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const dataCode = escapedCode.replace(/"/g, '&quot;');
        
        const codeHtml = `
<div style="margin:1.5rem 0;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
    <div style="background:#f5f5f5;padding:0.6rem 1rem;display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #ddd;">
        <span style="font-weight:600;color:#495057;font-size:0.875rem;">${displayLang}</span>
        <button class="code-copy-btn" data-code="${dataCode}" style="background:#007bff;color:white;border:none;padding:0.4rem 0.8rem;border-radius:4px;cursor:pointer;font-size:0.75rem;"><i class="fas fa-copy"></i> Copiar</button>
    </div>
    <pre style="background:#2d3748;color:#e2e8f0;padding:1.2rem;margin:0;overflow:auto;max-height:450px;font-family:Consolas,monospace;font-size:0.875rem;line-height:1.6;"><code>${escapedCode}</code></pre>
</div>`;
        
        formatted = formatted.replace(`___CODEBLOCK_${i}___`, codeHtml);
    });
    
    return formatted;
}

    escapeAttribute(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // Funções auxiliares limpas
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
        return !rating ? '0.0' : parseFloat(rating).toFixed(1);
    }

    formatDate(dateString) {
        if (!dateString) return 'Data não disponível';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    renderTags(tagsString) {
        if (!tagsString) return '';
        const tags = tagsString.split(',').map(tag => tag.trim());
        return tags.map(tag => `<span class="content-tag">${tag}</span>`).join('');
    }

    showError(message) {
        const container = document.getElementById('kb-articles');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erro</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="window.knowledgeBaseManager?.loadArticles()">
                        <i class="fas fa-redo"></i> Tentar novamente
                    </button>
                </div>
            `;
        }
    }

    copyCode(button, code) {
        navigator.clipboard.writeText(code).then(() => {
            button.innerHTML = '<i class="fas fa-check"></i> Copiado!';
            button.classList.add('copied');
            
            setTimeout(() => {
                button.innerHTML = '<i class="fas fa-copy"></i> Copiar';
                button.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('❌ Erro ao copiar:', err);
            this.showNotification('Erro ao copiar código', 'error');
        });
    }

    showNotification(message, type = 'info') {
        console.log(`${type.toUpperCase()}: ${message}`);
        
        if (window.app && typeof window.app.showToast === 'function') {
            window.app.showToast(message, type);
        } else if (typeof showToast !== 'undefined') {
            showToast(message, type);
        } else {
            alert(message);
        }
    }

    closeModal() {
        const modal = document.getElementById('ticket-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// Inicialização
let knowledgeBase = null;

const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const kbSection = document.getElementById('knowledge-base-section');
            if (kbSection && kbSection.classList.contains('active') && !knowledgeBase) {
                console.log('🚀 Inicializando Knowledge Base...');
                knowledgeBase = new KnowledgeBase();
                window.knowledgeBase = knowledgeBase;
                window.knowledgeBaseManager = knowledgeBase;
            }
        }
    });
});

if (document.getElementById('knowledge-base-section')) {
    observer.observe(document.getElementById('knowledge-base-section'), {
        attributes: true,
        attributeFilter: ['class']
    });
    
    if (document.getElementById('knowledge-base-section').classList.contains('active')) {
        knowledgeBase = new KnowledgeBase();
        window.knowledgeBase = knowledgeBase;
        window.knowledgeBaseManager = knowledgeBase;
    }
}

window.KnowledgeBase = KnowledgeBase;
window.closeModal = function() {
    const modal = document.getElementById('ticket-modal');
    if (modal) {
        modal.style.display = 'none';
    }
};