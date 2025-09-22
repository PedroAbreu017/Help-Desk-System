// scripts/migrate.js - Migração de dados JSON para MySQL
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function migrateFromJSON() {
    let db;
    
    try {
        console.log('🔄 Iniciando migração de JSON para MySQL...');
        
        // Conectar ao MySQL
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'helpdesk_system',
            charset: 'utf8mb4'
        };
        
        db = await mysql.createConnection(dbConfig);
        console.log('✅ Conectado ao MySQL');
        
        // Caminhos dos arquivos JSON antigos
        const dataDir = path.join(__dirname, '..', 'data');
        const ticketsFile = path.join(dataDir, 'tickets.json');
        const usersFile = path.join(dataDir, 'users.json');
        
        // Verificar se arquivos existem
        let hasOldData = false;
        let ticketsData = [];
        let usersData = [];
        
        try {
            await fs.access(ticketsFile);
            const ticketsContent = await fs.readFile(ticketsFile, 'utf8');
            ticketsData = JSON.parse(ticketsContent);
            hasOldData = true;
            console.log(`📄 ${ticketsData.length} tickets encontrados no JSON`);
        } catch {
            console.log('ℹ️  Arquivo tickets.json não encontrado');
        }
        
        try {
            await fs.access(usersFile);
            const usersContent = await fs.readFile(usersFile, 'utf8');
            usersData = JSON.parse(usersContent);
            console.log(`👥 ${usersData.length} usuários encontrados no JSON`);
        } catch {
            console.log('ℹ️  Arquivo users.json não encontrado');
        }
        
        if (!hasOldData && usersData.length === 0) {
            console.log('ℹ️  Nenhum dado para migrar - será criado banco limpo');
            console.log('✅ Migração concluída (banco limpo)');
            return;
        }
        
        // Verificar se já existem dados no MySQL
        const [existingTickets] = await db.execute('SELECT COUNT(*) as count FROM tickets');
        const [existingUsers] = await db.execute('SELECT COUNT(*) as count FROM users');
        
        const ticketCount = existingTickets[0].count;
        const userCount = existingUsers[0].count;
        
        if (ticketCount > 0 || userCount > 0) {
            console.log('⚠️  ATENÇÃO: Já existem dados no banco MySQL!');
            console.log(`   📋 Tickets existentes: ${ticketCount}`);
            console.log(`   👥 Usuários existentes: ${userCount}`);
            console.log('');
            
            const forceFlag = process.argv.includes('--force');
            if (!forceFlag) {
                console.log('💡 Execute com --force para sobrescrever dados existentes');
                console.log('❌ Migração cancelada para proteger dados existentes');
                return;
            }
            console.log('⚠️  Prosseguindo com --force...');
        }
        
        let migratedUsers = 0;
        let migratedTickets = 0;
        let migratedNotes = 0;
        
        // Migrar usuários
        if (usersData.length > 0) {
            console.log('🔄 Migrando usuários...');
            
            for (const user of usersData) {
                try {
                    const userData = {
                        id: user.id || generateId(),
                        name: user.name || user.nome || 'Usuário Migrado',
                        email: user.email || `user_${Date.now()}@migrated.com`,
                        role: mapUserRole(user.role || user.tipo || 'user'),
                        department: user.department || user.departamento || 'N/A'
                    };
                    
                    await db.execute(`
                        INSERT INTO users (id, name, email, role, department, created_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                        name = VALUES(name),
                        role = VALUES(role),
                        department = VALUES(department)
                    `, [
                        userData.id,
                        userData.name,
                        userData.email,
                        userData.role,
                        userData.department,
                        user.created_at || user.criacao || new Date().toISOString()
                    ]);
                    
                    migratedUsers++;
                    console.log(`   👤 ${userData.name} (${userData.email})`);
                    
                } catch (error) {
                    console.log(`⚠️  Erro ao migrar usuário ${user.email || user.id}:`, error.message);
                }
            }
            
            console.log(`✅ ${migratedUsers} usuários migrados`);
        }
        
        // Migrar tickets
        if (ticketsData.length > 0) {
            console.log('🔄 Migrando tickets...');
            
            for (const [index, ticket] of ticketsData.entries()) {
                try {
                    const ticketData = {
                        id: ticket.id || generateId(),
                        title: ticket.title || ticket.titulo || 'Ticket Migrado',
                        description: ticket.description || ticket.descricao || 'Descrição migrada',
                        category: mapCategory(ticket.category || ticket.categoria || 'sistema'),
                        priority: mapPriority(ticket.priority || ticket.prioridade || 'media'),
                        status: mapStatus(ticket.status || 'aberto'),
                        user_name: ticket.user_name || ticket.usuario || ticket.nome_usuario || 'Usuário Migrado',
                        user_email: ticket.user_email || ticket.email_usuario || ticket.email || 'migrated@empresa.com',
                        department: ticket.department || ticket.departamento || 'N/A',
                        assigned_to: ticket.assigned_to || ticket.atribuido_a || null,
                        solution: ticket.solution || ticket.solucao || null,
                        created_at: ticket.created_at || ticket.criacao || ticket.data_criacao || new Date().toISOString(),
                        updated_at: ticket.updated_at || ticket.atualizacao || ticket.data_atualizacao || new Date().toISOString(),
                        resolved_at: ticket.resolved_at || ticket.resolucao || ticket.data_resolucao || null
                    };
                    
                    // Inserir ticket principal
                    await db.execute(`
                        INSERT INTO tickets (
                            id, title, description, category, priority, status,
                            user_name, user_email, department, assigned_to, solution,
                            created_at, updated_at, resolved_at
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                        title = VALUES(title),
                        description = VALUES(description),
                        status = VALUES(status),
                        updated_at = VALUES(updated_at)
                    `, [
                        ticketData.id,
                        ticketData.title,
                        ticketData.description,
                        ticketData.category,
                        ticketData.priority,
                        ticketData.status,
                        ticketData.user_name,
                        ticketData.user_email,
                        ticketData.department,
                        ticketData.assigned_to,
                        ticketData.solution,
                        ticketData.created_at,
                        ticketData.updated_at,
                        ticketData.resolved_at
                    ]);
                    
                    migratedTickets++;
                    
                    // Migrar notas internas se existirem
                    const notes = ticket.internal_notes || ticket.notas_internas || ticket.notes || [];
                    if (Array.isArray(notes) && notes.length > 0) {
                        for (const note of notes) {
                            try {
                                await db.execute(`
                                    INSERT IGNORE INTO ticket_notes (id, ticket_id, content, author, created_at)
                                    VALUES (?, ?, ?, ?, ?)
                                `, [
                                    note.id || generateId(),
                                    ticketData.id,
                                    note.content || note.conteudo || note.note || note.texto || '',
                                    note.author || note.autor || 'Sistema',
                                    note.created_at || note.criacao || new Date().toISOString()
                                ]);
                                migratedNotes++;
                            } catch (error) {
                                console.log(`⚠️  Erro ao migrar nota do ticket ${ticketData.id}:`, error.message);
                            }
                        }
                    }
                    
                    // Registrar atividade de migração
                    await db.execute(`
                        INSERT INTO activity_logs (id, ticket_id, action, description, user_name, created_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        generateId(),
                        ticketData.id,
                        'migrated',
                        'Ticket migrado do sistema JSON para MySQL',
                        'Sistema',
                        new Date().toISOString()
                    ]);
                    
                    // Progress indicator
                    if ((index + 1) % 10 === 0 || index === ticketsData.length - 1) {
                        console.log(`   📋 ${index + 1}/${ticketsData.length} tickets processados`);
                    }
                    
                } catch (error) {
                    console.log(`⚠️  Erro ao migrar ticket ${ticket.id || index}:`, error.message);
                }
            }
            
            console.log(`✅ ${migratedTickets} tickets migrados`);
            if (migratedNotes > 0) {
                console.log(`✅ ${migratedNotes} notas migradas`);
            }
        }
        
        // Verificar dados migrados
        const [finalTicketCount] = await db.execute('SELECT COUNT(*) as count FROM tickets');
        const [finalUserCount] = await db.execute('SELECT COUNT(*) as count FROM users');
        const [noteCount] = await db.execute('SELECT COUNT(*) as count FROM ticket_notes');
        const [activityCount] = await db.execute('SELECT COUNT(*) as count FROM activity_logs');
        
        console.log('');
        console.log('📊 Resumo da migração:');
        console.log(`   📋 Tickets no banco: ${finalTicketCount[0].count}`);
        console.log(`   👥 Usuários no banco: ${finalUserCount[0].count}`);
        console.log(`   📝 Notas no banco: ${noteCount[0].count}`);
        console.log(`   📊 Atividades registradas: ${activityCount[0].count}`);
        console.log('');
        
        // Fazer backup dos arquivos JSON
        if (hasOldData || usersData.length > 0) {
            await createBackup(ticketsFile, usersFile, ticketsData.length > 0, usersData.length > 0);
        }
        
        console.log('🎉 Migração concluída com sucesso!');
        console.log('');
        console.log('📋 Próximos passos:');
        console.log('1. Execute: npm start');
        console.log('2. Acesse: http://localhost:3000');
        console.log('3. Teste as funcionalidades no novo banco MySQL');
        console.log('4. Execute: npm run validate-migration (para validar)');
        console.log('');

    } catch (error) {
        console.error('💥 Erro durante a migração:', error);
        console.error('');
        console.error('🔧 Possíveis soluções:');
        console.error('1. Verifique as credenciais do MySQL no arquivo .env');
        console.error('2. Certifique-se que o MySQL está rodando');
        console.error('3. Execute: npm run init-data (para criar as tabelas)');
        console.error('4. Verifique se o banco de dados existe');
        console.error('');
        process.exit(1);
    } finally {
        if (db) {
            await db.end();
        }
    }
}

// SQLite migration fallback
async function migrateToSQLite() {
    console.log('🔄 Iniciando migração para SQLite...');
    
    try {
        const sqlite3 = require('sqlite3').verbose();
        const { open } = require('sqlite');
        
        const dataDir = path.join(__dirname, '..', 'data');
        await fs.mkdir(dataDir, { recursive: true });
        
        const db = await open({
            filename: path.join(dataDir, 'helpdesk.db'),
            driver: sqlite3.Database
        });
        
        console.log('✅ Conectado ao SQLite');
        
        // Criar tabelas SQLite se não existirem
        await createSQLiteTables(db);
        
        console.log('✅ Migração SQLite concluída com sucesso!');
        await db.close();
        
    } catch (error) {
        console.error('❌ Erro na migração SQLite:', error.message);
        throw error;
    }
}

// Criar tabelas SQLite
async function createSQLiteTables(db) {
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
        )`
    ];
    
    for (const table of tables) {
        await db.exec(table);
    }
}

// Funções auxiliares
function generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 5);
}

function mapUserRole(oldRole) {
    const roleMap = {
        'admin': 'admin',
        'administrador': 'admin',
        'tecnico': 'technician',
        'technician': 'technician',
        'suporte': 'technician',
        'user': 'user',
        'usuario': 'user',
        'cliente': 'user'
    };
    
    return roleMap[oldRole.toLowerCase()] || 'user';
}

function mapCategory(oldCategory) {
    const categoryMap = {
        'hardware': 'hardware',
        'software': 'software',
        'rede': 'rede',
        'network': 'rede',
        'email': 'email',
        'impressora': 'impressora',
        'printer': 'impressora',
        'sistema': 'sistema',
        'system': 'sistema',
        'acesso': 'acesso',
        'access': 'acesso'
    };
    
    return categoryMap[oldCategory.toLowerCase()] || 'sistema';
}

function mapPriority(oldPriority) {
    const priorityMap = {
        'baixa': 'baixa',
        'low': 'baixa',
        'media': 'media',
        'medium': 'media',
        'normal': 'media',
        'alta': 'alta',
        'high': 'alta',
        'critica': 'critica',
        'critical': 'critica',
        'urgente': 'critica'
    };
    
    return priorityMap[oldPriority.toLowerCase()] || 'media';
}

function mapStatus(oldStatus) {
    const statusMap = {
        'aberto': 'aberto',
        'open': 'aberto',
        'novo': 'aberto',
        'andamento': 'andamento',
        'progress': 'andamento',
        'em_andamento': 'andamento',
        'resolvido': 'resolvido',
        'resolved': 'resolvido',
        'fechado': 'fechado',
        'closed': 'fechado',
        'concluido': 'fechado'
    };
    
    return statusMap[oldStatus.toLowerCase()] || 'aberto';
}

async function createBackup(ticketsFile, usersFile, hasTickets, hasUsers) {
    try {
        const backupDir = path.join(__dirname, '..', 'backups');
        await fs.mkdir(backupDir, { recursive: true });
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        
        if (hasTickets) {
            await fs.copyFile(ticketsFile, path.join(backupDir, `tickets_backup_${timestamp}.json`));
        }
        
        if (hasUsers) {
            await fs.copyFile(usersFile, path.join(backupDir, `users_backup_${timestamp}.json`));
        }
        
        console.log(`💾 Backup dos arquivos JSON salvo em: backups/`);
        console.log('💡 Os arquivos originais foram preservados');
        
    } catch (error) {
        console.log('⚠️  Erro ao fazer backup:', error.message);
    }
}

// Executar migração
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log('📚 Uso do script de migração:');
        console.log('');
        console.log('npm run migrate              # Migração normal');
        console.log('npm run migrate:force        # Forçar sobrescrever dados');
        console.log('npm run migrate:sqlite       # Usar SQLite como destino');
        console.log('');
        process.exit(0);
    }
    
    if (args.includes('--sqlite')) {
        migrateToSQLite();
    } else {
        migrateFromJSON();
    }
}

module.exports = { migrateFromJSON, migrateToSQLite };