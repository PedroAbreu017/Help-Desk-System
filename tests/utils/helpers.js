
// tests/utils/helpers.js - Helpers Atualizados (substitui o anterior)
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { executeQuery } = require('../../src/config/database');
const SchemaChecker = require('./database-schema-check.test');

class TestHelpers {
    static async createTestUser(userData = {}) {
        const defaultUser = {
            id: 'test-user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            name: 'Test User',
            email: 'test' + Date.now() + '@example.com',
            password_hash: await bcrypt.hash('password123', 10),
            role: 'user',
            department: 'TI',
            active: 1
        };
        
        return { ...defaultUser, ...userData };
    }
    
    static generateAuthToken(user) {
        return jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                role: user.role 
            },
            process.env.JWT_SECRET || 'test-secret-key-for-testing',
            { 
                expiresIn: '1h',
                issuer: 'helpdesk-system',
                audience: 'helpdesk-users'
            }
        );
    }
    
    static async createTestTicket(ticketData = {}) {
        const defaultTicket = {
            id: 'ticket-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            title: 'Test Ticket',
            description: 'Test description',
            category: 'hardware',
            priority: 'media',
            status: 'aberto',
            user_name: 'Test User',
            user_email: 'test@example.com',
            department: 'TI',
            assigned_to: null,
            solution: null,
            created_at: new Date(),
            updated_at: new Date(),
            resolved_at: null
        };
        
        return { ...defaultTicket, ...ticketData };
    }
    
    static async clearDatabase() {
        try {
            // Limpar dados de teste na ordem correta (respeitando foreign keys)
            await executeQuery('DELETE FROM ticket_notes WHERE ticket_id LIKE "test-%"');
            await executeQuery('DELETE FROM ticket_attachments WHERE ticket_id LIKE "test-%"');
            await executeQuery('DELETE FROM activity_logs WHERE ticket_id LIKE "test-%"');
            await executeQuery('DELETE FROM tickets WHERE id LIKE "test-%"');
            await executeQuery('DELETE FROM users WHERE id LIKE "test-%"');
            
            console.log('🧹 Dados de teste limpos');
        } catch (error) {
            console.warn('⚠️ Erro ao limpar dados de teste:', error.message);
            // Não falhar os testes por causa disso
        }
    }
    
    static async insertTestUser(user) {
        try {
            const insertQuery = await SchemaChecker.getCorrectUserInsertQuery();
            
            if (!insertQuery) {
                console.warn('⚠️ Schema de usuário não identificado, saltando inserção');
                return false;
            }
            
            await executeQuery(insertQuery, [
                user.id, user.name, user.email, user.password_hash, 
                user.role, user.department, user.active
            ]);
            
            return true;
        } catch (error) {
            console.warn('⚠️ Erro ao inserir usuário de teste:', error.message);
            return false;
        }
    }
    
    static mockRequest(data = {}) {
        return {
            body: {},
            params: {},
            query: {},
            headers: {},
            user: null,
            ip: '127.0.0.1',
            get: jest.fn().mockReturnValue('test-user-agent'),
            ...data
        };
    }
    
    static mockResponse() {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        res.send = jest.fn().mockReturnValue(res);
        res.cookie = jest.fn().mockReturnValue(res);
        res.clearCookie = jest.fn().mockReturnValue(res);
        return res;
    }

    static mockNext() {
        return jest.fn();
    }

    static generateId() {
        return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
    }
}

module.exports = TestHelpers;