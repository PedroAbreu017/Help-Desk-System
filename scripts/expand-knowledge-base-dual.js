// scripts/expand-knowledge-base-dual.js - Versão MySQL/SQLite compatível
require('dotenv').config();

async function expandKnowledgeBase() {
    const { executeQuery, getDatabaseType, initDatabase } = require('../src/config/database');
    
    try {
        console.log('🚀 Criando Base de Conhecimento Profissional...');
        
        // Inicializar banco (vai detectar automaticamente MySQL ou SQLite)
        await initDatabase();
        const dbType = getDatabaseType();
        console.log(`✅ Conectado ao ${dbType.toUpperCase()}`);
        
        // Pegar autor existente
        const users = await executeQuery('SELECT id FROM users LIMIT 1');
        const authorId = users.length > 0 ? users[0].id : '1';
        
        // Limpar artigos existentes
        await executeQuery('DELETE FROM knowledge_base WHERE 1=1');
        console.log('🧹 Base de conhecimento limpa');
        
        // Artigos profissionais
        const articles = [
            {
                title: "Metodologia de Troubleshooting CompTIA",
                slug: "metodologia-troubleshooting-comptia",
                category: "sistema", 
                subcategory: "metodologia",
                priority: "alta",
                tags: "troubleshooting,comptia,metodologia,diagnostico",
                summary: "Guia da metodologia estruturada CompTIA para resolução de problemas de TI em 6 etapas sistemáticas.",
                content: `# Metodologia CompTIA de Troubleshooting

## As 6 Etapas Fundamentais

### 1. Identificar o Problema
- Coletar informações do usuário
- Reproduzir o problema quando possível
- Questionar sobre mudanças recentes
- Documentar sintomas observados

**Perguntas Essenciais:**
- Quando o problema começou?
- O que mudou recentemente?
- O problema é consistente?
- Outros usuários são afetados?

### 2. Estabelecer Teoria da Causa
- Começar com causas mais óbvias
- Considerar múltiplas possibilidades
- Usar processo de eliminação
- Consultar documentação se necessário

### 3. Testar a Teoria
- Se confirmada: prosseguir para solução
- Se não confirmada: criar nova teoria
- Escalar se necessário

### 4. Estabelecer Plano de Ação
- Criar plano detalhado
- Implementar solução
- Consultar vendor se necessário

### 5. Verificar Funcionalidade
- Confirmar resolução completa
- Verificar se não surgiram novos problemas
- Implementar medidas preventivas

### 6. Documentar Tudo
- Registrar descobertas
- Documentar ações tomadas
- Registrar resultados para futura referência

## Ferramentas Essenciais
- Event Viewer: Análise de logs
- Task Manager: Monitoramento
- Command Prompt: Diagnósticos
- Device Manager: Status de hardware

## Exemplo Prático
**Problema:** "Computador lento"
1. **Identificar:** Lentidão após boot
2. **Teoria:** Muitos programas no startup
3. **Testar:** Verificar msconfig
4. **Plano:** Desabilitar programas desnecessários
5. **Verificar:** Testar performance
6. **Documentar:** Registrar solução`
            },
            {
                title: "Diagnóstico de Hardware - Testes Essenciais",
                slug: "diagnostico-hardware-testes",
                category: "hardware",
                subcategory: "diagnostico",
                priority: "alta",
                tags: "hardware,diagnostico,testes,componentes",
                summary: "Procedimentos essenciais para diagnóstico de hardware usando ferramentas profissionais.",
                content: `# Diagnóstico de Hardware

## Ferramentas Principais

### Software de Diagnóstico
- **CPU-Z:** Informações do processador
- **MemTest86:** Teste de memória RAM
- **CrystalDiskInfo:** Status de HDs/SSDs
- **HWiNFO:** Monitoramento completo
- **Prime95:** Stress test de CPU

### Ferramentas Físicas
- Multímetro para voltagens
- POST Card para diagnóstico de boot
- Cabo de teste para fontes

## Diagnóstico por Componente

### Processador (CPU)
**Sintomas:** Travamentos, temperaturas altas, performance baixa

**Testes:**
- Verificar temperatura (normal < 75°C)
- Executar Prime95 por 15 minutos
- Verificar frequência vs especificação
- Testar voltagem

### Memória RAM
**Sintomas:** Blue screens, travamentos, erros aleatórios

**Processo:**
- Executar MemTest86 via USB bootável
- Testar cada pente individualmente
- Verificar slots da placa-mãe
- Analisar resultados (0 erros = OK)

### Armazenamento
**Sintomas:** Lentidão extrema, ruídos, erros SMART

**Ferramentas:**
- CrystalDiskInfo para status SMART
- HD Tune para performance
- chkdsk para verificação de erros

### Placa de Vídeo
**Diagnóstico:**
- Verificar conexões e ventoinhas
- Atualizar drivers
- Monitorar temperatura (normal < 85°C)
- Executar FurMark por 10 minutos

### Fonte de Alimentação
**Testes:**
- Paperclip test para verificar ligação
- Multímetro para voltagens
- Teste sob carga real

**Voltagens Corretas:**
- +12V: 11.4V - 12.6V
- +5V: 4.75V - 5.25V
- +3.3V: 3.14V - 3.47V

## Processo de Eliminação
1. Testar com componentes mínimos
2. Adicionar componentes um por vez
3. Usar peças conhecidamente funcionais
4. Documentar cada teste realizado`
            },
            {
                title: "Troubleshooting de Rede - Modelo OSI",
                slug: "troubleshooting-rede-osi",
                category: "rede",
                subcategory: "conectividade",
                priority: "alta",
                tags: "rede,osi,conectividade,diagnostico",
                summary: "Diagnóstico sistemático de problemas de rede usando o modelo OSI como metodologia.",
                content: `# Troubleshooting de Rede OSI

## Sequência de Testes Básicos

### Comandos Essenciais
\`\`\`bash
# Teste de conectividade básica
ping 127.0.0.1        # Loopback
ping [próprio IP]     # Interface local
ping [gateway]        # Gateway padrão
ping 8.8.8.8         # Internet
nslookup google.com   # DNS

# Verificar configuração
ipconfig /all
netstat -an
tracert 8.8.8.8
\`\`\`

## Problemas Comuns
- IP 169.254.x.x (falha DHCP)
- Gateway incorreto
- DNS não funcional
- Conflito de IP

## Soluções Rápidas

### "Sem Internet"
\`\`\`bash
# Diagnóstico rápido
ipconfig /all
ping 8.8.8.8
nslookup google.com

# Solução comum
ipconfig /release
ipconfig /renew
\`\`\`

## Ferramentas Avançadas
- **Wireshark:** Captura de pacotes
- **PuTTY:** Cliente SSH/Telnet
- **Advanced IP Scanner:** Varredura de rede
- **WiFi Analyzer:** Análise de redes sem fio`
            },
            {
                title: "Microsoft Office - Problemas Comuns e Soluções",
                slug: "microsoft-office-problemas-solucoes",
                category: "software",
                subcategory: "office",
                priority: "alta",
                tags: "office,word,excel,powerpoint,outlook,microsoft",
                summary: "Guia completo para resolver os problemas mais comuns do Microsoft Office: Word, Excel, PowerPoint e Outlook.",
                content: `# Microsoft Office - Troubleshooting

## Problemas Comuns do Word

### Documento Não Abre ou Trava
**Sintomas:** Word não responde, arquivo corrompido, erro ao abrir
**Soluções:**
- Abrir em Modo de Segurança: \`winword /safe\`
- Reparar instalação: Painel de Controle > Programas > Microsoft Office > Alterar > Reparo Rápido
- Recuperar documento: Arquivo > Abrir > Procurar > Selecionar arquivo > Abrir e Reparar

### Formatação Quebrada
**Sintomas:** Texto desformatado, espaçamento incorreto
**Soluções:**
- Limpar formatação: Ctrl+Shift+N
- Copiar apenas texto: Colar Especial > Texto sem formatação
- Verificar estilos: Início > Estilos > Gerenciar Estilos

## Problemas do Excel

### Arquivo Muito Lento
**Sintomas:** Excel demora para abrir ou calcular
**Soluções:**
- Desabilitar suplementos: Arquivo > Opções > Suplementos > Gerenciar Suplementos COM
- Verificar cálculo automático: Fórmulas > Opções de Cálculo > Automático
- Remover formatação desnecessária: Selecionar células > Limpar > Limpar Formatos

### Fórmulas Não Funcionam
**Sintomas:** Fórmulas mostram texto ao invés de resultado
**Soluções:**
- Verificar se célula está formatada como Texto: Início > Número > Geral
- Reconfigurar: Fórmulas > Mostrar Fórmulas (desmarcar)
- Forçar recálculo: Ctrl+Shift+F9

## Ferramentas de Reparo do Office
\`\`\`cmd
# Reparo rápido
Painel de Controle > Programas > Microsoft Office > Alterar > Reparo Rápido
\`\`\``
            },
            {
                title: "Segurança de Endpoints e Antivírus",
                slug: "seguranca-endpoints-antivirus",
                category: "sistema",
                subcategory: "seguranca",
                priority: "critica",
                tags: "seguranca,antivirus,malware,endpoints",
                summary: "Guia de segurança de endpoints, proteção contra malware e resposta a incidentes de segurança.",
                content: `# Segurança de Endpoints

## Tipos de Ameaças

### Malware Tradicional
- **Vírus:** Código que infecta arquivos
- **Worms:** Propagação autônoma pela rede
- **Trojans:** Disfarçados como software legítimo
- **Spyware:** Coleta informações sem consentimento
- **Ransomware:** Criptografa dados exigindo pagamento

## Windows Defender - Configuração

### PowerShell Básico
\`\`\`powershell
# Verificar status
Get-MpComputerStatus

# Atualizar assinaturas
Update-MpSignature

# Scan rápido
Start-MpScan -ScanType QuickScan

# Scan completo
Start-MpScan -ScanType FullScan
\`\`\`

## Resposta a Incidentes

### Metodologia NIST
1. **Preparation:** Ferramentas e procedimentos
2. **Identification:** Detecção de eventos
3. **Containment:** Isolamento da ameaça
4. **Eradication:** Remoção completa
5. **Recovery:** Restauração de serviços
6. **Lessons Learned:** Análise pós-incidente

## Escalação
**Quando escalar:**
- Múltiplos endpoints infectados
- Suspeita de APT ou ataque direcionado
- Dados críticos comprometidos
- Sistemas de produção afetados`
            }
        ];

        console.log(`📝 Inserindo ${articles.length} artigos profissionais...`);

        for (const article of articles) {
            // Usar sintaxe diferente para MySQL e SQLite
            let insertQuery;
            if (dbType === 'mysql') {
                insertQuery = `
                    INSERT INTO knowledge_base (
                        title, slug, content, summary, category, subcategory,
                        tags, priority, status, author_id, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE
                    title = VALUES(title),
                    content = VALUES(content),
                    summary = VALUES(summary),
                    updated_at = VALUES(updated_at)
                `;
            } else {
                // SQLite
                insertQuery = `
                    INSERT OR REPLACE INTO knowledge_base (
                        title, slug, content, summary, category, subcategory,
                        tags, priority, status, author_id, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, datetime('now'), datetime('now'))
                `;
            }
            
            await executeQuery(insertQuery, [
                article.title,
                article.slug, 
                article.content,
                article.summary,
                article.category,
                article.subcategory,
                article.tags,
                article.priority,
                authorId
            ]);
            
            console.log(`✅ ${article.title}`);
        }

        // Adicionar métricas realísticas
        console.log('📊 Adicionando métricas...');
        
        const articleIds = await executeQuery('SELECT id FROM knowledge_base');
        for (const article of articleIds) {
            const views = Math.floor(Math.random() * 500) + 50;
            const rating = (Math.random() * 2 + 3).toFixed(1);
            
            await executeQuery(
                'UPDATE knowledge_base SET views = ?, rating = ? WHERE id = ?',
                [views, parseFloat(rating), article.id]
            );
        }

        // Estatísticas finais
        const stats = await executeQuery(`
            SELECT 
                COUNT(*) as total,
                COUNT(DISTINCT category) as categories,
                AVG(rating) as avg_rating,
                SUM(views) as total_views
            FROM knowledge_base
        `);

        console.log('\n🎉 Base de Conhecimento Profissional Criada!');
        console.log('='.repeat(50));
        console.log(`📚 Total de Artigos: ${stats[0].total}`);
        console.log(`📂 Categorias: ${stats[0].categories}`);
        console.log(`⭐ Avaliação Média: ${parseFloat(stats[0].avg_rating || 0).toFixed(1)}/5.0`);
        console.log(`👁️ Total de Visualizações: ${stats[0].total_views || 0}`);
        console.log(`💾 Banco de Dados: ${dbType.toUpperCase()}`);
        
        console.log('\n🎯 Para testar:');
        console.log('1. Execute: npm start (ou NODE_ENV=production npm start para SQLite)');
        console.log('2. Acesse a seção "Base de Conhecimento"');
        console.log('3. Teste busca e filtros');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    expandKnowledgeBase();
}

module.exports = { expandKnowledgeBase };