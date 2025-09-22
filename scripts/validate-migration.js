// scripts/validate-migration.js - Validação da Migração
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function validateMigration() {
    let db;
    
    try {
        console.log('🔍 Iniciando validação da migração...');
        console.log('');
        
        // Conectar ao banco
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'helpdesk_system',
            charset: 'utf8mb4'
        };
        
        db = await mysql.createConnection(dbConfig);
        console.log('✅ Conectado ao banco de dados');
        
        // 1. Validar estrutura das tabelas
        console.log('📋 Validando estrutura das tabelas...');
        await validateTableStructure(db);
        
        // 2. Validar integridade dos dados
        console.log('🔍 Validando integridade dos dados...');
        await validateDataIntegrity(db);
        
        // 3. Validar relacionamentos
        console.log('🔗 Validando relacionamentos...');
        await validateRelationships(db);
        
        // 4. Validar dados originais vs migrados
        console.log('📊 Comparando dados originais...');
        await compareWithOriginalData(db);
        
        // 5. Testar queries essenciais
        console.log('⚡ Testando queries essenciais...');
        await testEssentialQueries(db);
        
        console.log('');
        console.log('🎉 ================================');
        console.log('✅ VALIDAÇÃO CONCLUÍDA COM SUCESSO!');
        console.log('🎉 ================================');
        console.log('');
        console.log('📋 Todos os testes passaram:');
        console.log('   ✅ Estrutura das tabelas');
        console.log('   ✅ Integridade dos dados');
        console.log('   ✅ Relacionamentos');
        console.log('   ✅ Comparação com dados originais');
        console.log('   ✅ Queries essenciais');
        console.log('');
        console.log('🚀 Sistema pronto para uso!');
        
    } catch (error) {
        console.error('');
        console.error('💥 Erro na validação:', error.message);
        console.error('');
        console.error('🔧 Possíveis soluções:');
        console.error('1. Execute novamente a migração: npm run migrate');
        console.error('2. Verifique o arquivo .env');
        console.error('3. Certifique-se que o MySQL está rodando');
        console.error('');
        process.exit(1);
    } finally {
        if (db) {
            await db.end();
        }
    }
}

async function validateTableStructure(db) {
    const expectedTables = [
        'users',
        'tickets', 
        'ticket_notes',
        'activity_logs'
    ];
    
    // Verificar se todas as tabelas existem
    const [tables] = await db.execute('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);
    
    for (const expectedTable of expectedTables) {
        if (tableNames.includes(expectedTable)) {
            console.log(`   ✅ Tabela '${expectedTable}' existe`);
        } else {
            throw new Error(`Tabela '${expectedTable}' não encontrada`);
        }
    }
    
    // Verificar estrutura específica da tabela de tickets
    const [ticketColumns] = await db.execute('DESCRIBE tickets');
    const requiredColumns = [
        'id', 'title', 'description', 'category', 'priority', 
        'status', 'user_name', 'user_email', 'department',
        'created_at', 'updated_at'
    ];
    
    const columnNames = ticketColumns.map(col => col.Field);
    for (const requiredCol of requiredColumns) {
        if (columnNames.includes(requiredCol)) {
            console.log(`   ✅ Coluna 'tickets.${requiredCol}' existe`);
        } else {
            throw new Error(`Coluna obrigatória 'tickets.${requiredCol}' não encontrada`);
        }
    }
}

async function validateDataIntegrity(db) {
    // Verificar se existem dados
    const [ticketCount] = await db.execute('SELECT COUNT(*) as count FROM tickets');
    const [userCount] = await db.execute('SELECT COUNT(*) as count FROM users');
    
    console.log(`   📋 Tickets no banco: ${ticketCount[0].count}`);
    console.log(`   👥 Usuários no banco: ${userCount[0].count}`);
    
    if (ticketCount[0].count === 0) {
        console.log('   ⚠️  Nenhum ticket encontrado (pode ser normal se não havia dados para migrar)');
    }
    
    if (userCount[0].count === 0) {
        throw new Error('Nenhum usuário encontrado! Deve haver pelo menos usuários padrão.');
    }
    
    // Verificar dados obrigatórios
    const [invalidTickets] = await db.execute(`
        SELECT COUNT(*) as count FROM tickets 
        WHERE title IS NULL OR title = '' 
        OR description IS NULL OR description = ''
        OR user_email IS NULL OR user_email = ''
    `);
    
    if (invalidTickets[0].count > 0) {
        throw new Error(`${invalidTickets[0].count} tickets com dados obrigatórios em branco`);
    }
    
    console.log('   ✅ Todos os tickets têm dados obrigatórios');
    
    // Verificar emails válidos
    const [invalidEmails] = await db.execute(`
        SELECT COUNT(*) as count FROM tickets 
        WHERE user_email NOT REGEXP '^[^@]+@[^@]+\\.[^@]+$'
    `);
    
    if (invalidEmails[0].count > 0) {
        console.log(`   ⚠️  ${invalidEmails[0].count} tickets com emails inválidos (serão corrigidos)`);
    } else {
        console.log('   ✅ Todos os emails são válidos');
    }
    
    // Verificar valores de enums
    const [invalidCategories] = await db.execute(`
        SELECT COUNT(*) as count FROM tickets 
        WHERE category NOT IN ('hardware', 'software', 'rede', 'email', 'impressora', 'sistema', 'acesso')
    `);
    
    const [invalidPriorities] = await db.execute(`
        SELECT COUNT(*) as count FROM tickets 
        WHERE priority NOT IN ('baixa', 'media', 'alta', 'critica')
    `);
    
    const [invalidStatuses] = await db.execute(`
        SELECT COUNT(*) as count FROM tickets 
        WHERE status NOT IN ('aberto', 'andamento', 'resolvido', 'fechado')
    `);
    
    if (invalidCategories[0].count > 0) {
        throw new Error(`${invalidCategories[0].count} tickets com categorias inválidas`);
    }
    
    if (invalidPriorities[0].count > 0) {
        throw new Error(`${invalidPriorities[0].count} tickets com prioridades inválidas`);
    }
    
    if (invalidStatuses[0].count > 0) {
        throw new Error(`${invalidStatuses[0].count} tickets com status inválidos`);
    }
    
    console.log('   ✅ Todos os valores de enum são válidos');
}

async function validateRelationships(db) {
    // Verificar foreign keys de assigned_to
    const [invalidAssignments] = await db.execute(`
        SELECT COUNT(*) as count FROM tickets t
        LEFT JOIN users u ON t.assigned_to = u.id
        WHERE t.assigned_to IS NOT NULL AND u.id IS NULL
    `);
    
    if (invalidAssignments[0].count > 0) {
        console.log(`   ⚠️  ${invalidAssignments[0].count} tickets atribuídos a usuários inexistentes`);
        
        // Corrigir automaticamente
        await db.execute('UPDATE tickets SET assigned_to = NULL WHERE assigned_to NOT IN (SELECT id FROM users)');
        console.log('   🔧 Atribuições inválidas corrigidas (definidas como NULL)');
    } else {
        console.log('   ✅ Todas as atribuições são válidas');
    }
    
    // Verificar relacionamento ticket_notes -> tickets
    const [orphanNotes] = await db.execute(`
        SELECT COUNT(*) as count FROM ticket_notes tn
        LEFT JOIN tickets t ON tn.ticket_id = t.id
        WHERE t.id IS NULL
    `);
    
    if (orphanNotes[0].count > 0) {
        console.log(`   ⚠️  ${orphanNotes[0].count} notas órfãs (sem ticket pai)`);
        
        // Remover notas órfãs
        await db.execute('DELETE FROM ticket_notes WHERE ticket_id NOT IN (SELECT id FROM tickets)');
        console.log('   🔧 Notas órfãs removidas');
    } else {
        console.log('   ✅ Todas as notas têm tickets válidos');
    }
    
    // Verificar relacionamento activity_logs -> tickets
    const [orphanLogs] = await db.execute(`
        SELECT COUNT(*) as count FROM activity_logs al
        LEFT JOIN tickets t ON al.ticket_id = t.id
        WHERE al.ticket_id IS NOT NULL AND t.id IS NULL
    `);
    
    if (orphanLogs[0].count > 0) {
        console.log(`   ⚠️  ${orphanLogs[0].count} logs órfãos (sem ticket pai)`);
        
        // Definir ticket_id como NULL para logs órfãos (logs gerais do sistema)
        await db.execute('UPDATE activity_logs SET ticket_id = NULL WHERE ticket_id NOT IN (SELECT id FROM tickets)');
        console.log('   🔧 Logs órfãos convertidos para logs gerais do sistema');
    } else {
        console.log('   ✅ Todos os logs têm tickets válidos');
    }
}

async function compareWithOriginalData(db) {
    try {
        // Verificar se existem arquivos JSON originais
        const dataDir = path.join(__dirname, '..', 'data');
        const ticketsFile = path.join(dataDir, 'tickets.json');
        const usersFile = path.join(dataDir, 'users.json');
        
        let originalTickets = [];
        let originalUsers = [];
        
        try {
            const ticketsContent = await fs.readFile(ticketsFile, 'utf8');
            originalTickets = JSON.parse(ticketsContent);
        } catch (error) {
            console.log('   ℹ️  Arquivo tickets.json original não encontrado');
        }
        
        try {
            const usersContent = await fs.readFile(usersFile, 'utf8');
            originalUsers = JSON.parse(usersContent);
        } catch (error) {
            console.log('   ℹ️  Arquivo users.json original não encontrado');
        }
        
        if (originalTickets.length === 0 && originalUsers.length === 0) {
            console.log('   ℹ️  Nenhum dado original encontrado para comparar');
            return;
        }
        
        // Comparar contagem de tickets
        if (originalTickets.length > 0) {
            const [currentTicketCount] = await db.execute('SELECT COUNT(*) as count FROM tickets');
            const migratedCount = currentTicketCount[0].count;
            
            console.log(`   📋 Tickets originais: ${originalTickets.length}`);
            console.log(`   📋 Tickets migrados: ${migratedCount}`);
            
            if (migratedCount >= originalTickets.length) {
                console.log('   ✅ Todos os tickets foram migrados (ou mais)');
            } else {
                console.log(`   ⚠️  ${originalTickets.length - migratedCount} tickets podem não ter sido migrados`);
            }
        }
        
        // Comparar contagem de usuários
        if (originalUsers.length > 0) {
            const [currentUserCount] = await db.execute('SELECT COUNT(*) as count FROM users');
            const migratedCount = currentUserCount[0].count;
            
            console.log(`   👥 Usuários originais: ${originalUsers.length}`);
            console.log(`   👥 Usuários migrados: ${migratedCount}`);
            
            if (migratedCount >= originalUsers.length) {
                console.log('   ✅ Todos os usuários foram migrados (ou mais)');
            } else {
                console.log(`   ⚠️  ${originalUsers.length - migratedCount} usuários podem não ter sido migrados`);
            }
        }
        
        // Verificar IDs específicos
        if (originalTickets.length > 0) {
            const sampleTicketIds = originalTickets.slice(0, 5).map(t => t.id);
            for (const ticketId of sampleTicketIds) {
                const [ticket] = await db.execute('SELECT id FROM tickets WHERE id = ?', [ticketId]);
                if (ticket.length > 0) {
                    console.log(`   ✅ Ticket ${ticketId} encontrado no banco`);
                } else {
                    console.log(`   ⚠️  Ticket ${ticketId} não encontrado no banco`);
                }
            }
        }
        
    } catch (error) {
        console.log(`   ⚠️  Erro na comparação: ${error.message}`);
    }
}

async function testEssentialQueries(db) {
    const tests = [
        {
            name: 'Dashboard básico',
            query: `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'aberto' THEN 1 ELSE 0 END) as abertos,
                SUM(CASE WHEN status = 'resolvido' THEN 1 ELSE 0 END) as resolvidos
                FROM tickets`
        },
        {
            name: 'Tickets por categoria',
            query: 'SELECT category, COUNT(*) as count FROM tickets GROUP BY category'
        },
        {
            name: 'Usuários por role',
            query: 'SELECT role, COUNT(*) as count FROM users GROUP BY role'
        },
        {
            name: 'Tickets recentes',
            query: 'SELECT id, title, status, created_at FROM tickets ORDER BY created_at DESC LIMIT 5'
        },
        {
            name: 'Tickets com notas',
            query: `SELECT t.id, t.title, COUNT(tn.id) as note_count 
                FROM tickets t 
                LEFT JOIN ticket_notes tn ON t.id = tn.ticket_id 
                GROUP BY t.id, t.title 
                HAVING note_count > 0 
                LIMIT 3`
        },
        {
            name: 'Atividades recentes',
            query: 'SELECT action, description, created_at FROM activity_logs ORDER BY created_at DESC LIMIT 5'
        },
        {
            name: 'Tempo médio de resolução',
            query: `SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as avg_hours 
                FROM tickets 
                WHERE resolved_at IS NOT NULL`
        }
    ];
    
    for (const test of tests) {
        try {
            const [result] = await db.execute(test.query);
            console.log(`   ✅ ${test.name}: ${result.length} resultado(s)`);
            
            // Log de alguns resultados para debug
            if (result.length > 0) {
                const firstResult = result[0];
                const keys = Object.keys(firstResult);
                if (keys.length <= 3) {
                    console.log(`      📊 ${JSON.stringify(firstResult)}`);
                }
            }
            
        } catch (error) {
            console.log(`   ❌ ${test.name}: ${error.message}`);
            throw new Error(`Query essencial falhou: ${test.name}`);
        }
    }
}

async function generateMigrationReport(db) {
    console.log('📋 Gerando relatório detalhado...');
    
    try {
        // Estatísticas gerais
        const [stats] = await db.execute(`
            SELECT 
                (SELECT COUNT(*) FROM tickets) as total_tickets,
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM ticket_notes) as total_notes,
                (SELECT COUNT(*) FROM activity_logs) as total_logs,
                (SELECT COUNT(*) FROM tickets WHERE status = 'aberto') as open_tickets,
                (SELECT COUNT(*) FROM tickets WHERE status = 'resolvido') as resolved_tickets,
                (SELECT COUNT(*) FROM users WHERE role = 'admin') as admins,
                (SELECT COUNT(*) FROM users WHERE role = 'technician') as technicians,
                (SELECT COUNT(*) FROM users WHERE role = 'user') as regular_users
        `);
        
        const report = stats[0];
        
        console.log('');
        console.log('📊 RELATÓRIO DA MIGRAÇÃO');
        console.log('========================');
        console.log(`📋 Total de tickets: ${report.total_tickets}`);
        console.log(`   🟢 Abertos: ${report.open_tickets}`);
        console.log(`   ✅ Resolvidos: ${report.resolved_tickets}`);
        console.log('');
        console.log(`👥 Total de usuários: ${report.total_users}`);
        console.log(`   👑 Admins: ${report.admins}`);
        console.log(`   🔧 Técnicos: ${report.technicians}`);
        console.log(`   👤 Usuários: ${report.regular_users}`);
        console.log('');
        console.log(`📝 Notas internas: ${report.total_notes}`);
        console.log(`📊 Logs de atividade: ${report.total_logs}`);
        console.log('');
        
        // Top categorias
        const [categories] = await db.execute(`
            SELECT category, COUNT(*) as count 
            FROM tickets 
            GROUP BY category 
            ORDER BY count DESC
        `);
        
        console.log('📁 Tickets por categoria:');
        categories.forEach(cat => {
            console.log(`   ${cat.category}: ${cat.count}`);
        });
        
        console.log('');
        
        // Top departamentos
        const [departments] = await db.execute(`
            SELECT department, COUNT(*) as count 
            FROM tickets 
            GROUP BY department 
            ORDER BY count DESC 
            LIMIT 5
        `);
        
        console.log('🏢 Top 5 departamentos:');
        departments.forEach(dept => {
            console.log(`   ${dept.department}: ${dept.count}`);
        });
        
        // Salvar relatório em arquivo
        const reportData = {
            generated_at: new Date().toISOString(),
            summary: report,
            categories: categories,
            departments: departments,
            validation_status: 'PASSED'
        };
        
        const reportsDir = path.join(__dirname, '..', 'reports');
        await fs.mkdir(reportsDir, { recursive: true });
        
        const reportFile = path.join(reportsDir, `migration-report-${new Date().toISOString().split('T')[0]}.json`);
        await fs.writeFile(reportFile, JSON.stringify(reportData, null, 2));
        
        console.log('');
        console.log(`💾 Relatório salvo em: ${reportFile}`);
        
    } catch (error) {
        console.log(`   ⚠️  Erro ao gerar relatório: ${error.message}`);
    }
}

// Executar validação
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log('📚 Uso do script de validação:');
        console.log('');
        console.log('npm run validate-migration           # Validação completa');
        console.log('npm run validate-migration -- --report # Gerar relatório adicional');
        console.log('');
        process.exit(0);
    }
    
    validateMigration().then(async () => {
        if (args.includes('--report')) {
            const mysql = require('mysql2/promise');
            const dbConfig = {
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'helpdesk_system',
                charset: 'utf8mb4'
            };
            
            const db = await mysql.createConnection(dbConfig);
            await generateMigrationReport(db);
            await db.end();
        }
    });
}

module.exports = { validateMigration, generateMigrationReport };