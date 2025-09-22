// scripts/setup-auth.js - Setup do Sistema de Autenticação (CORRIGIDO para SQLite)
require('dotenv').config(); 

const bcrypt = require('bcryptjs');
const { executeQuery, initDatabase, getDatabaseType } = require('../src/config/database');
const { generateId } = require('../src/utils/helpers');

async function setupAuthentication() {
    console.log('🔐 Configurando Sistema de Autenticação...');

    try {
        // Inicializar banco de dados
        await initDatabase();
        const dbType = getDatabaseType();

        // Criar tabela de usuários se não existir
        await createUsersTable(dbType);

        // Criar tabela de ratings da knowledge base se não existir
        await createKnowledgeBaseRatingsTable(dbType);

        // Criar usuários padrão
        await createDefaultUsers(dbType);

        console.log('✅ Sistema de autenticação configurado com sucesso!');
        console.log('');
        console.log('👥 Usuários padrão criados:');
        console.log('📧 Admin: admin / admin123');
        console.log('🔧 Suporte: suporte01 / suporte123');
        console.log('👤 Usuário: user01 / user123');
        console.log('');
        console.log('🚀 Reinicie o servidor e acesse o sistema!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao configurar autenticação:', error);
        process.exit(1);
    }
}

async function createUsersTable(dbType) {
    console.log('📋 Verificando tabela de usuários...');

    // Verificar se coluna password_hash existe
    try {
        await executeQuery('SELECT password_hash FROM users LIMIT 1');
        console.log('✅ Tabela users já possui autenticação');
        return;
    } catch (error) {
        console.log('🔄 Adicionando colunas de autenticação...');
    }

    // Adicionar colunas de autenticação (compatível com SQLite e MySQL)
    const authColumns = [
        'password_hash TEXT DEFAULT NULL',
        'active INTEGER DEFAULT 1', // SQLite usa INTEGER para BOOLEAN
        'refresh_token TEXT DEFAULT NULL',
        'login_attempts INTEGER DEFAULT 0',
        'locked_until TEXT DEFAULT NULL', // SQLite usa TEXT para TIMESTAMP
        'last_login TEXT DEFAULT NULL'
    ];

    for (const column of authColumns) {
        try {
            const columnName = column.split(' ')[0];
            await executeQuery(`ALTER TABLE users ADD COLUMN ${column}`);
            console.log(`✅ Coluna adicionada: ${columnName}`);
        } catch (error) {
            if (!error.message.includes('duplicate column name') && 
                !error.message.includes('Duplicate column name')) {
                console.log(`⚠️ Aviso ao adicionar coluna: ${error.message}`);
            }
        }
    }

    console.log('✅ Estrutura da tabela users atualizada');
}

async function createKnowledgeBaseRatingsTable(dbType) {
    console.log('📊 Criando tabela de ratings da knowledge base...');

    let createRatingsTable;

    if (dbType === 'sqlite') {
        // SQLite não suporta CHECK constraints da mesma forma
        createRatingsTable = `
            CREATE TABLE IF NOT EXISTS knowledge_base_ratings (
                id TEXT PRIMARY KEY,
                article_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                rating INTEGER NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(article_id, user_id)
            )
        `;
    } else {
        // MySQL
        createRatingsTable = `
            CREATE TABLE IF NOT EXISTS knowledge_base_ratings (
                id VARCHAR(50) PRIMARY KEY,
                article_id INT NOT NULL,
                user_id VARCHAR(50) NOT NULL,
                rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_article (article_id, user_id),
                INDEX idx_article_id (article_id),
                INDEX idx_user_id (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `;
    }

    try {
        await executeQuery(createRatingsTable);
        console.log('✅ Tabela knowledge_base_ratings criada/verificada');
    } catch (error) {
        console.error('❌ Erro ao criar tabela de ratings:', error.message);
    }
}

async function createDefaultUsers(dbType) {
    console.log('👥 Criando usuários padrão...');

    const defaultUsers = [
        {
            name: 'Administrador do Sistema',
            email: 'admin',
            password: 'admin123',
            role: 'admin',
            department: 'TI'
        },
        {
            name: 'Técnico de Suporte',
            email: 'suporte01',
            password: 'suporte123',
            role: 'technician',
            department: 'TI'
        },
        {
            name: 'Usuário Padrão',
            email: 'user01',
            password: 'user123',
            role: 'user',
            department: 'Geral'
        }
    ];

    for (const userData of defaultUsers) {
        try {
            // Verificar se usuário já existe
            const existingUsers = await executeQuery(
                'SELECT id FROM users WHERE email = ?',
                [userData.email]
            );

            if (existingUsers && existingUsers.length > 0) {
                console.log(`⚠️ Usuário ${userData.email} já existe`);
                continue;
            }

            // Hash da senha
            const saltRounds = 12;
            const passwordHash = await bcrypt.hash(userData.password, saltRounds);

            // Preparar query e valores baseado no tipo de banco
            let insertQuery, insertValues;
            const userId = generateId();
            const currentTime = new Date().toISOString();

            if (dbType === 'sqlite') {
                insertQuery = `
                    INSERT INTO users (
                        id, name, email, password_hash, role, department,
                        active, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
                `;
                insertValues = [
                    userId,
                    userData.name,
                    userData.email,
                    passwordHash,
                    userData.role,
                    userData.department,
                    currentTime,
                    currentTime
                ];
            } else {
                // MySQL
                insertQuery = `
                    INSERT INTO users (
                        id, name, email, password_hash, role, department,
                        active, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
                `;
                insertValues = [
                    userId,
                    userData.name,
                    userData.email,
                    passwordHash,
                    userData.role,
                    userData.department
                ];
            }

            await executeQuery(insertQuery, insertValues);

            console.log(`✅ Usuário criado: ${userData.email} (${userData.role})`);
        } catch (error) {
            console.error(`❌ Erro ao criar usuário ${userData.email}:`, error.message);
        }
    }
}

// Executar script se chamado diretamente
if (require.main === module) {
    setupAuthentication();
}

module.exports = {
    setupAuthentication,
    createUsersTable,
    createDefaultUsers
};