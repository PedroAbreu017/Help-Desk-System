// src/config/database.js - Configuração Dual MySQL/SQLite Integrada
require('dotenv').config();

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');

let db = null;
let dbType = null;

// Detectar ambiente e escolher banco
const isDevelopment = process.env.NODE_ENV !== 'production';
const forceMySQL = process.env.USE_MYSQL === 'true';
const forceSQLite = process.env.USE_SQLITE === 'true';

// Configuração MySQL 
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'helpdesk_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: '+00:00',
    acquireTimeout: 60000,
    timeout: 60000,
    multipleStatements: false,
    namedPlaceholders: false,
    ssl: false
};

// Função para adaptar queries entre MySQL e SQLite
function adaptQueryForDatabase(query, targetDbType) {
    if (targetDbType === 'sqlite') {
        return query
            .replace(/NOW\(\)/g, "datetime('now')")
            .replace(/CURRENT_TIMESTAMP/g, "datetime('now')")
            .replace(/INSERT IGNORE/g, "INSERT OR IGNORE")
            .replace(/ON UPDATE CURRENT_TIMESTAMP/g, ""); // SQLite não suporta ON UPDATE
    }
    return query;
}

async function initDatabase() {
    try {
        // Decidir qual banco usar baseado no ambiente
        if (forceSQLite || (!forceMySQL && !isDevelopment)) {
            console.log('🔗 Usando SQLite (produção/deploy)...');
            await connectSQLite();
        } else {
            console.log('🔗 Tentando conectar ao MySQL (desenvolvimento)...');
            console.log('🔍 Config:', {
                host: dbConfig.host,
                user: dbConfig.user,
                password: dbConfig.password ? '***' : 'VAZIA',
                database: dbConfig.database
            });
            
            try {
                await connectMySQL();
            } catch (error) {
                console.error('❌ Erro ao conectar MySQL:', error.message);
                console.log('🔄 Usando SQLite como fallback...');
                await connectSQLite();
            }
        }
        
        // Criar usuário admin se necessário (especialmente importante para SQLite)
        if (dbType === 'sqlite') {
            await createAdminIfNotExists();
        }
        
        return db;
        
    } catch (error) {
        console.error('💥 Erro fatal ao inicializar banco:', error);
        throw error;
    }
}

async function connectMySQL() {
    // Criar conexão inicial para criar database
    const tempConnection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        charset: 'utf8mb4'
    });

    // Criar database se não existir
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await tempConnection.end();

    // Criar pool de conexões
    const poolConfig = {
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        charset: 'utf8mb4',
        timezone: '+00:00',
        multipleStatements: false,
        namedPlaceholders: false
    };

    db = mysql.createPool(poolConfig);
    dbType = 'mysql';
    
    // Testar conexão
    const connection = await db.getConnection();
    connection.release();
    
    console.log('✅ MySQL conectado com sucesso');
    await createMySQLTables();
}

async function connectSQLite() {
    // Criar diretório data
    const dataDir = path.join(__dirname, '../../data');
    await fs.mkdir(dataDir, { recursive: true });
    
    db = await open({
        filename: path.join(dataDir, 'helpdesk.db'),
        driver: sqlite3.Database
    });
    
    dbType = 'sqlite';
    console.log('✅ SQLite conectado com sucesso');
    await createSQLiteTables();
}

async function createMySQLTables() {
    const tables = [
        // Tabela users com autenticação
        `CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255),
            role ENUM('admin', 'technician', 'user') DEFAULT 'user',
            department VARCHAR(100),
            active BOOLEAN DEFAULT true,
            login_attempts INT DEFAULT 0,
            locked_until DATETIME NULL,
            last_login DATETIME NULL,
            refresh_token TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_email (email),
            INDEX idx_role (role),
            INDEX idx_department (department)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

        // Tabela tickets
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
            INDEX idx_created_at (created_at),
            FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

        // Tabela ticket_notes
        `CREATE TABLE IF NOT EXISTS ticket_notes (
            id VARCHAR(50) PRIMARY KEY,
            ticket_id VARCHAR(50) NOT NULL,
            content TEXT NOT NULL,
            author VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ticket_id (ticket_id),
            FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

        // Tabela activity_logs
        `CREATE TABLE IF NOT EXISTS activity_logs (
            id VARCHAR(50) PRIMARY KEY,
            ticket_id VARCHAR(50),
            action VARCHAR(100) NOT NULL,
            description TEXT,
            user_name VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ticket_id (ticket_id),
            FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

        // Tabela knowledge_base
        `CREATE TABLE IF NOT EXISTS knowledge_base (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(500) NOT NULL,
            slug VARCHAR(500) UNIQUE NOT NULL,
            summary TEXT,
            content LONGTEXT NOT NULL,
            category VARCHAR(100) NOT NULL,
            subcategory VARCHAR(100),
            tags TEXT,
            priority ENUM('baixa', 'media', 'alta') DEFAULT 'media',
            status ENUM('draft', 'published', 'archived') DEFAULT 'published',
            views INT DEFAULT 0,
            rating DECIMAL(3,2) DEFAULT 0.00,
            author_id VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_category (category),
            INDEX idx_status (status),
            INDEX idx_slug (slug),
            FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    ];

    for (const table of tables) {
        await db.execute(table);
    }
    
    console.log('📋 Tabelas MySQL verificadas/criadas');
}

async function createSQLiteTables() {
    const tables = [
        // Tabela users
        `CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'technician', 'user')),
            department TEXT,
            active INTEGER DEFAULT 1,
            login_attempts INTEGER DEFAULT 0,
            locked_until DATETIME,
            last_login DATETIME,
            refresh_token TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // Tabela tickets
        `CREATE TABLE IF NOT EXISTS tickets (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL CHECK (category IN ('hardware', 'software', 'rede', 'email', 'impressora', 'sistema', 'acesso')),
            priority TEXT NOT NULL CHECK (priority IN ('baixa', 'media', 'alta', 'critica')),
            status TEXT DEFAULT 'aberto' CHECK (status IN ('aberto', 'andamento', 'resolvido', 'fechado')),
            user_name TEXT NOT NULL,
            user_email TEXT NOT NULL,
            department TEXT NOT NULL,
            assigned_to TEXT,
            solution TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            resolved_at DATETIME,
            FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
        )`,

        // Tabela ticket_notes
        `CREATE TABLE IF NOT EXISTS ticket_notes (
            id TEXT PRIMARY KEY,
            ticket_id TEXT NOT NULL,
            content TEXT NOT NULL,
            author TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
        )`,

        // Tabela activity_logs
        `CREATE TABLE IF NOT EXISTS activity_logs (
            id TEXT PRIMARY KEY,
            ticket_id TEXT,
            action TEXT NOT NULL,
            description TEXT,
            user_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
        )`,

        // Tabela knowledge_base
        `CREATE TABLE IF NOT EXISTS knowledge_base (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            summary TEXT,
            content TEXT NOT NULL,
            category TEXT NOT NULL,
            subcategory TEXT,
            tags TEXT,
            priority TEXT DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta')),
            status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
            views INTEGER DEFAULT 0,
            rating REAL DEFAULT 0.0,
            author_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
        )`
    ];

    // Criar índices para SQLite
    const indices = [
        'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
        'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
        'CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)',
        'CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority)',
        'CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category)',
        'CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category)'
    ];

    for (const table of tables) {
        await db.exec(table);
    }

    for (const index of indices) {
        await db.exec(index);
    }
    
    console.log('📋 Tabelas SQLite verificadas/criadas');
}

// Função para criar admin se não existir (especialmente para SQLite)
async function createAdminIfNotExists() {
    try {
        const existingAdmin = await executeQuery('SELECT id FROM users WHERE role = ?', ['admin']);
        
        if (existingAdmin.length === 0) {
            console.log('👤 Criando usuário admin padrão...');
            
            const hashedPassword = await bcrypt.hash('admin123', 12);
            const adminId = Date.now().toString() + 'admin';
            
            await executeQuery(
                'INSERT INTO users (id, name, email, password_hash, role, department, active) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [adminId, 'Administrador', 'admin@helpdesk.com', hashedPassword, 'admin', 'TI', 1]
            );
            
            console.log('✅ Usuário admin criado:');
            console.log('   Email: admin@helpdesk.com');
            console.log('   Senha: admin123');
            
            // Criar alguns tickets de exemplo
            await createSampleTickets();
        }
    } catch (error) {
        console.error('❌ Erro ao criar admin:', error.message);
    }
}

// Função para criar tickets de exemplo
async function createSampleTickets() {
    try {
        console.log('🎫 Criando tickets de exemplo...');
        
        const sampleTickets = [
            {
                id: 'ticket' + Date.now() + '1',
                title: 'Problema com impressora HP',
                description: 'A impressora da sala 101 não está funcionando. Fica dando erro de papel atolado.',
                status: 'aberto',
                priority: 'media',
                category: 'hardware',
                user_name: 'João Silva',
                user_email: 'joao@empresa.com',
                department: 'Vendas'
            },
            {
                id: 'ticket' + Date.now() + '2',
                title: 'Acesso negado ao sistema',
                description: 'Não consigo acessar o sistema de vendas. Aparece erro de credenciais.',
                status: 'andamento',
                priority: 'alta',
                category: 'sistema',
                user_name: 'Maria Santos',
                user_email: 'maria@empresa.com',
                department: 'Comercial'
            },
            {
                id: 'ticket' + Date.now() + '3',
                title: 'Internet lenta',
                description: 'A conexão com a internet está muito lenta no departamento.',
                status: 'resolvido',
                priority: 'baixa',
                category: 'rede',
                user_name: 'Pedro Costa',
                user_email: 'pedro@empresa.com',
                department: 'Administração'
            }
        ];

        for (const ticket of sampleTickets) {
            await executeQuery(`
                INSERT INTO tickets (id, title, description, status, priority, category, user_name, user_email, department) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                ticket.id, ticket.title, ticket.description, ticket.status, 
                ticket.priority, ticket.category, ticket.user_name, ticket.user_email, ticket.department
            ]);
        }
        
        console.log('✅ Tickets de exemplo criados');
    } catch (error) {
        console.error('❌ Erro ao criar tickets de exemplo:', error.message);
    }
}

// Funções auxiliares
function getDatabase() {
    if (!db) {
        throw new Error('Database não inicializado. Execute initDatabase() primeiro.');
    }
    return db;
}

function getDatabaseType() {
    return dbType;
}

function isMySQL() {
    return dbType === 'mysql';
}

function isSQLite() {
    return dbType === 'sqlite';
}

// FUNÇÃO EXECUTEQUERY MODIFICADA COM ADAPTAÇÃO DE QUERIES
async function executeQuery(query, params = []) {
    const database = getDatabase();
    
    try {
        console.log('🔍 ExecuteQuery:', { 
            type: dbType, 
            query: query.substring(0, 100) + (query.length > 100 ? '...' : ''), 
            paramsCount: params.length,
            paramsTypes: params.map(p => typeof p)
        });

        // ADAPTAR QUERY PARA O TIPO DE BANCO ATUAL
        const adaptedQuery = adaptQueryForDatabase(query, dbType);

        if (dbType === 'mysql') {
            if (params && !Array.isArray(params)) {
                throw new Error('Parâmetros devem ser um array');
            }

            const validParams = params.map(param => {
                if (param === null || param === undefined) return null;
                if (typeof param === 'number') return param;
                if (typeof param === 'boolean') return param ? 1 : 0;
                return String(param);
            });

            console.log('📊 Params validados:', validParams);
            const [rows] = await database.execute(adaptedQuery, validParams);
            return rows;
        } else {
            // SQLite
            if (adaptedQuery.toUpperCase().trim().startsWith('SELECT')) {
                return await database.all(adaptedQuery, params);
            } else {
                const result = await database.run(adaptedQuery, params);
                return { insertId: result.lastID, affectedRows: result.changes };
            }
        }
    } catch (error) {
        console.error('❌ Erro em executeQuery:', {
            error: error.message,
            code: error.code,
            query: query.substring(0, 200),
            params: params,
            dbType: dbType
        });
        throw error;
    }
}

// Função auxiliar para queries diretas
async function executeDirectQuery(query) {
    const database = getDatabase();
    
    try {
        console.log('🔍 DirectQuery:', query.substring(0, 100) + '...');

        // ADAPTAR QUERY DIRETA TAMBÉM
        const adaptedQuery = adaptQueryForDatabase(query, dbType);

        if (dbType === 'mysql') {
            const [rows] = await database.query(adaptedQuery);
            return rows;
        } else {
            if (adaptedQuery.toUpperCase().trim().startsWith('SELECT')) {
                return await database.all(adaptedQuery);
            } else {
                return await database.run(adaptedQuery);
            }
        }
    } catch (error) {
        console.error('❌ Erro em executeDirectQuery:', error.message);
        throw error;
    }
}

async function closeDatabase() {
    if (db) {
        if (dbType === 'mysql' && typeof db.end === 'function') {
            await db.end();
        } else if (dbType === 'sqlite' && typeof db.close === 'function') {
            await db.close();
        }
        console.log('💾 Conexão com banco encerrada');
        db = null;
        dbType = null;
    }
}

// Seed inicial para testes - MODIFICADO PARA EVITAR DUPLICAÇÃO
async function seedDatabase() {
    console.log('🌱 Inserindo dados de teste...');
    
    try {
        const adminId = 'admin-' + Date.now();
        const adminPassword = await bcrypt.hash('admin123', 10);
        
        // Verificar se já existe admin
        const existingAdmin = await executeQuery('SELECT id FROM users WHERE role = ?', ['admin']);
        
        if (existingAdmin.length === 0) {
            // Inserir admin usando a sintaxe correta para cada banco
            if (isMySQL()) {
                await executeQuery(`
                    INSERT IGNORE INTO users (id, name, email, password_hash, role, department)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [adminId, 'Administrador', 'admin', adminPassword, 'admin', 'TI']);
            } else {
                await executeQuery(`
                    INSERT OR IGNORE INTO users (id, name, email, password_hash, role, department)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [adminId, 'Administrador', 'admin', adminPassword, 'admin', 'TI']);
            }
            
            console.log('✅ Dados de teste inseridos');
        } else {
            console.log('ℹ️ Admin já existe, pulando seed');
        }
        
    } catch (error) {
        console.log('⚠️ Erro ao inserir dados (pode ser normal se já existirem):', error.message);
    }
}

module.exports = {
    initDatabase,
    getDatabase,
    getDatabaseType,
    executeQuery,
    executeDirectQuery,
    closeDatabase,
    seedDatabase,
    createAdminIfNotExists,
    isMySQL,
    isSQLite
};