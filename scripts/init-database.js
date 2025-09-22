// scripts/init-database.js - Inicialização e Setup do Banco de Dados
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function initializeDatabase() {
    let connection;
    let db;
    
    try {
        console.log('🚀 Inicializando Help Desk Database...');
        console.log('');
        
        // Configurações do banco
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            charset: 'utf8mb4'
        };
        
        const databaseName = process.env.DB_NAME || 'helpdesk_system';
        
        console.log(`🔗 Conectando ao MySQL em ${dbConfig.host}...`);
        
        // Conectar sem especificar database
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conectado ao MySQL');
        
        // Criar database se não existir
        console.log(`📊 Criando database '${databaseName}'...`);
        await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log('✅ Database criado/verificado');
        
        // Conectar ao database específico
        await connection.end();
        db = await mysql.createConnection({
            ...dbConfig,
            database: databaseName
        });
        
        console.log('🏗️  Criando tabelas...');
        
        // Criar tabelas
        await createTables(db);
        
        console.log('🌱 Inserindo dados iniciais...');
        
        // Inserir dados iniciais
        await seedInitialData(db);
        
        console.log('');
        console.log('🎉 ================================');
        console.log('✅ DATABASE INICIALIZADO COM SUCESSO!');
        console.log('🎉 ================================');
        console.log('');
        console.log('📊 Informações do banco:');
        console.log(`   🏠 Host: ${dbConfig.host}`);
        console.log(`   📚 Database: ${databaseName}`);
        console.log(`   👤 Usuário: ${dbConfig.user}`);
        console.log('');
        console.log('📋 Tabelas criadas:');
        console.log('   👥 users - Usuários do sistema');
        console.log('   🎫 tickets - Tickets de suporte');
        console.log('   📝 ticket_notes - Notas internas');
        console.log('   📎 ticket_attachments - Anexos');
        console.log('   📊 activity_logs - Log de atividades');
        console.log('');
        console.log('🚀 Para iniciar o servidor:');
        console.log('   npm start');
        console.log('');
        console.log('🌐 Acesse: http://localhost:3000');
        
    } catch (error) {
        console.error('💥 Erro durante a inicialização:', error);
        
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('');
            console.error('❌ Erro de acesso negado!');
            console.error('💡 Verifique suas credenciais no arquivo .env:');
            console.error('   DB_HOST=localhost');
            console.error('   DB_USER=seu_usuario');
            console.error('   DB_PASSWORD=sua_senha');
            console.error('');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('');
            console.error('❌ Conexão recusada!');
            console.error('💡 Certifique-se que o MySQL está rodando');
            console.error('💡 Para instalar MySQL:');
            console.error('   - Windows: https://dev.mysql.com/downloads/installer/');
            console.error('   - macOS: brew install mysql');
            console.error('   - Ubuntu: sudo apt install mysql-server');
            console.error('');
        }
        
        console.error('🔄 Tentando criar fallback SQLite...');
        await createSQLiteFallback();
        
    } finally {
        if (db) await db.end();
        if (connection) await connection.end();
    }
}

async function createTables(db) {
    const tables = [
        // Tabela de usuários
        `CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            role ENUM('admin', 'technician', 'user') DEFAULT 'user',
            department VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_email (email),
            INDEX idx_role (role),
            INDEX idx_department (department)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

        // Tabela de tickets
        `CREATE TABLE IF NOT EXISTS tickets (
            id VARCHAR(50) PRIMARY KEY,
            title VARCHAR(500) NOT NULL,
            description TEXT NOT NULL,
            category ENUM('hardware', 'software', 'rede', 'email', 'impressora', 'sistema', 'acesso') NOT NULL,
            priority ENUM('baixa', 'media', 'alta', 'critica') NOT NULL,
            status ENUM('aberto', 'andamento', 'resolvido', 'fechado') DEFAULT 'aberto',
            user_name VARCHAR(255) NOT NULL,
            user_email VARCHAR(255) NOT NULL,
            department VARCHAR(100) NOT NULL,
            assigned_to VARCHAR(50) NULL,
            solution TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            resolved_at TIMESTAMP NULL,
            INDEX idx_status (status),
            INDEX idx_priority (priority),
            INDEX idx_category (category),
            INDEX idx_user_email (user_email),
            INDEX idx_department (department),
            INDEX idx_created_at (created_at),
            INDEX idx_assigned_to (assigned_to),
            FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

        // Tabela de notas internas
        `CREATE TABLE IF NOT EXISTS ticket_notes (
            id VARCHAR(50) PRIMARY KEY,
            ticket_id VARCHAR(50) NOT NULL,
            content TEXT NOT NULL,
            author VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ticket_id (ticket_id),
            INDEX idx_created_at (created_at),
            FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

        // Tabela de anexos
        `CREATE TABLE IF NOT EXISTS ticket_attachments (
            id VARCHAR(50) PRIMARY KEY,
            ticket_id VARCHAR(50) NOT NULL,
            filename VARCHAR(255) NOT NULL,
            original_name VARCHAR(255) NOT NULL,
            file_size INT NOT NULL,
            mime_type VARCHAR(100) NOT NULL,
            uploaded_by VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ticket_id (ticket_id),
            INDEX idx_created_at (created_at),
            FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

        // Tabela de log de atividades
        `CREATE TABLE IF NOT EXISTS activity_logs (
            id VARCHAR(50) PRIMARY KEY,
            ticket_id VARCHAR(50),
            action VARCHAR(100) NOT NULL,
            description TEXT,
            user_name VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ticket_id (ticket_id),
            INDEX idx_action (action),
            INDEX idx_created_at (created_at),
            INDEX idx_user_name (user_name),
            FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    ];

    for (const [index, table] of tables.entries()) {
        try {
            await db.execute(table);
            const tableName = table.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
            console.log(`   ✅ ${index + 1}/5 - Tabela '${tableName}' criada`);
        } catch (error) {
            console.error(`   ❌ Erro ao criar tabela:`, error.message);
            throw error;
        }
    }
}

async function seedInitialData(db) {
    try {
        // Verificar se já existem dados
        const [userCount] = await db.execute('SELECT COUNT(*) as count FROM users');
        
        if (userCount[0].count > 0) {
            console.log('   ℹ️  Dados já existem, pulando seed inicial');
            return;
        }

        const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 5);
        
        // Usuários iniciais
        const initialUsers = [
            {
                id: generateId(),
                name: 'Administrador',
                email: 'admin@empresa.com',
                role: 'admin',
                department: 'TI'
            },
            {
                id: generateId(),
                name: 'Suporte Técnico',
                email: 'suporte@empresa.com',
                role: 'technician',
                department: 'TI'
            },
            {
                id: generateId(),
                name: 'João Silva',
                email: 'joao.silva@empresa.com',
                role: 'user',
                department: 'Vendas'
            },
            {
                id: generateId(),
                name: 'Maria Santos',
                email: 'maria.santos@empresa.com',
                role: 'user',
                department: 'Financeiro'
            }
        ];

        // Inserir usuários
        for (const user of initialUsers) {
            await db.execute(
                'INSERT INTO users (id, name, email, role, department) VALUES (?, ?, ?, ?, ?)',
                [user.id, user.name, user.email, user.role, user.department]
            );
            console.log(`   👤 Usuário criado: ${user.name} (${user.role})`);
        }

        // Tickets de exemplo
        const sampleTickets = [
            {
                id: generateId(),
                title: 'Computador não liga',
                description: 'O computador da estação 15 não está ligando. Já verifiquei a tomada e o cabo de força.',
                category: 'hardware',
                priority: 'alta',
                status: 'aberto',
                user_name: 'João Silva',
                user_email: 'joao.silva@empresa.com',
                department: 'Vendas'
            },
            {
                id: generateId(),
                title: 'Erro no sistema de vendas',
                description: 'O sistema apresenta erro ao tentar finalizar uma venda. Mensagem: "Erro de conexão com banco".',
                category: 'software',
                priority: 'critica',
                status: 'andamento',
                user_name: 'Maria Santos',
                user_email: 'maria.santos@empresa.com',
                department: 'Financeiro',
                assigned_to: initialUsers[1].id // Suporte Técnico
            }
        ];

        // Inserir tickets de exemplo
        for (const ticket of sampleTickets) {
            await db.execute(`
                INSERT INTO tickets (
                    id, title, description, category, priority, status,
                    user_name, user_email, department, assigned_to
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                ticket.id, ticket.title, ticket.description, ticket.category,
                ticket.priority, ticket.status, ticket.user_name, 
                ticket.user_email, ticket.department, ticket.assigned_to || null
            ]);

            console.log(`   🎫 Ticket criado: ${ticket.title} (${ticket.priority})`);

            // Adicionar log de atividade
            await db.execute(`
                INSERT INTO activity_logs (id, ticket_id, action, description, user_name)
                VALUES (?, ?, ?, ?, ?)
            `, [
                generateId(),
                ticket.id,
                'created',
                `Ticket criado durante inicialização do sistema`,
                'Sistema'
            ]);
        }

        console.log('   ✅ Dados iniciais inseridos com sucesso');

    } catch (error) {
        console.error('   ❌ Erro ao inserir dados iniciais:', error.message);
        throw error;
    }
}

async function createSQLiteFallback() {
    try {
        console.log('🔄 Criando banco SQLite como fallback...');
        
        const sqlite3 = require('sqlite3').verbose();
        const { open } = require('sqlite');
        
        // Criar diretório data
        const dataDir = path.join(__dirname, '..', 'data');
        await fs.mkdir(dataDir, { recursive: true });
        
        const db = await open({
            filename: path.join(dataDir, 'helpdesk.db'),
            driver: sqlite3.Database
        });
        
        // Criar tabelas SQLite (versão simplificada)
        const sqliteTables = [
            `CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                role TEXT DEFAULT 'user',
                department TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS tickets (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                category TEXT NOT NULL,
                priority TEXT NOT NULL,
                status TEXT DEFAULT 'aberto',
                user_name TEXT NOT NULL,
                user_email TEXT NOT NULL,
                department TEXT NOT NULL,
                assigned_to TEXT,
                solution TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                resolved_at DATETIME
            )`
        ];
        
        for (const table of sqliteTables) {
            await db.exec(table);
        }
        
        await db.close();
        
        console.log('✅ SQLite criado como fallback em data/helpdesk.db');
        console.log('💡 O sistema usará SQLite automaticamente se MySQL não estiver disponível');
        
    } catch (error) {
        console.error('❌ Erro ao criar SQLite fallback:', error.message);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    initializeDatabase();
}

module.exports = { initializeDatabase };