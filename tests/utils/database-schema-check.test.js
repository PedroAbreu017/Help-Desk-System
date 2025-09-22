// tests/utils/database-schema-check.js - Verificador de Schema
const { executeQuery, getDatabaseType } = require('../../src/config/database');

class SchemaChecker {
    static async checkUserTableSchema() {
        try {
            if (getDatabaseType() === 'mysql') {
                const columns = await executeQuery(`
                    SELECT COLUMN_NAME, DATA_TYPE 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'users'
                `);
                
                const columnNames = columns.map(col => col.COLUMN_NAME);
                console.log('📋 Colunas da tabela users:', columnNames);
                
                return {
                    hasPasswordHash: columnNames.includes('password_hash'),
                    hasPassword: columnNames.includes('password'),
                    columns: columnNames
                };
            }
        } catch (error) {
            console.warn('⚠️ Erro ao verificar schema:', error.message);
            return null;
        }
    }
    
    static async getCorrectUserInsertQuery() {
        const schema = await this.checkUserTableSchema();
        
        if (!schema) {
            return null;
        }
        
        if (schema.hasPasswordHash) {
            return 'INSERT INTO users (id, name, email, password_hash, role, department, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())';
        } else if (schema.hasPassword) {
            return 'INSERT INTO users (id, name, email, password, role, department, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())';
        }
        
        return null;
    }
}

module.exports = SchemaChecker;

