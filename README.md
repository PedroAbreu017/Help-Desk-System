# Help Desk System v2.0

Sistema profissional de Help Desk com arquitetura modular, dashboard interativo, relatórios avançados e interface responsiva desenvolvido em Node.js + MySQL.

## 🚀 Características Principais

- **Arquitetura Modular** - Sistema de componentes carregados dinamicamente
- **Dashboard Interativo** - 4 gráficos Chart.js em tempo real
- **Sistema de Relatórios** - Visualizações avançadas com exportação CSV
- **Autenticação JWT** - Sistema seguro com refresh tokens automático
- **WebSocket Real-time** - Notificações instantâneas
- **Base de Conhecimento** - Artigos categorizados para suporte
- **Interface Responsiva** - Design moderno compatível com todos os dispositivos
- **Cobertura de Testes** - Suite completa de testes unitários e integração

## 🛠 Stack Tecnológica

### Backend
- **Node.js 16+** com Express.js
- **MySQL 8.0+** para persistência
- **JWT** com refresh tokens
- **Socket.io** para WebSocket
- **bcryptjs** para hash seguro de senhas
- **Helmet** + middlewares de segurança

### Frontend
- **JavaScript ES6+** com arquitetura modular
- **Chart.js** para visualizações interativas
- **CSS3 Grid/Flexbox** responsivo
- **Font Awesome** para ícones
- **Sistema de componentes** dinâmicos

### DevOps & Qualidade
- **Jest** para testes unitários e integração
- **ESLint** para qualidade de código
- **Morgan + Winston** para logging
- **Nodemon** para desenvolvimento
- **Coverage Reports** automatizados

## 📁 Estrutura do Projeto

```
helpdesk-system/
├── coverage/                   # Relatórios de cobertura de testes
├── data/                      # Dados de exemplo/seeds
├── docs/                      # Documentação adicional
├── public/                    # Frontend (SPA)
│   ├── assets/               # Recursos estáticos
│   ├── components/           # Componentes modulares
│   │   ├── layout/          # Header, sidebar, navegação
│   │   ├── modals/          # Modais do sistema
│   │   ├── scripts/         # Scripts organizados por função
│   │   └── sections/        # Dashboard, tickets, relatórios
│   ├── css/                 # Estilos CSS organizados
│   │   ├── components/      # CSS específico de componentes
│   │   └── views/          # CSS específico de views
│   ├── js/                  # JavaScript modular
│   │   ├── components/      # Componentes JS
│   │   ├── core/           # Funcionalidades core
│   │   ├── modules/        # Módulos específicos
│   │   └── views/         # Scripts de views
│   └── index.html          # SPA principal
├── src/                      # Backend organizado
│   ├── config/              # Configurações (DB, Socket, App)
│   ├── controllers/         # Controladores (se usado padrão MVC)
│   ├── middleware/          # Auth, validação, logs, error handling
│   ├── models/             # Modelos de dados
│   ├── routes/             # Rotas da API REST
│   ├── services/           # Lógica de negócio
│   └── utils/              # Utilitários e helpers
├── tests/                   # Suite de testes completa
├── server.js               # Servidor principal
└── package.json           # Dependências e scripts
```

## 🔧 Instalação e Configuração

### Pré-requisitos
- Node.js 16 ou superior
- MySQL 8.0 ou superior
- Git

### Instalação Rápida

```bash
# 1. Clone o repositório
git clone <seu-repositorio>
cd helpdesk-system

# 2. Instale dependências
npm install

# 3. Configure o banco de dados MySQL
mysql -u root -p
CREATE DATABASE helpdesk_system;
exit

# 4. Configure variáveis de ambiente
cp .env.example .env
# Edite o .env com suas configurações

# 5. Inicialize o banco e dados de exemplo
npm run setup

# 6. Inicie o servidor
npm start
```

### Variáveis de Ambiente (.env)
```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha_mysql
DB_NAME=helpdesk_system

# JWT Secrets
JWT_SECRET=seu_jwt_secret_muito_longo_e_seguro
JWT_REFRESH_SECRET=seu_refresh_secret_muito_longo_e_seguro

# Server
PORT=3000
NODE_ENV=development

# Optional
CORS_ORIGIN=http://localhost:3000
```

## 🚀 Como Usar

### 1. Acesse o Sistema
- **URL:** http://localhost:3000
- **Health Check:** http://localhost:3000/health

### 2. Login Padrão
- **Usuário:** `admin`
- **Senha:** `admin123`

### 3. Funcionalidades Principais

#### Dashboard
- Estatísticas em tempo real
- 4 gráficos interativos (categorias, prioridades, status, tendências)
- Lista de tickets recentes
- Métricas de performance

#### Gestão de Tickets
- Criação com formulário completo
- Categorização (Hardware, Software, Rede, Email, Sistema)
- Prioridades (Baixa, Média, Alta, Crítica)
- Status tracking (Aberto, Andamento, Resolvido, Fechado)
- Atribuição a técnicos

#### Sistema de Relatórios
- Relatórios personalizados por período
- Filtros por departamento, categoria, prioridade
- 4 visualizações Chart.js profissionais
- Exportação para CSV
- Métricas de SLA e performance

#### Base de Conhecimento
- Artigos organizados por categoria
- Sistema de busca integrado
- Interface amigável para usuários finais

## 📊 Scripts Disponíveis

```bash
# Desenvolvimento
npm start              # Inicia servidor produção
npm run dev           # Inicia com nodemon (desenvolvimento)

# Testes
npm test              # Executa todos os testes com coverage
npm run test:watch    # Testes em modo watch
npm run test:unit     # Apenas testes unitários
npm run test:integration  # Testes de integração
npm run test:e2e      # Testes end-to-end

# Banco de Dados
npm run setup         # Setup completo (install + init-data)
npm run init-data     # Inicializa dados no banco
npm run migrate       # Executa migrações
npm run seed          # Popula dados de exemplo
npm run reset-db      # Reset completo do banco

# Produção
npm run cluster       # Inicia em modo cluster
npm run backup        # Backup do banco de dados
```

## 🌐 API Endpoints

### Autenticação
```
POST /api/auth/login       # Login com email/senha
POST /api/auth/refresh     # Renovar tokens
GET  /api/auth/verify      # Verificar token atual
POST /api/auth/logout      # Logout seguro
```

### Tickets
```
GET    /api/tickets        # Listar tickets (com filtros)
POST   /api/tickets        # Criar novo ticket
GET    /api/tickets/:id    # Detalhes de um ticket
PUT    /api/tickets/:id    # Atualizar ticket
DELETE /api/tickets/:id    # Excluir ticket
POST   /api/tickets/:id/notes  # Adicionar nota
```

### Dashboard
```
GET /api/dashboard         # Dados completos do dashboard
```

### Relatórios
```
GET /api/reports/summary     # Relatório resumido
GET /api/reports/detailed    # Relatório detalhado + CSV
GET /api/reports/performance # Métricas de performance
```

### Usuários
```
GET    /api/users          # Listar usuários
POST   /api/users          # Criar usuário
PUT    /api/users/:id      # Atualizar usuário
DELETE /api/users/:id      # Excluir usuário
```

### Base de Conhecimento
```
GET    /api/knowledge-base    # Listar artigos
POST   /api/knowledge-base    # Criar artigo
GET    /api/knowledge-base/:id # Detalhes do artigo
PUT    /api/knowledge-base/:id # Atualizar artigo
DELETE /api/knowledge-base/:id # Excluir artigo
```

## 🏗 Arquitetura

### Sistema Modular Frontend
O frontend utiliza um **Component Loader System** que carrega dinamicamente:

1. **Layout Components** - Header, sidebar, navegação
2. **Section Components** - Dashboard, tickets, relatórios, KB
3. **Modal Components** - Janelas modais interativas
4. **Script Components** - JavaScript organizado por funcionalidade

### Fluxo de Autenticação
```
1. Login (email/senha) → 2. JWT + Refresh Token → 3. LocalStorage
4. Interceptador HTTP → 5. Auto-refresh → 6. APIs Protegidas
```

### Arquitetura de Relatórios
- **Backend:** APIs REST + queries MySQL otimizadas
- **Frontend:** ReportsManager + Chart.js
- **Export:** Geração CSV server-side
- **Visualização:** 4 gráficos responsivos

## 🧪 Testes

O projeto inclui cobertura completa de testes:

```bash
# Executar todos os testes
npm test

# Ver relatório de cobertura
open coverage/index.html
```

### Tipos de Teste
- **Unitários:** Middlewares, utils, helpers
- **Integração:** Rotas da API, banco de dados
- **E2E:** Fluxos completos de usuário
- **Performance:** Testes de carga e stress

## 🔒 Segurança

- **CSP** (Content Security Policy) configurado
- **Helmet.js** para headers de segurança
- **Rate Limiting** nas APIs críticas
- **Validação robusta** de entrada em todas as rotas
- **Hash bcrypt** para senhas
- **JWT com expiração** e refresh automático
- **Sanitização** de dados de entrada

## 📈 Performance

- **Lazy Loading** de componentes
- **Queries MySQL otimizadas** com índices
- **Cache** de componentes frontend
- **Compressão gzip** habilitada
- **Clustering** disponível para produção

## 🔍 Monitoramento

### Health Check
```bash
curl http://localhost:3000/health

# Resposta esperada:
{
  "status": "OK",
  "timestamp": "2024-XX-XX...",
  "version": "2.0.0",
  "environment": "development",
  "websocket": "connected",
  "database": "connected"
}
```

### Logging
- **Morgan** para logs de requisições HTTP
- **Winston** para logs estruturados da aplicação
- **Audit Trail** para ações críticas do sistema

## 🚢 Deploy

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
# Configurar ambiente
export NODE_ENV=production

# Instalar apenas deps de produção
npm ci --only=production

# Iniciar com PM2 (recomendado)
npm install pm2 -g
pm2 start server.js --name="helpdesk-system"

# Ou modo cluster
npm run cluster
```

### Docker (Opcional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

### Padrões de Código
- Use ESLint para manter consistência
- Escreva testes para novas funcionalidades
- Mantenha coverage acima de 80%
- Documente APIs com comentários JSDoc

## 📄 Licença

Este projeto está sob a licença MIT. Veja [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

- **Issues:** GitHub Issues para bugs e features
- **Documentação:** Consulte a pasta `/docs`
- **Wiki:** Documentação técnica detalhada

---

**Help Desk System v2.0** - Solução completa para gestão de suporte técnico empresarial.