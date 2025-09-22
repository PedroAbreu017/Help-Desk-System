// tests/setup.js - Configuração Global dos Testes
require('dotenv').config();

// Configurar variáveis de ambiente para testes
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'helpdesk_test';
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
process.env.DB_HOST = process.env.TEST_DB_HOST || 'localhost';
process.env.DB_USER = process.env.TEST_DB_USER || 'root';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'V@ilos9597';

// Setup global antes de todos os testes
beforeAll(async () => {
    console.log('🚀 Iniciando configuração dos testes...');
    
    // Tentar inicializar o banco real para testes
    try {
        const { initDatabase } = require('../src/config/database');
        await initDatabase();
        console.log('✅ Banco de dados de teste inicializado!');
    } catch (error) {
        console.warn('⚠️ Falha ao conectar banco real, usando mocks:', error.message);
    }
    
    console.log('✅ Setup completo!');
});

// Limpeza após todos os testes
afterAll(async () => {
    console.log('🧹 Limpando ambiente de teste...');
    
    try {
        const { closeDatabase } = require('../src/config/database');
        await closeDatabase();
    } catch (error) {
        // Ignorar erros de fechamento
    }
});

// Setup antes de cada teste
beforeEach(() => {
    jest.clearAllMocks();
});

module.exports = {
    TEST_DB_CONFIG: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'helpdesk_test'
    }
};

