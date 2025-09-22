// public/js/reports.js - Módulo de Relatórios
class ReportsManager {
    constructor() {
        this.charts = {};
        this.currentData = null;
        this.init();
    }

    init() {
        console.log('🧪 Inicializando módulo de relatórios...');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Aguardar o DOM estar pronto
        setTimeout(() => {
            this.connectButtons();
        }, 1000);
    }

    connectButtons() {
        // Encontrar botões na seção de relatórios
        const reportsSection = document.getElementById('reports-section');
        if (!reportsSection) return;

        const buttons = reportsSection.querySelectorAll('button');
        buttons.forEach((btn, index) => {
            const text = btn.textContent.trim();
            console.log(`Botão relatórios ${index}:`, text);

            if (text === 'Gerar Relatório') {
                btn.addEventListener('click', (e) => this.handleGenerateReport(e));
                console.log('✅ Botão Gerar Relatório conectado');
            } else if (text === 'Exportar') {
                btn.addEventListener('click', (e) => this.handleExportReport(e));
                console.log('✅ Botão Exportar conectado');
            } else if (text === 'Filtrar') {
                btn.addEventListener('click', (e) => this.handleFilter(e));
                console.log('✅ Botão Filtrar conectado');
            } else if (text === 'Limpar') {
                btn.addEventListener('click', (e) => this.handleClearFilters(e));
                console.log('✅ Botão Limpar conectado');
            }
        });
    }

    async handleGenerateReport(e) {
        e.preventDefault();
        console.log('🔄 Gerando relatório...');

        try {
            // Pegar dados do formulário
            const formData = this.getFormData();
            console.log('Parâmetros do relatório:', formData);

            // Mostrar loading
            this.showLoading('Gerando relatório...');

            // Fazer requisição para API
            const url = this.buildApiUrl('/api/reports/summary', formData);
            const response = await fetch(url, {
                headers: window.authManager.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ Relatório gerado:', result);

            if (result.success) {
                this.currentData = result.data;
                this.displayReport(result.data);
                this.showToast('Relatório gerado com sucesso!', 'success');
            } else {
                throw new Error(result.message || 'Erro desconhecido');
            }

        } catch (error) {
            console.error('❌ Erro ao gerar relatório:', error);
            this.showToast('Erro ao gerar relatório: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleExportReport(e) {
        e.preventDefault();
        console.log('📁 Exportando relatório...');

        try {
            const formData = this.getFormData();
            const url = this.buildApiUrl('/api/reports/detailed', { ...formData, format: 'csv' });

            // Criar link de download
            const link = document.createElement('a');
            link.href = url;
            link.download = `relatorio_${formData.start_date || 'all'}_${formData.end_date || 'all'}.csv`;
            
            // Adicionar headers de autenticação ao link (não funciona diretamente)
            // Em vez disso, fazer download via fetch
            const response = await fetch(url, {
                headers: window.authManager.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            
            link.href = downloadUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            window.URL.revokeObjectURL(downloadUrl);

            console.log('✅ Relatório exportado');
            this.showToast('Relatório exportado com sucesso!', 'success');

        } catch (error) {
            console.error('❌ Erro ao exportar relatório:', error);
            this.showToast('Erro ao exportar relatório: ' + error.message, 'error');
        }
    }

    handleFilter(e) {
        e.preventDefault();
        console.log('🔍 Aplicando filtros...');
        
        // Se já temos dados, regenerar o relatório com filtros
        if (this.currentData) {
            this.handleGenerateReport(e);
        } else {
            this.showToast('Gere um relatório primeiro', 'info');
        }
    }

    handleClearFilters(e) {
        e.preventDefault();
        console.log('🧹 Limpando filtros...');

        // Limpar campos do formulário
        const form = document.querySelector('#reports-section form');
        if (form) {
            const inputs = form.querySelectorAll('input, select');
            inputs.forEach(input => {
                if (input.type === 'date') {
                    input.value = '';
                } else if (input.tagName === 'SELECT') {
                    input.selectedIndex = 0;
                }
            });
        }

        // Limpar relatório atual
        this.currentData = null;
        this.clearReport();
        
        this.showToast('Filtros limpos', 'success');
    }

    getFormData() {
        const form = {};
        const section = document.getElementById('reports-section');
        
        if (section) {
            // Pegar datas
            const dateInputs = section.querySelectorAll('input[type="date"]');
            if (dateInputs[0] && dateInputs[0].value) form.start_date = dateInputs[0].value;
            if (dateInputs[1] && dateInputs[1].value) form.end_date = dateInputs[1].value;

            // Pegar selects
            const selects = section.querySelectorAll('select');
            selects.forEach(select => {
                if (select.value && select.value !== '') {
                    const name = select.name || select.id || 'unknown';
                    form[name] = select.value;
                }
            });
        }

        return form;
    }

    buildApiUrl(baseUrl, params) {
        const url = new URL(baseUrl, window.location.origin);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== '') {
                url.searchParams.append(key, params[key]);
            }
        });
        return url.toString();
    }

    displayReport(data) {
        console.log('📊 Exibindo relatório:', data);

        // Atualizar cards de resumo
        this.updateSummaryCards(data.summary);

        // Criar gráficos
        this.createReportCharts(data);

        // Mostrar tabela de dados
        this.updateDataTable(data);

        // Mostrar seção de resultados
        const resultsSection = document.querySelector('.reports-results');
        if (resultsSection) {
            resultsSection.style.display = 'block';
        }
    }

    updateSummaryCards(summary) {
        // Atualizar cards com números do relatório
        const updateCard = (selector, value) => {
            const element = document.querySelector(selector);
            if (element) element.textContent = value;
        };

        updateCard('#report-total-tickets', summary.total_tickets || 0);
        updateCard('#report-resolution-rate', `${summary.resolution_rate || 0}%`);
        
        // Calcular tickets em andamento
        const inProgress = (summary.by_status.aberto || 0) + (summary.by_status.andamento || 0);
        updateCard('#report-in-progress', inProgress);
    }

    createReportCharts(data) {
        // Destruir gráficos existentes
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};

        // Gráfico por categoria
        this.createCategoryReportChart(data.summary.by_category);
        
        // Gráfico por prioridade  
        this.createPriorityReportChart(data.summary.by_priority);
        
        // Gráfico por status
        this.createStatusReportChart(data.summary.by_status);
        
        // Tendência semanal se disponível
        if (data.trends && data.trends.weekly_tickets) {
            this.createTrendChart(data.trends.weekly_tickets);
        }
    }

    createCategoryReportChart(categoryData) {
        const ctx = document.getElementById('reportCategoryChart');
        if (!ctx || !categoryData) return;

        const labels = Object.keys(categoryData);
        const values = Object.values(categoryData);

        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
                        '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    createPriorityReportChart(priorityData) {
        const ctx = document.getElementById('reportPriorityChart');
        if (!ctx || !priorityData) return;

        const priorityOrder = ['critica', 'alta', 'media', 'baixa'];
        const priorityColors = {
            'critica': '#dc3545',
            'alta': '#fd7e14', 
            'media': '#ffc107',
            'baixa': '#28a745'
        };

        const labels = priorityOrder.filter(p => priorityData[p] > 0);
        const values = labels.map(p => priorityData[p]);
        const colors = labels.map(p => priorityColors[p]);

        this.charts.priority = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
                datasets: [{
                    label: 'Tickets',
                    data: values,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    createStatusReportChart(statusData) {
        const ctx = document.getElementById('reportStatusChart');
        if (!ctx || !statusData) return;

        const statusLabels = {
            'aberto': 'Aberto',
            'andamento': 'Em Andamento', 
            'resolvido': 'Resolvido',
            'fechado': 'Fechado'
        };

        const labels = Object.keys(statusData).map(s => statusLabels[s] || s);
        const values = Object.values(statusData);

        this.charts.status = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: ['#17a2b8', '#ffc107', '#28a745', '#6c757d']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    createTrendChart(weeklyData) {
        const ctx = document.getElementById('reportTrendChart');
        if (!ctx || !weeklyData || weeklyData.length === 0) return;

        const labels = weeklyData.map(item => `Sem ${item.week}`);
        const values = weeklyData.map(item => item.count);

        this.charts.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tickets Criados',
                    data: values,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    updateDataTable(data) {
        // Atualizar tabela com dados recentes se existir
        const tableBody = document.querySelector('#reports-table tbody');
        if (tableBody && data.recent_tickets) {
            tableBody.innerHTML = '';
            
            data.recent_tickets.forEach(ticket => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>#${ticket.id}</td>
                    <td>${ticket.title || 'N/A'}</td>
                    <td><span class="badge badge-${this.getCategoryClass(ticket.category)}">${ticket.category}</span></td>
                    <td><span class="badge badge-${this.getPriorityClass(ticket.priority)}">${ticket.priority}</span></td>
                    <td><span class="badge badge-${this.getStatusClass(ticket.status)}">${ticket.status}</span></td>
                    <td>${this.formatDate(ticket.created_at)}</td>
                `;
                tableBody.appendChild(row);
            });
        }
    }

    clearReport() {
        // Destruir gráficos
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};

        // Esconder seção de resultados
        const resultsSection = document.querySelector('.reports-results');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
    }

    // Utility methods
    getCategoryClass(category) {
        const classes = {
            'hardware': 'danger',
            'software': 'primary', 
            'rede': 'info',
            'email': 'warning',
            'impressora': 'secondary'
        };
        return classes[category] || 'light';
    }

    getPriorityClass(priority) {
        const classes = {
            'critica': 'danger',
            'alta': 'warning',
            'media': 'info', 
            'baixa': 'success'
        };
        return classes[priority] || 'secondary';
    }

    getStatusClass(status) {
        const classes = {
            'aberto': 'info',
            'andamento': 'warning',
            'resolvido': 'success',
            'fechado': 'secondary'
        };
        return classes[status] || 'light';
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    showLoading(message = 'Carregando...') {
        // Implementar loading se necessário
        console.log('⏳', message);
    }

    hideLoading() {
        // Remover loading
        console.log('✅ Loading removido');
    }

    showToast(message, type = 'info') {
        if (window.authManager && window.authManager.showToast) {
            window.authManager.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Função de inicialização robusta
function initReportsManager() {
    if (!window.reportsManager && typeof ReportsManager !== 'undefined') {
        window.reportsManager = new ReportsManager();
        console.log('✅ ReportsManager inicializado');
        return true;
    }
    return false;
}

// Múltiplas tentativas de inicialização para sistema modular
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReportsManager);
} else {
    initReportsManager();
}

// Aguardar sistema modular estar pronto
document.addEventListener('modularSystemReady', () => {
    setTimeout(initReportsManager, 1000);
});

// Fallback final
setTimeout(() => {
    if (!initReportsManager()) {
        console.warn('⚠️ ReportsManager não pôde ser inicializado automaticamente');
    }
}, 4000);