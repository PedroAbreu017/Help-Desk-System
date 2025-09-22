// src/utils/helpers.js - Funções Utilitárias
const { executeQuery } = require('../config/database');

/**
 * Gerar ID único baseado em timestamp + random
 * @returns {string} ID único
 */
function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 5);
}

/**
 * Obter timestamp atual em formato ISO
 * @returns {string} Timestamp ISO
 */
function getCurrentTimestamp() {
    return new Date().toISOString();
}

/**
 * Registrar atividade no log
 * @param {string|null} ticketId - ID do ticket (null para atividades gerais)
 * @param {string} action - Ação realizada
 * @param {string} description - Descrição da atividade
 * @param {string} userName - Nome do usuário que realizou a ação
 * @returns {Promise<void>}
 */
async function logActivity(ticketId, action, description, userName) {
    try {
        await executeQuery(
            'INSERT INTO activity_logs (id, ticket_id, action, description, user_name) VALUES (?, ?, ?, ?, ?)',
            [generateId(), ticketId, action, description, userName]
        );
    } catch (error) {
        console.error('❌ Erro ao registrar atividade:', error);
        // Não propagar o erro para não quebrar o fluxo principal
    }
}

/**
 * Validar formato de email
 * @param {string} email - Email para validar
 * @returns {boolean} True se válido
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Sanitizar string HTML
 * @param {string} str - String para sanitizar
 * @returns {string} String sanitizada
 */
function sanitizeHtml(str) {
    if (typeof str !== 'string') return str;
    
    return str
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * Formatar bytes para formato legível
 * @param {number} bytes - Número de bytes
 * @param {number} decimals - Casas decimais (padrão: 2)
 * @returns {string} Formato legível (ex: "1.5 MB")
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Calcular diferença de tempo em formato legível
 * @param {Date|string} startDate - Data de início
 * @param {Date|string} endDate - Data de fim (padrão: agora)
 * @returns {string} Diferença formatada
 */
function timeAgo(startDate, endDate = new Date()) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end - start;

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMonths > 0) return `${diffMonths} ${diffMonths === 1 ? 'mês' : 'meses'} atrás`;
    if (diffWeeks > 0) return `${diffWeeks} ${diffWeeks === 1 ? 'semana' : 'semanas'} atrás`;
    if (diffDays > 0) return `${diffDays} ${diffDays === 1 ? 'dia' : 'dias'} atrás`;
    if (diffHours > 0) return `${diffHours} ${diffHours === 1 ? 'hora' : 'horas'} atrás`;
    if (diffMinutes > 0) return `${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'} atrás`;
    if (diffSeconds > 0) return `${diffSeconds} ${diffSeconds === 1 ? 'segundo' : 'segundos'} atrás`;
    return 'agora';
}

/**
 * Calcular duração entre duas datas em formato legível
 * @param {Date|string} startDate - Data de início
 * @param {Date|string} endDate - Data de fim
 * @returns {string} Duração formatada
 */
function formatDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end - start;

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
        const remainingHours = diffHours % 24;
        return `${diffDays}d ${remainingHours}h`;
    }
    if (diffHours > 0) {
        const remainingMinutes = diffMinutes % 60;
        return `${diffHours}h ${remainingMinutes}m`;
    }
    if (diffMinutes > 0) {
        const remainingSeconds = diffSeconds % 60;
        return `${diffMinutes}m ${remainingSeconds}s`;
    }
    return `${diffSeconds}s`;
}

/**
 * Slugify string (converter para URL amigável)
 * @param {string} text - Texto para converter
 * @returns {string} Slug
 */
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Espaços por hífens
        .replace(/[^\w\-]+/g, '')       // Remover caracteres especiais
        .replace(/\-\-+/g, '-')         // Múltiplos hífens por um
        .replace(/^-+/, '')             // Remover hífen do início
        .replace(/-+$/, '');            // Remover hífen do fim
}

/**
 * Truncar texto com ellipsis
 * @param {string} text - Texto para truncar
 * @param {number} maxLength - Comprimento máximo
 * @param {string} suffix - Sufixo (padrão: '...')
 * @returns {string} Texto truncado
 */
function truncateText(text, maxLength, suffix = '...') {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Capitalizar primeira letra
 * @param {string} str - String para capitalizar
 * @returns {string} String capitalizada
 */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Capitalizar primeira letra de cada palavra
 * @param {string} str - String para capitalizar
 * @returns {string} String com palavras capitalizadas
 */
function capitalizeWords(str) {
    return str.replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
}

/**
 * Mascarar email (ex: j***@empresa.com)
 * @param {string} email - Email para mascarar
 * @returns {string} Email mascarado
 */
function maskEmail(email) {
    if (!email || !email.includes('@')) return email;
    
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 3) {
        return localPart[0] + '*'.repeat(localPart.length - 1) + '@' + domain;
    }
    return localPart[0] + '*'.repeat(localPart.length - 2) + localPart.slice(-1) + '@' + domain;
}

/**
 * Gerar cor aleatória em hexadecimal
 * @returns {string} Cor hex (ex: #FF5733)
 */
function generateRandomColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0').toUpperCase();
}

/**
 * Validar se string é JSON válido
 * @param {string} str - String para validar
 * @returns {boolean} True se for JSON válido
 */
function isValidJSON(str) {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Remover caracteres especiais de string
 * @param {string} str - String para limpar
 * @returns {string} String limpa
 */
function removeSpecialChars(str) {
    return str.replace(/[^\w\s]/gi, '');
}

/**
 * Gerar senha aleatória
 * @param {number} length - Tamanho da senha (padrão: 12)
 * @param {boolean} includeSymbols - Incluir símbolos (padrão: true)
 * @returns {string} Senha aleatória
 */
function generateRandomPassword(length = 12, includeSymbols = true) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let charset = lowercase + uppercase + numbers;
    if (includeSymbols) charset += symbols;
    
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
}

/**
 * Debounce function
 * @param {Function} func - Função para debounce
 * @param {number} wait - Tempo de espera em ms
 * @returns {Function} Função com debounce
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function
 * @param {Function} func - Função para throttle
 * @param {number} limit - Limite em ms
 * @returns {Function} Função com throttle
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Converter objeto para query string
 * @param {Object} obj - Objeto para converter
 * @returns {string} Query string
 */
function objectToQueryString(obj) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(obj)) {
        if (value !== null && value !== undefined) {
            params.append(key, value);
        }
    }
    return params.toString();
}

/**
 * Deep clone de objeto
 * @param {any} obj - Objeto para clonar
 * @returns {any} Objeto clonado
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const cloned = {};
        Object.keys(obj).forEach(key => {
            cloned[key] = deepClone(obj[key]);
        });
        return cloned;
    }
}

/**
 * Retry function com backoff exponencial
 * @param {Function} fn - Função para tentar
 * @param {number} maxRetries - Máximo de tentativas (padrão: 3)
 * @param {number} delay - Delay inicial em ms (padrão: 1000)
 * @returns {Promise<any>} Resultado da função
 */
async function retryWithBackoff(fn, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i === maxRetries - 1) break;
            
            const backoffDelay = delay * Math.pow(2, i);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
    }
    
    throw lastError;
}

/**
 * Validar CPF brasileiro
 * @param {string} cpf - CPF para validar
 * @returns {boolean} True se válido
 */
function isValidCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g, '');
    
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(10))) return false;
    
    return true;
}

/**
 * Formatar CPF
 * @param {string} cpf - CPF para formatar
 * @returns {string} CPF formatado (000.000.000-00)
 */
function formatCPF(cpf) {
    cpf = cpf.replace(/[^\d]/g, '');
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formatar telefone brasileiro
 * @param {string} phone - Telefone para formatar
 * @returns {string} Telefone formatado
 */
function formatPhone(phone) {
    phone = phone.replace(/[^\d]/g, '');
    
    if (phone.length === 11) {
        return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (phone.length === 10) {
        return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    
    return phone;
}

/**
 * Normalizar string para busca (remover acentos, maiúsculas, etc)
 * @param {string} str - String para normalizar
 * @returns {string} String normalizada
 */
function normalizeForSearch(str) {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^\w\s]/g, '') // Remove caracteres especiais
        .replace(/\s+/g, ' ') // Normaliza espaços
        .trim();
}

module.exports = {
    generateId,
    getCurrentTimestamp,
    logActivity,
    isValidEmail,
    sanitizeHtml,
    formatBytes,
    timeAgo,
    formatDuration,
    slugify,
    truncateText,
    capitalize,
    capitalizeWords,
    maskEmail,
    generateRandomColor,
    isValidJSON,
    removeSpecialChars,
    generateRandomPassword,
    debounce,
    throttle,
    objectToQueryString,
    deepClone,
    retryWithBackoff,
    isValidCPF,
    formatCPF,
    formatPhone,
    normalizeForSearch
};