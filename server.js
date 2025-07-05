// server.js - Servidor principal do Help Desk System
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const TICKETS_FILE = path.join(DATA_DIR, 'tickets.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Middleware de segurança e logs
app.use(helmet({
    contentSecurityPolicy: false, // Desabilitar para desenvolvimento
    crossOriginEmbedderPolicy: false
}));
app.use(morgan('combined'));
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos
app.use(express.static('public'));

// Middleware de logging personalizado
app.use((req, res, next) => {
    console.log(`📡 ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Utilitários
const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 5);
const getCurrentTimestamp = () => new Date().toISOString();

// Inicializar diretórios e arquivos de dados
async function initializeDataFiles() {
    try {
        // Criar diretório data se não existir
        await fs.mkdir(DATA_DIR, { recursive: true });
        console.log('📁 Diretório data verificado/criado');

        // Inicializar arquivo de tickets
        try {
            await fs.access(TICKETS_FILE);
            console.log('✅ Arquivo tickets.json encontrado');
        } catch {
            await fs.writeFile(TICKETS_FILE, JSON.stringify([], null, 2));
            console.log('📄 Arquivo tickets.json criado');
        }

        // Inicializar arquivo de usuários
        try {
            await fs.access(USERS_FILE);
            console.log('✅ Arquivo users.json encontrado');
        } catch {
            const defaultUsers = [
                {
                    id: '1',
                    name: 'Suporte TI',
                    email: 'suporte@empresa.com',
                    role: 'technician',
                    department: 'TI',
                    created_at: getCurrentTimestamp()
                },
                {
                    id: '2',
                    name: 'Admin Sistema',
                    email: 'admin@empresa.com',
                    role: 'admin',
                    department: 'TI',
                    created_at: getCurrentTimestamp()
                }
            ];
            await fs.writeFile(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
            console.log('👥 Arquivo users.json criado com usuários padrão');
        }

        console.log('🎉 Inicialização de dados concluída com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao inicializar arquivos de dados:', error);
        process.exit(1);
    }
}

// Funções para manipular dados
async function readTickets() {
    try {
        const data = await fs.readFile(TICKETS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Erro ao ler tickets:', error);
        return [];
    }
}

async function writeTickets(tickets) {
    try {
        await fs.writeFile(TICKETS_FILE, JSON.stringify(tickets, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar tickets:', error);
        return false;
    }
}

async function readUsers() {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Erro ao ler usuários:', error);
        return [];
    }
}

// Middleware de validação para tickets
const validateTicket = (req, res, next) => {
    const { title, description, category, priority, user_name, user_email, department } = req.body;
    
    // Campos obrigatórios
    const requiredFields = {
        title: 'Título',
        description: 'Descrição',
        category: 'Categoria',
        priority: 'Prioridade',
        user_name: 'Nome do usuário',
        user_email: 'Email do usuário',
        department: 'Departamento'
    };

    // Verificar campos obrigatórios
    for (const [field, label] of Object.entries(requiredFields)) {
        if (!req.body[field] || req.body[field].trim() === '') {
            return res.status(400).json({
                success: false,
                message: `Campo obrigatório: ${label}`,
                field: field
            });
        }
    }

    // Validar valores específicos
    const validPriorities = ['baixa', 'media', 'alta', 'critica'];
    const validCategories = ['hardware', 'software', 'rede', 'email', 'impressora', 'sistema', 'acesso'];
    const validDepartments = ['Administração', 'Financeiro', 'Vendas', 'Marketing', 'Produção', 'TI', 'RH'];

    if (!validPriorities.includes(priority)) {
        return res.status(400).json({
            success: false,
            message: 'Prioridade inválida. Use: baixa, media, alta ou critica',
            valid_values: validPriorities
        });
    }

    if (!validCategories.includes(category)) {
        return res.status(400).json({
            success: false,
            message: 'Categoria inválida',
            valid_values: validCategories
        });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user_email)) {
        return res.status(400).json({
            success: false,
            message: 'Email inválido'
        });
    }

    // Validar tamanhos
    if (title.length < 5) {
        return res.status(400).json({
            success: false,
            message: 'Título deve ter pelo menos 5 caracteres'
        });
    }

    if (description.length < 10) {
        return res.status(400).json({
            success: false,
            message: 'Descrição deve ter pelo menos 10 caracteres'
        });
    }

    next();
};

// ROTAS DA API

// Health Check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Help Desk API está funcionando!',
        timestamp: getCurrentTimestamp(),
        version: '1.0.0'
    });
});

// Dashboard - Estatísticas gerais
app.get('/api/dashboard', async (req, res) => {
    try {
        const tickets = await readTickets();
        
        // Calcular estatísticas
        const stats = {
            total_tickets: tickets.length,
            tickets_abertos: tickets.filter(t => t.status === 'aberto').length,
            tickets_andamento: tickets.filter(t => t.status === 'andamento').length,
            tickets_resolvidos: tickets.filter(t => t.status === 'resolvido').length,
            tickets_fechados: tickets.filter(t => t.status === 'fechado').length,
            
            // Estatísticas por prioridade (apenas tickets não resolvidos)
            por_prioridade: {
                critica: tickets.filter(t => t.priority === 'critica' && !['resolvido', 'fechado'].includes(t.status)).length,
                alta: tickets.filter(t => t.priority === 'alta' && !['resolvido', 'fechado'].includes(t.status)).length,
                media: tickets.filter(t => t.priority === 'media' && !['resolvido', 'fechado'].includes(t.status)).length,
                baixa: tickets.filter(t => t.priority === 'baixa' && !['resolvido', 'fechado'].includes(t.status)).length
            },
            
            // Estatísticas por categoria
            por_categoria: {},
            
            // Estatísticas por departamento
            por_departamento: {}
        };

        // Calcular por categoria
        const categorias = ['hardware', 'software', 'rede', 'email', 'impressora', 'sistema', 'acesso'];
        categorias.forEach(cat => {
            stats.por_categoria[cat] = tickets.filter(t => t.category === cat).length;
        });

        // Calcular por departamento
        const departamentos = [...new Set(tickets.map(t => t.department))];
        departamentos.forEach(dept => {
            stats.por_departamento[dept] = tickets.filter(t => t.department === dept).length;
        });

        // Calcular tempo médio de resolução
        const ticketsResolvidos = tickets.filter(t => t.status === 'resolvido' && t.resolved_at);
        if (ticketsResolvidos.length > 0) {
            const tempoTotal = ticketsResolvidos.reduce((total, ticket) => {
                const abertura = new Date(ticket.created_at);
                const resolucao = new Date(ticket.resolved_at);
                return total + (resolucao - abertura);
            }, 0);
            stats.tempo_medio_resolucao = Math.round(tempoTotal / ticketsResolvidos.length / (1000 * 60 * 60)); // em horas
        } else {
            stats.tempo_medio_resolucao = 0;
        }

        // Tickets recentes (últimos 5)
        const ticketsRecentes = tickets
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5);

        res.json({
            success: true,
            data: {
                statistics: stats,
                recent_tickets: ticketsRecentes
            }
        });

        console.log(`📊 Dashboard acessado - ${tickets.length} tickets no sistema`);

    } catch (error) {
        console.error('❌ Erro no dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// Listar todos os tickets
app.get('/api/tickets', async (req, res) => {
    try {
        const tickets = await readTickets();
        const { status, priority, category, limit, offset, search } = req.query;
        
        let filteredTickets = [...tickets];
        
        // Aplicar filtros
        if (status) {
            filteredTickets = filteredTickets.filter(t => t.status === status);
        }
        if (priority) {
            filteredTickets = filteredTickets.filter(t => t.priority === priority);
        }
        if (category) {
            filteredTickets = filteredTickets.filter(t => t.category === category);
        }
        if (search) {
            const searchLower = search.toLowerCase();
            filteredTickets = filteredTickets.filter(t => 
                t.title.toLowerCase().includes(searchLower) ||
                t.description.toLowerCase().includes(searchLower) ||
                t.user_name.toLowerCase().includes(searchLower)
            );
        }

        // Ordenar por data de criação (mais recentes primeiro)
        filteredTickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Paginação
        const totalCount = filteredTickets.length;
        if (limit && offset !== undefined) {
            const limitNum = parseInt(limit);
            const offsetNum = parseInt(offset);
            filteredTickets = filteredTickets.slice(offsetNum, offsetNum + limitNum);
        }

        res.json({
            success: true,
            data: {
                tickets: filteredTickets,
                total_count: totalCount,
                filtered_count: filteredTickets.length,
                pagination: {
                    limit: limit ? parseInt(limit) : null,
                    offset: offset ? parseInt(offset) : null,
                    has_more: offset && limit ? (parseInt(offset) + parseInt(limit)) < totalCount : false
                }
            }
        });

        console.log(`📋 Listagem de tickets - ${filteredTickets.length}/${totalCount} tickets retornados`);

    } catch (error) {
        console.error('❌ Erro ao listar tickets:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar tickets',
            error: error.message
        });
    }
});

// Buscar ticket por ID
app.get('/api/tickets/:id', async (req, res) => {
    try {
        const tickets = await readTickets();
        const ticket = tickets.find(t => t.id === req.params.id);
        
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket não encontrado'
            });
        }

        res.json({
            success: true,
            data: ticket
        });

        console.log(`🔍 Ticket consultado: ${req.params.id}`);

    } catch (error) {
        console.error('❌ Erro ao buscar ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar ticket',
            error: error.message
        });
    }
});

// Criar novo ticket
app.post('/api/tickets', validateTicket, async (req, res) => {
    try {
        const tickets = await readTickets();
        
        const newTicket = {
            id: generateId(),
            title: req.body.title.trim(),
            description: req.body.description.trim(),
            category: req.body.category,
            priority: req.body.priority,
            status: 'aberto',
            user_name: req.body.user_name.trim(),
            user_email: req.body.user_email.trim().toLowerCase(),
            department: req.body.department,
            assigned_to: null,
            created_at: getCurrentTimestamp(),
            updated_at: getCurrentTimestamp(),
            resolved_at: null,
            solution: null,
            internal_notes: [],
            attachments: []
        };

        tickets.push(newTicket);
        
        const saved = await writeTickets(tickets);
        if (!saved) {
            throw new Error('Falha ao salvar ticket no sistema');
        }

        res.status(201).json({
            success: true,
            message: 'Ticket criado com sucesso',
            data: newTicket
        });

        console.log(`🎫 Ticket criado: ${newTicket.id} - ${newTicket.title} (${newTicket.priority})`);

    } catch (error) {
        console.error('❌ Erro ao criar ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar ticket',
            error: error.message
        });
    }
});

// Atualizar ticket
app.put('/api/tickets/:id', async (req, res) => {
    try {
        const tickets = await readTickets();
        const ticketIndex = tickets.findIndex(t => t.id === req.params.id);
        
        if (ticketIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Ticket não encontrado'
            });
        }

        const ticket = tickets[ticketIndex];
        const updates = req.body;

        // Campos que podem ser atualizados
        const allowedUpdates = [
            'status', 'priority', 'assigned_to', 'solution', 
            'title', 'description', 'category'
        ];
        
        const actualUpdates = {};
        
        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key) && updates[key] !== undefined) {
                actualUpdates[key] = updates[key];
            }
        });

        // Validações específicas para updates
        if (actualUpdates.status && !['aberto', 'andamento', 'resolvido', 'fechado'].includes(actualUpdates.status)) {
            return res.status(400).json({
                success: false,
                message: 'Status inválido'
            });
        }

        if (actualUpdates.priority && !['baixa', 'media', 'alta', 'critica'].includes(actualUpdates.priority)) {
            return res.status(400).json({
                success: false,
                message: 'Prioridade inválida'
            });
        }

        // Se status mudou para resolvido, adicionar timestamp
        if (actualUpdates.status === 'resolvido' && ticket.status !== 'resolvido') {
            actualUpdates.resolved_at = getCurrentTimestamp();
        }

        // Se status mudou de resolvido para outro, remover timestamp
        if (actualUpdates.status && actualUpdates.status !== 'resolvido' && ticket.status === 'resolvido') {
            actualUpdates.resolved_at = null;
        }

        // Aplicar atualizações
        tickets[ticketIndex] = {
            ...ticket,
            ...actualUpdates,
            updated_at: getCurrentTimestamp()
        };

        const saved = await writeTickets(tickets);
        if (!saved) {
            throw new Error('Falha ao salvar alterações');
        }

        res.json({
            success: true,
            message: 'Ticket atualizado com sucesso',
            data: tickets[ticketIndex]
        });

        console.log(`✏️ Ticket atualizado: ${req.params.id} - Status: ${tickets[ticketIndex].status}`);

    } catch (error) {
        console.error('❌ Erro ao atualizar ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar ticket',
            error: error.message
        });
    }
});

// Adicionar nota interna ao ticket
app.post('/api/tickets/:id/notes', async (req, res) => {
    try {
        const tickets = await readTickets();
        const ticketIndex = tickets.findIndex(t => t.id === req.params.id);
        
        if (ticketIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Ticket não encontrado'
            });
        }

        const { note, author } = req.body;
        
        if (!note || !author) {
            return res.status(400).json({
                success: false,
                message: 'Nota e autor são obrigatórios'
            });
        }

        if (note.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Nota deve ter pelo menos 3 caracteres'
            });
        }

        const newNote = {
            id: generateId(),
            content: note.trim(),
            author: author.trim(),
            created_at: getCurrentTimestamp()
        };

        if (!tickets[ticketIndex].internal_notes) {
            tickets[ticketIndex].internal_notes = [];
        }

        tickets[ticketIndex].internal_notes.push(newNote);
        tickets[ticketIndex].updated_at = getCurrentTimestamp();

        const saved = await writeTickets(tickets);
        if (!saved) {
            throw new Error('Falha ao salvar nota');
        }

        res.status(201).json({
            success: true,
            message: 'Nota adicionada com sucesso',
            data: newNote
        });

        console.log(`📝 Nota adicionada ao ticket ${req.params.id} por ${author}`);

    } catch (error) {
        console.error('❌ Erro ao adicionar nota:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao adicionar nota',
            error: error.message
        });
    }
});

// Deletar ticket
app.delete('/api/tickets/:id', async (req, res) => {
    try {
        const tickets = await readTickets();
        const ticketIndex = tickets.findIndex(t => t.id === req.params.id);
        
        if (ticketIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Ticket não encontrado'
            });
        }

        const deletedTicket = tickets.splice(ticketIndex, 1)[0];

        const saved = await writeTickets(tickets);
        if (!saved) {
            throw new Error('Falha ao deletar ticket');
        }

        res.json({
            success: true,
            message: 'Ticket deletado com sucesso',
            data: deletedTicket
        });

        console.log(`🗑️ Ticket deletado: ${req.params.id} - ${deletedTicket.title}`);

    } catch (error) {
        console.error('❌ Erro ao deletar ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao deletar ticket',
            error: error.message
        });
    }
});

// Listar usuários/técnicos
app.get('/api/users', async (req, res) => {
    try {
        const users = await readUsers();
        
        res.json({
            success: true,
            data: users.map(user => ({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department
            }))
        });

        console.log(`👥 Lista de usuários consultada - ${users.length} usuários`);

    } catch (error) {
        console.error('❌ Erro ao buscar usuários:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar usuários',
            error: error.message
        });
    }
});

// Relatório resumido
app.get('/api/reports/summary', async (req, res) => {
    try {
        const tickets = await readTickets();
        const { start_date, end_date } = req.query;
        
        let filteredTickets = tickets;
        
        // Filtrar por período se fornecido
        if (start_date && end_date) {
            const startDate = new Date(start_date);
            const endDate = new Date(end_date);
            endDate.setHours(23, 59, 59, 999); // Incluir todo o dia final
            
            filteredTickets = tickets.filter(t => {
                const createdAt = new Date(t.created_at);
                return createdAt >= startDate && createdAt <= endDate;
            });
        }

        // Calcular métricas do relatório
        const report = {
            period: {
                start: start_date || 'Início',
                end: end_date || 'Presente',
                total_days: start_date && end_date ? 
                    Math.ceil((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)) + 1 : 
                    'Todo o período'
            },
            summary: {
                total_tickets: filteredTickets.length,
                by_status: {
                    aberto: filteredTickets.filter(t => t.status === 'aberto').length,
                    andamento: filteredTickets.filter(t => t.status === 'andamento').length,
                    resolvido: filteredTickets.filter(t => t.status === 'resolvido').length,
                    fechado: filteredTickets.filter(t => t.status === 'fechado').length
                },
                by_priority: {
                    critica: filteredTickets.filter(t => t.priority === 'critica').length,
                    alta: filteredTickets.filter(t => t.priority === 'alta').length,
                    media: filteredTickets.filter(t => t.priority === 'media').length,
                    baixa: filteredTickets.filter(t => t.priority === 'baixa').length
                },
                by_category: {},
                by_department: {},
                resolution_rate: filteredTickets.length > 0 ? 
                    Math.round((filteredTickets.filter(t => ['resolvido', 'fechado'].includes(t.status)).length / filteredTickets.length) * 100) : 
                    0
            },
            trends: {
                tickets_per_day: {},
                avg_resolution_time: 0
            }
        };

        // Calcular por categoria
        const categorias = ['hardware', 'software', 'rede', 'email', 'impressora', 'sistema', 'acesso'];
        categorias.forEach(cat => {
            report.summary.by_category[cat] = filteredTickets.filter(t => t.category === cat).length;
        });

        // Calcular por departamento
        const departamentos = [...new Set(filteredTickets.map(t => t.department))];
        departamentos.forEach(dept => {
            report.summary.by_department[dept] = filteredTickets.filter(t => t.department === dept).length;
        });

        // Calcular tempo médio de resolução
        const resolvedTickets = filteredTickets.filter(t => t.resolved_at);
        if (resolvedTickets.length > 0) {
            const totalTime = resolvedTickets.reduce((sum, ticket) => {
                const created = new Date(ticket.created_at);
                const resolved = new Date(ticket.resolved_at);
                return sum + (resolved - created);
            }, 0);
            report.trends.avg_resolution_time = Math.round(totalTime / resolvedTickets.length / (1000 * 60 * 60)); // em horas
        }

        res.json({
            success: true,
            data: report
        });

        console.log(`📊 Relatório gerado - Período: ${report.period.start} a ${report.period.end} - ${filteredTickets.length} tickets`);

    } catch (error) {
        console.error('❌ Erro ao gerar relatório:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao gerar relatório',
            error: error.message
        });
    }
});

// Middleware de tratamento de erros global
app.use((err, req, res, next) => {
    console.error('❌ Erro não tratado:', err);
    res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno'
    });
});

// Middleware para rotas não encontradas
app.use((req, res) => {
    console.log(`❓ Rota não encontrada: ${req.method} ${req.url}`);
    res.status(404).json({
        success: false,
        message: `Endpoint não encontrado: ${req.method} ${req.url}`,
        available_endpoints: [
            'GET /api/dashboard',
            'GET /api/tickets',
            'POST /api/tickets', 
            'GET /api/tickets/:id',
            'PUT /api/tickets/:id',
            'DELETE /api/tickets/:id',
            'POST /api/tickets/:id/notes',
            'GET /api/users',
            'GET /api/reports/summary',
            'GET /health'
        ]
    });
});

// Inicializar servidor
async function startServer() {
    try {
        console.log('🚀 Iniciando Help Desk Server...');
        console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
        
        // Inicializar dados
        await initializeDataFiles();
        
        // Iniciar servidor
        app.listen(PORT, () => {
            console.log('');
            console.log('🎉 ================================');
            console.log('🎫 HELP DESK SYSTEM ONLINE!');
            console.log('🎉 ================================');
            console.log('');
            console.log(`🌐 Servidor rodando na porta: ${PORT}`);
            console.log(`📱 Frontend: http://localhost:${PORT}`);
            console.log(`🔌 API Base: http://localhost:${PORT}/api`);
            console.log(`💚 Health Check: http://localhost:${PORT}/health`);
            console.log('');
            console.log('📋 Endpoints disponíveis:');
            console.log('   GET  /api/dashboard        - Dashboard com estatísticas');
            console.log('   GET  /api/tickets          - Listar tickets');
            console.log('   POST /api/tickets          - Criar ticket');
            console.log('   GET  /api/tickets/:id      - Buscar ticket');
            console.log('   PUT  /api/tickets/:id      - Atualizar ticket');
            console.log('   DEL  /api/tickets/:id      - Deletar ticket');
            console.log('   POST /api/tickets/:id/notes - Adicionar nota');
            console.log('   GET  /api/users            - Listar usuários');
            console.log('   GET  /api/reports/summary  - Relatório resumido');
            console.log('');
            console.log('💡 Para parar o servidor: Ctrl + C');
            console.log('🔄 Logs em tempo real:');
            console.log('');
        });

    } catch (error) {
        console.error('💥 Erro fatal ao iniciar servidor:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📴 Recebido SIGTERM. Encerrando servidor graciosamente...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📴 Recebido SIGINT (Ctrl+C). Encerrando servidor...');
    process.exit(0);
});

// Capturar erros não tratados
process.on('uncaughtException', (error) => {
    console.error('💥 Erro não capturado:', error);
    console.log('🔄 Encerrando processo...');
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Promise rejeitada não tratada:', reason);
    console.log('🔄 Encerrando processo...');
    process.exit(1);
});

// Iniciar o servidor
startServer();