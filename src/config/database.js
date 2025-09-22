// src/config/database.js - Configuração de Banco de Dados (CORRIGIDA com dotenv)
require('dotenv').config(); // ADICIONAR ESTA LINHA NO INÍCIO

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

let db = null;
let dbType = null;

// Configuração MySQL (CORRIGIDA - com variáveis de ambiente carregadas)
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

async function initDatabase() {
    try {
        console.log('🔗 Conectando ao MySQL...');
        console.log('🔍 Config:', {
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password ? '***' : 'VAZIA',
            database: dbConfig.database
        });
        
        // Tentar conectar ao MySQL
        await connectMySQL();
        
    } catch (error) {
        console.error('❌ Erro ao conectar MySQL:', error.message);
        
        // Fallback para SQLite em desenvolvimento
        if (process.env.NODE_ENV !== 'production') {
            console.log('🔄 Usando SQLite como fallback...');
            await connectSQLite();
        } else {
            throw error;
        }
    }
}

async function connectMySQL() {
    // Criar conexão inicial para criar database (SEM pool)
    const tempConnection = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        charset: 'utf8mb4'
    });

    // Criar database se não existir
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await tempConnection.end();

    // Criar pool de conexões com configuração limpa
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
    
    // Criar tabelas se necessário
    await createMySQLTables();
}

async function connectSQLite() {
    const sqlite3 = require('sqlite3').verbose();
    const { open } = require('sqlite');
    
    // Criar diretório data
    const dataDir = path.join(__dirname, '../../data');
    await fs.mkdir(dataDir, { recursive: true });
    
    db = await open({
        filename: path.join(dataDir, 'helpdesk.db'),
        driver: sqlite3.Database
    });
    
    dbType = 'sqlite';
    
    console.log('✅ SQLite conectado (fallback)');
    
    // Criar tabelas se necessário
    await createSQLiteTables();
}

async function createMySQLTables() {
    const tables = [
        `CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            role ENUM('admin', 'technician', 'user') DEFAULT 'user',
            department VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_email (email),
            INDEX idx_role (role)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

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

        `CREATE TABLE IF NOT EXISTS ticket_notes (
            id VARCHAR(50) PRIMARY KEY,
            ticket_id VARCHAR(50) NOT NULL,
            content TEXT NOT NULL,
            author VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ticket_id (ticket_id),
            FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

        `CREATE TABLE IF NOT EXISTS ticket_attachments (
            id VARCHAR(50) PRIMARY KEY,
            ticket_id VARCHAR(50) NOT NULL,
            filename VARCHAR(255) NOT NULL,
            original_name VARCHAR(255) NOT NULL,
            file_size INT NOT NULL,
            mime_type VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ticket_id (ticket_id),
            FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

        `CREATE TABLE IF NOT EXISTS knowledge_base_ratings (
            id VARCHAR(50) PRIMARY KEY,
            article_id INT NOT NULL,
            user_id VARCHAR(50) NOT NULL,
            rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_article (article_id, user_id),
            INDEX idx_article_id (article_id),
            INDEX idx_user_id (user_id),
            FOREIGN KEY (article_id) REFERENCES knowledge_base(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    ];

    for (const table of tables) {
        await db.execute(table);
    }
    
    console.log('📋 Tabelas MySQL verificadas/criadas');
}

async function createSQLiteTables() {
    const tables = [
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
            resolved_at DATETIME,
            FOREIGN KEY (assigned_to) REFERENCES users(id)
        )`,

        `CREATE TABLE IF NOT EXISTS ticket_notes (
            id TEXT PRIMARY KEY,
            ticket_id TEXT NOT NULL,
            content TEXT NOT NULL,
            author TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
        )`,

        `CREATE TABLE IF NOT EXISTS activity_logs (
            id TEXT PRIMARY KEY,
            ticket_id TEXT,
            action TEXT NOT NULL,
            description TEXT,
            user_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
        )`,

        `CREATE TABLE IF NOT EXISTS knowledge_base (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            summary TEXT,
            content TEXT NOT NULL,
            category TEXT NOT NULL,
            subcategory TEXT,
            tags TEXT,
            priority TEXT DEFAULT 'media',
            status TEXT DEFAULT 'published',
            views INTEGER DEFAULT 0,
            rating REAL DEFAULT 0.0,
            author_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (author_id) REFERENCES users(id)
        )`,

        `CREATE TABLE IF NOT EXISTS knowledge_base_ratings (
            id TEXT PRIMARY KEY,
            article_id INTEGER NOT NULL,
            user_id TEXT NOT NULL,
            rating INTEGER NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(article_id, user_id),
            FOREIGN KEY (article_id) REFERENCES knowledge_base(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`
    ];

    for (const table of tables) {
        await db.exec(table);
    }
    
    console.log('📋 Tabelas SQLite verificadas/criadas');
}

// Funções de acesso ao banco
function getDatabase() {
    if (!db) {
        throw new Error('Database não inicializado. Execute initDatabase() primeiro.');
    }
    return db;
}

function getDatabaseType() {
    return dbType;
}

// FUNÇÃO EXECUTEQUERY CORRIGIDA
async function executeQuery(query, params = []) {
    const database = getDatabase();
    
    try {
        // Log para debug
        console.log('🔍 ExecuteQuery:', { 
            type: dbType, 
            query: query.substring(0, 100) + '...', 
            paramsCount: params.length,
            paramsTypes: params.map(p => typeof p)
        });

        if (dbType === 'mysql') {
            // Validar parâmetros antes de executar
            if (params && !Array.isArray(params)) {
                throw new Error('Parâmetros devem ser um array');
            }

            // Garantir que todos os parâmetros sejam tipos válidos
            const validParams = params.map(param => {
                if (param === null || param === undefined) return null;
                if (typeof param === 'number') return param;
                if (typeof param === 'boolean') return param ? 1 : 0;
                return String(param); // Converter tudo para string se não for tipo básico
            });

            console.log('📊 Params validados:', validParams);

            const [rows] = await database.execute(query, validParams);
            return rows;
        } else {
            // SQLite
            if (query.toUpperCase().trim().startsWith('SELECT')) {
                return await database.all(query, params);
            } else {
                return await database.run(query, params);
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

// Função auxiliar para queries diretas (sem parâmetros preparados)
async function executeDirectQuery(query) {
    const database = getDatabase();
    
    try {
        console.log('🔍 DirectQuery:', query.substring(0, 100) + '...');

        if (dbType === 'mysql') {
            const [rows] = await database.query(query);
            return rows;
        } else {
            if (query.toUpperCase().trim().startsWith('SELECT')) {
                return await database.all(query);
            } else {
                return await database.run(query);
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

module.exports = {
    initDatabase,
    getDatabase,
    getDatabaseType,
    executeQuery,
    executeDirectQuery,
    closeDatabase
};