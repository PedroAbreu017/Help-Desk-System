// public/js/modules/charts-module.js
// Módulo que melhora os gráficos Chart.js existentes

class ChartsModule extends BaseModule {
  constructor() {
    super('charts', {
      dependencies: ['Chart'],
      autoRefresh: false
    });
    
    this.charts = {};
    this.chartData = {};
    this.animationQueue = [];
  }

  async onInit() {
    this.log('Inicializando Charts Module...');
    
    // Aguardar gráficos existentes serem criados
    await this.waitForExistingCharts();
    
    // Referenciá-los e melhorá-los
    this.enhanceExistingCharts();
    
    // Adicionar funcionalidades extras
    this.addChartEnhancements();
    
    this.log('Charts Module inicializado');
  }

  async waitForExistingCharts() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 segundos
      
      const checkCharts = () => {
        attempts++;
        
        // Verificar se gráficos globais existem
        if (window.categoryChart || window.priorityChart || window.timelineChart || window.statusChart) {
          this.log('Gráficos existentes detectados');
          resolve();
          return;
        }
        
        if (attempts >= maxAttempts) {
          this.warn('Timeout aguardando gráficos existentes');
          resolve();
          return;
        }
        
        setTimeout(checkCharts, 100);
      };
      
      checkCharts();
    });
  }

  enhanceExistingCharts() {
    // Referenciar gráficos existentes
    this.charts.category = window.categoryChart;
    this.charts.priority = window.priorityChart;
    this.charts.timeline = window.timelineChart;
    this.charts.status = window.statusChart;

    // Melhorar cada gráfico existente
    Object.entries(this.charts).forEach(([name, chart]) => {
      if (chart) {
        this.enhanceChart(name, chart);
      }
    });

    // Interceptar funções globais de refresh
    this.interceptRefreshFunctions();
  }

  enhanceChart(name, chart) {
    if (!chart) return;

    this.log(`Melhorando gráfico: ${name}`);

    // Adicionar eventos personalizados
    this.addChartEvents(name, chart);
    
    // Melhorar tooltips
    this.enhanceTooltips(name, chart);
    
    // Adicionar animações suaves
    this.enhanceAnimations(name, chart);
    
    // Adicionar responsividade melhorada
    this.enhanceResponsiveness(name, chart);
  }

  addChartEvents(name, chart) {
    // Interceptar eventos de clique
    const originalOnClick = chart.options.onClick || (() => {});
    
    chart.options.onClick = (event, activeElements) => {
      if (activeElements.length > 0) {
        const elementIndex = activeElements[0].index;
        const datasetIndex = activeElements[0].datasetIndex;
        const value = chart.data.datasets[datasetIndex].data[elementIndex];
        const label = chart.data.labels[elementIndex];
        
        this.log(`Clique no gráfico ${name}: ${label} = ${value}`);
        this.emit('chartClick', { chart: name, label, value, elementIndex });
      }
      
      // Chamar handler original se existir
      originalOnClick.call(chart, event, activeElements);
    };

    // Adicionar eventos de hover
    chart.options.onHover = (event, activeElements) => {
      const canvas = chart.canvas;
      canvas.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
    };
  }

  enhanceTooltips(name, chart) {
    if (!chart.options.plugins) chart.options.plugins = {};
    if (!chart.options.plugins.tooltip) chart.options.plugins.tooltip = {};
    
    const originalTooltip = chart.options.plugins.tooltip || {};
    
    chart.options.plugins.tooltip = {
      ...originalTooltip,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      borderColor: '#3b82f6',
      borderWidth: 2,
      cornerRadius: 8,
      displayColors: true,
      titleFont: {
        size: 14,
        weight: 'bold',
        family: 'Segoe UI'
      },
      bodyFont: {
        size: 13,
        family: 'Segoe UI'
      },
      callbacks: {
        ...originalTooltip.callbacks,
        title: (context) => {
          const title = originalTooltip.callbacks?.title?.(context) || context[0].label;
          return `📊 ${title}`;
        },
        label: (context) => {
          const originalLabel = originalTooltip.callbacks?.label?.(context);
          if (originalLabel) return originalLabel;
          
          let label = context.dataset.label || '';
          if (label) label += ': ';
          
          const value = context.parsed.y !== null ? context.parsed.y : context.parsed;
          const total = context.dataset.data.reduce((a, b) => a + b, 0);
          const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
          
          return `${label}${value} (${percentage}%)`;
        },
        afterBody: (context) => {
          // Adicionar informações extras baseadas no tipo de gráfico
          if (name === 'timeline') {
            return ['', '💡 Clique para ver detalhes do período'];
          }
          if (name === 'category' || name === 'priority') {
            return ['', '🔍 Clique para filtrar tickets'];
          }
          return [];
        }
      }
    };
  }

  enhanceAnimations(name, chart) {
    if (!chart.options.animation) chart.options.animation = {};
    
    // Animações mais suaves
    chart.options.animation = {
      ...chart.options.animation,
      duration: 1000,
      easing: 'easeOutQuart'
    };

    // Animações de hover
    if (!chart.options.hover) chart.options.hover = {};
    chart.options.hover.animationDuration = 200;
    
    // Animações de resize
    if (!chart.options.responsiveAnimationDuration) {
      chart.options.responsiveAnimationDuration = 500;
    }
  }

  enhanceResponsiveness(name, chart) {
    // Melhorar comportamento responsivo
    chart.options.responsive = true;
    chart.options.maintainAspectRatio = false;
    
    // Adicionar breakpoints específicos
    const originalResize = chart.resize;
    chart.resize = function(width, height) {
      // Ajustar configurações baseado no tamanho
      if (width < 400) {
        // Mobile
        if (this.options.plugins.legend) {
          this.options.plugins.legend.position = 'bottom';
          this.options.plugins.legend.labels.boxWidth = 12;
        }
      } else {
        // Desktop
        if (this.options.plugins.legend) {
          this.options.plugins.legend.position = name === 'timeline' ? 'top' : 'bottom';
          this.options.plugins.legend.labels.boxWidth = 20;
        }
      }
      
      return originalResize.call(this, width, height);
    };
  }

  interceptRefreshFunctions() {
    // Interceptar funções globais de refresh para adicionar melhorias
    const refreshFunctions = [
      'refreshCategoryChart',
      'refreshPriorityChart', 
      'refreshTimelineChart',
      'refreshStatusChart'
    ];

    refreshFunctions.forEach(funcName => {
      if (typeof window[funcName] === 'function') {
        const original = window[funcName];
        
        window[funcName] = (...args) => {
          const chartName = funcName.replace('refresh', '').replace('Chart', '').toLowerCase();
          this.log(`Interceptando refresh do gráfico: ${chartName}`);
          
          // Adicionar loading state
          this.showChartLoading(chartName);
          
          // Executar função original
          const result = original.apply(window, args);
          
          // Adicionar delay para mostrar loading
          setTimeout(() => {
            this.hideChartLoading(chartName);
            this.emit('chartRefreshed', { chart: chartName });
          }, 500);
          
          return result;
        };
      }
    });

    // Interceptar loadChartData global se existir
    if (typeof window.loadChartData === 'function') {
      const originalLoadChartData = window.loadChartData;
      
      window.loadChartData = async (...args) => {
        this.log('Interceptando carregamento de dados dos gráficos');
        this.showAllChartsLoading();
        
        try {
          const result = await originalLoadChartData.apply(window, args);
          this.hideAllChartsLoading();
          this.emit('chartsDataLoaded');
          return result;
        } catch (error) {
          this.hideAllChartsLoading();
          this.showChartsError();
          throw error;
        }
      };
    }
  }

  addChartEnhancements() {
    // Adicionar botões de exportação
    this.addExportButtons();
    
    // Adicionar seletor de tema
    this.addThemeSelector();
    
    // Adicionar zoom e pan se apropriado
    this.addZoomFeatures();
    
    // Adicionar anotações
    this.addAnnotations();
  }

  addExportButtons() {
    const chartContainers = document.querySelectorAll('.chart-card-enhanced');
    
    chartContainers.forEach(container => {
      const chartHeader = container.querySelector('.chart-header');
      const canvas = container.querySelector('canvas');
      
      if (!chartHeader || !canvas) return;
      
      // Verificar se já existe botão de export
      if (chartHeader.querySelector('.btn-export')) return;
      
      const exportBtn = document.createElement('button');
      exportBtn.className = 'btn-chart-refresh btn-export';
      exportBtn.innerHTML = '<i class="fas fa-download"></i>';
      exportBtn.title = 'Exportar gráfico';
      exportBtn.style.marginLeft = '0.5rem';
      
      this.addEventListener(exportBtn, 'click', () => {
        this.exportChart(canvas);
      });
      
      const actionsContainer = chartHeader.querySelector('.chart-actions');
      if (actionsContainer) {
        actionsContainer.appendChild(exportBtn);
      }
    });
  }

  addThemeSelector() {
    // Adicionar seletor de tema discreto no indicador modular
    const modularIndicator = document.getElementById('modular-indicator');
    if (modularIndicator && !modularIndicator.querySelector('.theme-selector')) {
      const themeBtn = document.createElement('button');
      themeBtn.className = 'theme-selector';
      themeBtn.innerHTML = '<i class="fas fa-palette"></i>';
      themeBtn.title = 'Alternar tema dos gráficos';
      themeBtn.style.cssText = `
        background: none;
        border: none;
        color: white;
        margin-left: 0.5rem;
        cursor: pointer;
        padding: 2px;
        border-radius: 3px;
      `;
      
      this.addEventListener(themeBtn, 'click', () => {
        this.toggleChartTheme();
      });
      
      modularIndicator.appendChild(themeBtn);
    }
  }

  addZoomFeatures() {
    // Adicionar zoom apenas para gráfico de timeline se for line chart
    if (this.charts.timeline && this.charts.timeline.config.type === 'line') {
      const canvas = this.charts.timeline.canvas;
      let isZooming = false;
      let zoomLevel = 1;
      
      this.addEventListener(canvas, 'wheel', (e) => {
        if (e.ctrlKey) {
          e.preventDefault();
          
          const delta = e.deltaY > 0 ? -0.1 : 0.1;
          zoomLevel = Math.max(0.5, Math.min(3, zoomLevel + delta));
          
          // Implementar zoom básico
          this.log(`Zoom level: ${zoomLevel}`);
        }
      });
    }
  }

  addAnnotations() {
    // Adicionar anotações simples aos gráficos
    Object.entries(this.charts).forEach(([name, chart]) => {
      if (!chart) return;
      
      // Adicionar linha de média para gráficos de timeline
      if (name === 'timeline' && chart.config.type === 'line') {
        this.addAverageLineAnnotation(chart);
      }
    });
  }

  // Métodos de loading states
  showChartLoading(chartName) {
    const chart = this.charts[chartName];
    if (!chart) return;
    
    const container = chart.canvas.closest('.chart-container');
    if (container) {
      let loader = container.querySelector('.chart-loader');
      if (!loader) {
        loader = document.createElement('div');
        loader.className = 'chart-loader';
        loader.style.cssText = `
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(255, 255, 255, 0.9);
          padding: 1rem;
          border-radius: 8px;
          text-align: center;
          z-index: 10;
        `;
        loader.innerHTML = '<i class="fas fa-spinner fa-spin"></i><br><small>Atualizando...</small>';
        container.appendChild(loader);
      }
      loader.style.display = 'block';
    }
  }

  hideChartLoading(chartName) {
    const chart = this.charts[chartName];
    if (!chart) return;
    
    const container = chart.canvas.closest('.chart-container');
    const loader = container?.querySelector('.chart-loader');
    if (loader) {
      loader.style.display = 'none';
    }
  }

  showAllChartsLoading() {
    Object.keys(this.charts).forEach(name => {
      this.showChartLoading(name);
    });
  }

  hideAllChartsLoading() {
    Object.keys(this.charts).forEach(name => {
      this.hideChartLoading(name);
    });
  }

  showChartsError() {
    this.log('Exibindo erro nos gráficos');
    // Implementar exibição de erro
  }

  // Métodos de funcionalidades
  exportChart(canvas) {
    const link = document.createElement('a');
    link.download = `chart-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
    
    this.log('Gráfico exportado');
    this.emit('chartExported', { timestamp: Date.now() });
  }

  toggleChartTheme() {
    const isDark = document.body.classList.contains('dark-theme');
    
    if (isDark) {
      this.applyLightTheme();
      document.body.classList.remove('dark-theme');
    } else {
      this.applyDarkTheme();
      document.body.classList.add('dark-theme');
    }
    
    this.log(`Tema alterado para: ${isDark ? 'claro' : 'escuro'}`);
  }

  applyDarkTheme() {
    const darkColors = {
      backgroundColor: '#1f2937',
      textColor: '#f9fafb',
      gridColor: '#374151'
    };
    
    Object.values(this.charts).forEach(chart => {
      if (!chart) return;
      
      if (chart.options.plugins?.legend?.labels) {
        chart.options.plugins.legend.labels.color = darkColors.textColor;
      }
      
      if (chart.options.scales) {
        Object.values(chart.options.scales).forEach(scale => {
          if (scale.ticks) scale.ticks.color = darkColors.textColor;
          if (scale.grid) scale.grid.color = darkColors.gridColor;
        });
      }
      
      chart.update();
    });
  }

  applyLightTheme() {
    const lightColors = {
      backgroundColor: '#ffffff',
      textColor: '#374151', 
      gridColor: '#e5e7eb'
    };
    
    Object.values(this.charts).forEach(chart => {
      if (!chart) return;
      
      if (chart.options.plugins?.legend?.labels) {
        chart.options.plugins.legend.labels.color = lightColors.textColor;
      }
      
      if (chart.options.scales) {
        Object.values(chart.options.scales).forEach(scale => {
          if (scale.ticks) scale.ticks.color = lightColors.textColor;
          if (scale.grid) scale.grid.color = lightColors.gridColor;
        });
      }
      
      chart.update();
    });
  }

  addAverageLineAnnotation(chart) {
    // Implementação básica de linha de média
    const data = chart.data.datasets[0]?.data || [];
    if (data.length === 0) return;
    
    const average = data.reduce((a, b) => a + b, 0) / data.length;
    
    // Adicionar plugin de anotação simples
    chart.options.plugins.annotation = {
      annotations: {
        averageLine: {
          type: 'line',
          yMin: average,
          yMax: average,
          borderColor: 'rgb(255, 99, 132)',
          borderWidth: 2,
          borderDash: [5, 5],
          label: {
            enabled: true,
            content: `Média: ${Math.round(average)}`,
            position: 'end'
          }
        }
      }
    };
  }

  // Métodos públicos
  getChart(name) {
    return this.charts[name];
  }

  getAllCharts() {
    return this.charts;
  }

  refreshAllCharts() {
    this.log('Atualizando todos os gráficos');
    
    if (typeof window.loadChartData === 'function') {
      window.loadChartData();
    } else {
      Object.keys(this.charts).forEach(name => {
        const refreshFunc = window[`refresh${name.charAt(0).toUpperCase() + name.slice(1)}Chart`];
        if (typeof refreshFunc === 'function') {
          refreshFunc();
        }
      });
    }
  }

  // Lifecycle methods
  onEnable() {
    this.log('Charts module habilitado');
  }

  onDisable() {
    this.log('Charts module desabilitado');
  }

  onDestroy() {
    // Limpar referências
    this.charts = {};
    this.chartData = {};
  }
}

// Disponibilizar globalmente
window.ChartsModule = ChartsModule;