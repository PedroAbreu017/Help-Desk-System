// public/js/utils.js - Funções utilitárias

/**
 * Utilitários para formatação de dados
 */
const FormatUtils = {
    /**
     * Formatar data no padrão brasileiro
     */
    formatDate(dateString) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            console.error('Erro ao formatar data:', error);
            return dateString;
        }
    },

    /**
     * Formatar data e hora no padrão brasileiro
     */
    formatDateTime(dateString) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Erro ao formatar data/hora:', error);
            return dateString;
        }
    },

    /**
     * Formatar tempo relativo (ex: "há 2 horas")
     */
    formatRelativeTime(dateString) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 1) return 'agora mesmo';
            if (diffMins < 60) return `há ${diffMins} min`;
            if (diffHours < 24) return `há ${diffHours}h`;
            if (diffDays < 7) return `há ${diffDays} dias`;
            
            return this.formatDate(dateString);
        } catch (error) {
            console.error('Erro ao formatar tempo relativo:', error);
            return dateString;
        }
    },

    /**
     * Truncar texto longo
     */
    truncateText(text, maxLength = 50) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    /**
     * Capitalizar primeira letra
     */
    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    /**
     * Formatar ID curto
     */
    formatShortId(id) {
        if (!id) return '';
        return id.substring(0, 8);
    }
};

/**
 * Utilitários para validação
 */
const ValidationUtils = {
    /**
     * Validar email
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    /**
     * Validar campos obrigatórios de ticket
     */
    validateTicketData(data) {
        const errors = [];
        const required = ['title', 'description', 'category', 'priority', 'user_name', 'user_email', 'department'];
        
        required.forEach(field => {
            if (!data[field] || data[field].trim() === '') {
                errors.push(`Campo '${field}' é obrigatório`);
            }
        });

        if (data.user_email && !this.isValidEmail(data.user_email)) {
            errors.push('Email inválido');
        }

        if (data.title && data.title.length < 5) {
            errors.push('Título deve ter pelo menos 5 caracteres');
        }

        if (data.description && data.description.length < 10) {
            errors.push('Descrição deve ter pelo menos 10 caracteres');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    },

    /**
     * Sanitizar entrada de texto
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .trim()
            .replace(/[<>]/g, '') // Remove < e >
            .replace(/javascript:/gi, '') // Remove javascript:
            .replace(/on\w+=/gi, ''); // Remove eventos on*
    }
};

/**
 * Utilitários para UI
 */
const UIUtils = {
    /**
     * Mostrar/esconder loading
     */
    showLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'flex';
    },

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    },

    /**
     * Mostrar toast notification
     */
    showToast(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${this.getToastIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        const container = document.getElementById('toast-container');
        if (container) {
            container.appendChild(toast);

            // Auto remove
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, duration);

            // Animate in
            setTimeout(() => toast.classList.add('show'), 100);
        }
    },

    /**
     * Obter ícone para toast
     */
    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    },

    /**
     * Confirmar ação
     */
    async confirm(message, title = 'Confirmação') {
        return new Promise((resolve) => {
            const result = window.confirm(`${title}\n\n${message}`);
            resolve(result);
        });
    },

    /**
     * Debounce para inputs
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Scroll suave para elemento
     */
    scrollToElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }
    },

    /**
     * Copiar texto para clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Texto copiado!', 'success');
            return true;
        } catch (error) {
            console.error('Erro ao copiar:', error);
            this.showToast('Erro ao copiar texto', 'error');
            return false;
        }
    }
};

/**
 * Utilitários para dados
 */
const DataUtils = {
    /**
     * Agrupar array por propriedade
     */
    groupBy(array, key) {
        return array.reduce((result, item) => {
            const group = item[key];
            if (!result[group]) {
                result[group] = [];
            }
            result[group].push(item);
            return result;
        }, {});
    },

    /**
     * Ordenar array por propriedade
     */
    sortBy(array, key, order = 'asc') {
        return array.sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            
            if (order === 'desc') {
                return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
            }
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        });
    },

    /**
     * Filtrar array por múltiplos critérios
     */
    filterBy(array, filters) {
        return array.filter(item => {
            return Object.keys(filters).every(key => {
                const filterValue = filters[key];
                if (!filterValue) return true;
                
                const itemValue = item[key];
                if (typeof filterValue === 'string') {
                    return itemValue.toLowerCase().includes(filterValue.toLowerCase());
                }
                return itemValue === filterValue;
            });
        });
    },

    /**
     * Contar ocorrências
     */
    countBy(array, key) {
        return array.reduce((result, item) => {
            const value = item[key];
            result[value] = (result[value] || 0) + 1;
            return result;
        }, {});
    },

    /**
     * Remover duplicatas
     */
    unique(array, key = null) {
        if (!key) {
            return [...new Set(array)];
        }
        
        const seen = new Set();
        return array.filter(item => {
            const value = item[key];
            if (seen.has(value)) {
                return false;
            }
            seen.add(value);
            return true;
        });
    },

    /**
     * Calcular estatísticas básicas
     */
    calculateStats(array, numericKey) {
        if (!array.length) return null;
        
        const values = array.map(item => item[numericKey]).filter(val => typeof val === 'number');
        if (!values.length) return null;
        
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        return { sum, avg, min, max, count: values.length };
    }
};

/**
 * Utilitários para localStorage
 */
const StorageUtils = {
    /**
     * Salvar no localStorage com expiração
     */
    set(key, value, expirationMinutes = null) {
        try {
            const item = {
                value,
                timestamp: Date.now(),
                expiration: expirationMinutes ? Date.now() + (expirationMinutes * 60000) : null
            };
            localStorage.setItem(key, JSON.stringify(item));
        } catch (error) {
            console.error('Erro ao salvar no localStorage:', error);
        }
    },

    /**
     * Buscar do localStorage verificando expiração
     */
    get(key) {
        try {
            const itemStr = localStorage.getItem(key);
            if (!itemStr) return null;
            
            const item = JSON.parse(itemStr);
            
            // Verificar expiração
            if (item.expiration && Date.now() > item.expiration) {
                localStorage.removeItem(key);
                return null;
            }
            
            return item.value;
        } catch (error) {
            console.error('Erro ao buscar do localStorage:', error);
            return null;
        }
    },

    /**
     * Remover do localStorage
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Erro ao remover do localStorage:', error);
        }
    },

    /**
     * Limpar localStorage expirado
     */
    clearExpired() {
        try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key) {
                    const itemStr = localStorage.getItem(key);
                    if (itemStr) {
                        const item = JSON.parse(itemStr);
                        if (item.expiration && Date.now() > item.expiration) {
                            localStorage.removeItem(key);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Erro ao limpar localStorage:', error);
        }
    }
};

/**
 * Utilitários para exportação
 */
const ExportUtils = {
    /**
     * Exportar dados como CSV
     */
    exportCSV(data, filename = 'export.csv') {
        const csv = this.arrayToCSV(data);
        this.downloadFile(csv, filename, 'text/csv');
    },

    /**
     * Exportar dados como JSON
     */
    exportJSON(data, filename = 'export.json') {
        const json = JSON.stringify(data, null, 2);
        this.downloadFile(json, filename, 'application/json');
    },

    /**
     * Converter array para CSV
     */
    arrayToCSV(array) {
        if (!array.length) return '';
        
        const headers = Object.keys(array[0]);
        const csvContent = [
            headers.join(','),
            ...array.map(row => 
                headers.map(header => {
                    const value = row[header];
                    // Escapar aspas e adicionar aspas se necessário
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                        return '"' + value.replace(/"/g, '""') + '"';
                    }
                    return value;
                }).join(',')
            )
        ].join('\n');
        
        return csvContent;
    },

    /**
     * Download de arquivo
     */
    downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }
};

/**
 * Utilitários para URL e navegação
 */
const URLUtils = {
    /**
     * Obter parâmetros da URL
     */
    getURLParams() {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    },

    /**
     * Atualizar parâmetro da URL sem recarregar
     */
    updateURLParam(key, value) {
        const url = new URL(window.location);
        if (value) {
            url.searchParams.set(key, value);
        } else {
            url.searchParams.delete(key);
        }
        window.history.replaceState({}, '', url);
    },

    /**
     * Remover parâmetro da URL
     */
    removeURLParam(key) {
        this.updateURLParam(key, null);
    },

    /**
     * Construir URL com parâmetros
     */
    buildURL(baseUrl, params) {
        const url = new URL(baseUrl);
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.set(key, params[key]);
            }
        });
        return url.toString();
    }
};

/**
 * Utilitários para performance
 */
const PerformanceUtils = {
    /**
     * Throttle para eventos de scroll/resize
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Lazy loading para imagens
     */
    setupLazyLoading() {
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    },

    /**
     * Medir tempo de execução
     */
    measureTime(func, label = 'Function') {
        return async function(...args) {
            const start = performance.now();
            const result = await func.apply(this, args);
            const end = performance.now();
            console.log(`⏱️ ${label} executou em ${(end - start).toFixed(2)}ms`);
            return result;
        };
    }
};

/**
 * Utilitários específicos do Help Desk
 */
const HelpDeskUtils = {
    /**
     * Obter nome amigável do status
     */
    getStatusName(status) {
        const statusNames = {
            'aberto': 'Aberto',
            'andamento': 'Em Andamento',
            'resolvido': 'Resolvido',
            'fechado': 'Fechado'
        };
        return statusNames[status] || status;
    },

    /**
     * Obter nome amigável da prioridade
     */
    getPriorityName(priority) {
        const priorityNames = {
            'baixa': 'Baixa',
            'media': 'Média',
            'alta': 'Alta',
            'critica': 'Crítica'
        };
        return priorityNames[priority] || priority;
    },

    /**
     * Obter nome amigável da categoria
     */
    getCategoryName(category) {
        const categoryNames = {
            'hardware': 'Hardware',
            'software': 'Software',
            'rede': 'Rede',
            'email': 'Email',
            'impressora': 'Impressora',
            'sistema': 'Sistema',
            'acesso': 'Acesso'
        };
        return categoryNames[category] || category;
    },

    /**
     * Obter ícone da categoria
     */
    getCategoryIcon(category) {
        const categoryIcons = {
            'hardware': 'desktop',
            'software': 'code',
            'rede': 'wifi',
            'email': 'envelope',
            'impressora': 'print',
            'sistema': 'cog',
            'acesso': 'key'
        };
        return categoryIcons[category] || 'question';
    },

    /**
     * Obter cor da prioridade
     */
    getPriorityColor(priority) {
        const priorityColors = {
            'baixa': '#10b981',
            'media': '#3b82f6',
            'alta': '#f59e0b',
            'critica': '#dc2626'
        };
        return priorityColors[priority] || '#6b7280';
    },

    /**
     * Obter cor do status
     */
    getStatusColor(status) {
        const statusColors = {
            'aberto': '#ef4444',
            'andamento': '#f59e0b',
            'resolvido': '#10b981',
            'fechado': '#6b7280'
        };
        return statusColors[status] || '#6b7280';
    },

    /**
     * Calcular SLA (tempo de resposta)
     */
    calculateSLA(createdAt, resolvedAt = null) {
        const created = new Date(createdAt);
        const resolved = resolvedAt ? new Date(resolvedAt) : new Date();
        const diffMs = resolved - created;
        const diffHours = diffMs / (1000 * 60 * 60);
        
        return {
            hours: Math.floor(diffHours),
            days: Math.floor(diffHours / 24),
            isOverdue: diffHours > 24, // SLA de 24h
            status: diffHours <= 4 ? 'excellent' : 
                   diffHours <= 12 ? 'good' : 
                   diffHours <= 24 ? 'warning' : 'overdue'
        };
    },

    /**
     * Gerar ID único para ticket
     */
    generateTicketId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 5);
    },

    /**
     * Validar dados do ticket antes do envio
     */
    validateTicketForm(formData) {
        const validation = ValidationUtils.validateTicketData(formData);
        
        if (!validation.isValid) {
            UIUtils.showToast(validation.errors[0], 'error');
            return false;
        }
        
        return true;
    },

    /**
     * Formatar resumo do ticket para lista
     */
    formatTicketSummary(ticket) {
        return {
            id: FormatUtils.formatShortId(ticket.id),
            title: FormatUtils.truncateText(ticket.title, 40),
            user: ticket.user_name,
            status: this.getStatusName(ticket.status),
            priority: this.getPriorityName(ticket.priority),
            category: this.getCategoryName(ticket.category),
            created: FormatUtils.formatRelativeTime(ticket.created_at),
            sla: this.calculateSLA(ticket.created_at, ticket.resolved_at)
        };
    }
};

/**
 * Utilitários para acessibilidade
 */
const AccessibilityUtils = {
    /**
     * Adicionar suporte a navegação por teclado
     */
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // ESC para fechar modais
            if (e.key === 'Escape') {
                const modal = document.querySelector('.modal[style*="block"]');
                if (modal) {
                    const closeBtn = modal.querySelector('.modal-close');
                    if (closeBtn) closeBtn.click();
                }
            }
            
            // Enter para confirmar ações
            if (e.key === 'Enter' && e.target.classList.contains('btn-primary')) {
                e.target.click();
            }
        });
    },

    /**
     * Adicionar labels para screen readers
     */
    addAriaLabels() {
        // Adicionar labels para botões sem texto
        document.querySelectorAll('button[title]:not([aria-label])').forEach(btn => {
            btn.setAttribute('aria-label', btn.title);
        });
        
        // Adicionar role para elementos interativos
        document.querySelectorAll('.ticket-row').forEach(row => {
            row.setAttribute('role', 'button');
            row.setAttribute('tabindex', '0');
        });
    },

    /**
     * Melhorar contraste para elementos
     */
    enhanceContrast() {
        const isHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
        if (isHighContrast) {
            document.body.classList.add('high-contrast');
        }
    }
};

/**
 * Gerenciador de estado simples
 */
const StateManager = {
    state: {},
    
    /**
     * Definir estado
     */
    setState(key, value) {
        this.state[key] = value;
        this.notifySubscribers(key, value);
    },
    
    /**
     * Obter estado
     */
    getState(key) {
        return this.state[key];
    },
    
    /**
     * Subscribers para mudanças de estado
     */
    subscribers: {},
    
    /**
     * Inscrever-se para mudanças
     */
    subscribe(key, callback) {
        if (!this.subscribers[key]) {
            this.subscribers[key] = [];
        }
        this.subscribers[key].push(callback);
    },
    
    /**
     * Notificar subscribers
     */
    notifySubscribers(key, value) {
        if (this.subscribers[key]) {
            this.subscribers[key].forEach(callback => callback(value));
        }
    }
};

/**
 * Funções de inicialização
 */
const InitUtils = {
    /**
     * Inicializar todos os utilitários
     */
    init() {
        console.log('🔧 Inicializando utilitários...');
        
        // Configurar acessibilidade
        AccessibilityUtils.setupKeyboardNavigation();
        AccessibilityUtils.addAriaLabels();
        AccessibilityUtils.enhanceContrast();
        
        // Configurar performance
        PerformanceUtils.setupLazyLoading();
        
        // Limpar localStorage expirado
        StorageUtils.clearExpired();
        
        // Configurar listeners globais
        this.setupGlobalListeners();
        
        console.log('✅ Utilitários inicializados com sucesso!');
    },
    
    /**
     * Configurar listeners globais
     */
    setupGlobalListeners() {
        // Listener para mudanças de conexão
        window.addEventListener('online', () => {
            UIUtils.showToast('Conexão restaurada', 'success');
        });
        
        window.addEventListener('offline', () => {
            UIUtils.showToast('Conexão perdida', 'warning');
        });
        
        // Listener para erros não capturados
        window.addEventListener('error', (e) => {
            console.error('Erro não capturado:', e.error);
            UIUtils.showToast('Ocorreu um erro inesperado', 'error');
        });
        
        // Listener para promises rejeitadas
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Promise rejeitada:', e.reason);
            UIUtils.showToast('Erro de comunicação com servidor', 'error');
        });
    }
};

// Disponibilizar globalmente
if (typeof window !== 'undefined') {
    window.FormatUtils = FormatUtils;
    window.ValidationUtils = ValidationUtils;
    window.UIUtils = UIUtils;
    window.DataUtils = DataUtils;
    window.StorageUtils = StorageUtils;
    window.ExportUtils = ExportUtils;
    window.URLUtils = URLUtils;
    window.PerformanceUtils = PerformanceUtils;
    window.HelpDeskUtils = HelpDeskUtils;
    window.AccessibilityUtils = AccessibilityUtils;
    window.StateManager = StateManager;
    window.InitUtils = InitUtils;
}

// Auto-inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', InitUtils.init);
} else {
    InitUtils.init();
}

console.log('✅ Utilitários carregados com sucesso!');