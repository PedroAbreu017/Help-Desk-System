// scripts/expand-knowledge-base-simple.js - Versão Corrigida e Concisa
const mysql = require('mysql2/promise');
require('dotenv').config();

async function expandKnowledgeBase() {
    let db;
    
    try {
        console.log('🚀 Criando Base de Conhecimento Profissional...');
        
        db = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root', 
            password: process.env.DB_PASSWORD || 'V@ilos9597',
            database: process.env.DB_NAME || 'helpdesk_system'
        });
        
        console.log('✅ Conectado ao MySQL');
        
        // Pegar autor existente
        const [users] = await db.execute('SELECT id FROM users LIMIT 1');
        const authorId = users.length > 0 ? users[0].id : '1';
        
        // Limpar artigos existentes
        await db.execute('DELETE FROM knowledge_base WHERE 1=1');
        console.log('🧹 Base de conhecimento limpa');
        
        // Artigos profissionais concisos
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

## Camada 1 - Física
**Verificações:**
- Cabos de rede íntegros
- LEDs de status ativos
- Portas funcionais
- Energia nos equipamentos

**Problemas Comuns:**
- Cabo danificado
- Porta defeituosa
- Conector solto
- Cabo incorreto (direto vs cruzado)

## Camada 2 - Enlace
**Ethernet:**
- Verificar endereço MAC
- Status do switch (LEDs)
- Configuração de VLAN
- Modo duplex

**Wi-Fi:**
- SSID correto
- Senha válida
- Canal sem interferência
- Distância do access point

## Camada 3 - Rede (IP)
**Configurações Críticas:**
- Endereço IP válido
- Máscara de sub-rede correta
- Gateway acessível
- DNS configurado

**Comandos de Diagnóstico:**
\`\`\`bash
# Renovar configuração DHCP
ipconfig /release
ipconfig /flushdns
ipconfig /renew

# Verificar rota
route print
tracert [destino]
\`\`\`

**Problemas Comuns:**
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

### "Wi-Fi Não Conecta"
1. Esquecer e reconectar à rede
2. Atualizar driver da placa Wi-Fi
3. Verificar canal (usar WiFi Analyzer)
4. Reiniciar roteador e dispositivo

### "Internet Lenta"
1. Teste de velocidade (speedtest)
2. Verificar latência (ping -t 8.8.8.8)
3. Trocar DNS (8.8.8.8, 8.8.4.4)
4. Verificar aplicações em background

## Ferramentas Avançadas
- **Wireshark:** Captura de pacotes
- **PuTTY:** Cliente SSH/Telnet
- **Advanced IP Scanner:** Varredura de rede
- **WiFi Analyzer:** Análise de redes sem fio

## Escalação
**Quando escalar:**
- Problema persiste após testes básicos
- Envolve equipamentos corporativos
- Afeta múltiplos usuários
- Suspeita de problema do provedor`
            },
            {
                title: "Gerenciamento de Senhas e Active Directory",
                slug: "senhas-active-directory",
                category: "sistema",
                subcategory: "usuarios",
                priority: "alta",
                tags: "active-directory,senhas,usuarios,seguranca",
                summary: "Procedimentos para reset de senhas, desbloqueio de contas e gerenciamento de usuários no AD.",
                content: `# Gerenciamento AD e Senhas

## Reset de Senhas

### Via ADUC (dsa.msc)
1. Abrir Active Directory Users and Computers
2. Localizar usuário na OU correta
3. Clicar direito → Reset Password
4. Definir senha temporária
5. Marcar "User must change password at next logon"

### Via PowerShell
\`\`\`powershell
# Reset senha
Set-ADAccountPassword -Identity "usuario" -Reset -NewPassword (ConvertTo-SecureString -AsPlainText "TempPass123!" -Force)

# Forçar troca no próximo login
Set-ADUser -Identity "usuario" -ChangePasswordAtLogon $true

# Habilitar conta
Enable-ADAccount -Identity "usuario"

# Verificar status
Get-ADUser "usuario" -Properties PasswordLastSet,Enabled
\`\`\`

## Contas Bloqueadas

### Identificação
\`\`\`powershell
# Verificar se conta está bloqueada
Get-ADUser "usuario" -Properties LockedOut,AccountLockoutTime

# Buscar contas bloqueadas no domínio
Search-ADAccount -LockedOut | Select Name,LockedOut

# Ver eventos de lockout
Get-WinEvent -FilterHashtable @{LogName='Security'; ID=4740} -MaxEvents 50
\`\`\`

### Desbloqueio
\`\`\`powershell
# Desbloquear conta
Unlock-ADAccount -Identity "usuario"

# Desbloquear e reset senha
Unlock-ADAccount -Identity "usuario"
Set-ADAccountPassword -Identity "usuario" -Reset -NewPassword (ConvertTo-SecureString -AsPlainText "NewTemp123!" -Force)
\`\`\`

## Políticas de Senha

### Configuração Padrão
- Comprimento mínimo: 8 caracteres
- Histórico: 12 senhas anteriores
- Idade máxima: 90 dias
- Complexidade: Habilitada

### Fine-Grained Password Policy
\`\`\`powershell
# Criar política específica
New-ADFineGrainedPasswordPolicy -Name "Admins-Policy" -ComplexityEnabled $true -LockoutThreshold 3 -MinPasswordLength 12 -MaxPasswordAge "60.00:00:00"

# Aplicar a grupo
Add-ADFineGrainedPasswordPolicySubject -Identity "Admins-Policy" -Subjects "Domain Admins"
\`\`\`

## Troubleshooting Comum

### "Trust relationship failed"
\`\`\`powershell
# Re-join ao domínio
Reset-ComputerMachinePassword -Server "DC01.empresa.local"

# Ou via NETDOM
netdom resetpwd /server:DC01.empresa.local /userd:administrator /passwordd:*
\`\`\`

### "Cannot contact domain"
1. Verificar DNS: nslookup empresa.local
2. Testar conectividade: ping DC01.empresa.local
3. Verificar serviços: Netlogon, DNS Client
4. Sincronizar tempo: w32tm /resync

## Auditoria

### Eventos Críticos
\`\`\`powershell
# Login failures (4625)
Get-WinEvent -FilterHashtable @{LogName='Security'; ID=4625} -MaxEvents 100

# Account lockouts (4740)
Get-WinEvent -FilterHashtable @{LogName='Security'; ID=4740} -MaxEvents 50

# Password changes (4724)
Get-WinEvent -FilterHashtable @{LogName='Security'; ID=4724} -MaxEvents 50
\`\`\`

### Contas Inativas
\`\`\`powershell
# Usuários sem login há 90 dias
$Date = (Get-Date).AddDays(-90)
Get-ADUser -Filter * -Properties LastLogonDate | Where-Object {$_.LastLogonDate -lt $Date -and $_.Enabled -eq $true}
\`\`\`

## Melhores Práticas
- Usar contas administrativas separadas
- Implementar Just-In-Time access
- Revisar grupos privilegiados mensalmente
- Monitorar tentativas de login falhadas
- Configurar alertas para lockouts múltiplos`
            },
            {
                title: "Otimização de Performance do Windows",
                slug: "otimizacao-performance-windows",
                category: "sistema",
                subcategory: "performance",
                priority: "alta",
                tags: "windows,performance,otimizacao,lentidao",
                summary: "Guia para diagnóstico e otimização de performance do Windows usando ferramentas nativas.",
                content: `# Otimização de Performance Windows

## Ferramentas de Diagnóstico

### Task Manager (taskmgr.exe)
**Guias Importantes:**
- **Processes:** CPU, Memory, Disk por processo
- **Performance:** Gráficos em tempo real
- **Startup:** Programas de inicialização
- **Details:** Informações técnicas detalhadas

**Interpretação:**
- CPU > 80% sustentado = Problema de processamento
- Memory > 85% = RAM insuficiente
- Disk 100% = Gargalo de armazenamento

### Performance Monitor (perfmon.exe)
**Contadores Críticos:**
- Processor(_Total)\\% Processor Time
- Memory\\Available MBytes
- Memory\\Pages/sec
- PhysicalDisk(_Total)\\% Disk Time

### Resource Monitor (resmon.exe)
- CPU: Processos por core
- Memory: Working Set, Private
- Disk: I/O por processo
- Network: Conexões por processo

## Diagnóstico por Sintoma

### Sistema Lento no Boot
**Investigação:**
\`\`\`cmd
# Verificar programas de startup
wmic startup list full

# Verificar serviços
sc query state= all | findstr "RUNNING"
\`\`\`

**Soluções:**
1. Desabilitar programas desnecessários (msconfig)
2. Configurar serviços para início atrasado
3. Considerar migração para SSD
4. Aumentar RAM se < 8GB

### Alto Uso de CPU
**Causas Comuns:**
- Windows Search indexando
- Windows Update em background
- Antivírus fazendo scan
- Malware
- Drivers com bug

**Comandos:**
\`\`\`powershell
# Top processes por CPU
Get-Process | Sort-Object CPU -Descending | Select-Object -First 10

# Parar Windows Search temporariamente
net stop "Windows Search"
\`\`\`

### Consumo Excessivo de Memória
**Análise:**
\`\`\`powershell
# Processos que mais consomem RAM
Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 10

# Verificar commit memory
Get-Counter "\\Memory\\Committed Bytes","\\Memory\\Commit Limit"
\`\`\`

**Otimizações:**
1. Configurar virtual memory adequadamente
2. Reduzir programas em background
3. Limitar abas do browser
4. Executar memory diagnostic (mdsched.exe)

### Performance de Disco
**Diagnóstico:**
\`\`\`cmd
# Verificar fragmentação (HDD apenas)
defrag C: /A

# Limpeza de arquivos temporários
cleanmgr /sagerun:1
\`\`\`

**Otimizações para SSD:**
\`\`\`cmd
# Verificar se TRIM está habilitado
fsutil behavior set DisableDeleteNotify 0

# Desabilitar indexação se necessário
sc config WSearch start= disabled
\`\`\`

## Otimizações Avançadas

### Registry Tweaks (Usar com Cuidado)
**Desabilitar SuperFetch/SysMain (SSDs):**
- HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Services\\SysMain
- "Start"=dword:00000004

### PowerShell de Limpeza
\`\`\`powershell
# Desabilitar serviços desnecessários
$Services = @('Fax', 'WMPNetworkSvc', 'TabletInputService')
foreach ($Service in $Services) {
    Stop-Service -Name $Service -Force
    Set-Service -Name $Service -StartupType Disabled
}

# Limpar arquivos temporários
Get-ChildItem -Path $env:TEMP -Recurse | Remove-Item -Recurse -Force
\`\`\`

## Troubleshooting BSOD

### Análise de Dump
\`\`\`cmd
# Configurar para dump completo
wmic recoveros set DebugInfoType = 1

# Verificar eventos críticos
wevtutil qe System /q:"*[System[(Level=1 or Level=2)]]" /f:text /c:10
\`\`\`

### Sistema Não Responde
\`\`\`cmd
# Verificar processos travados
tasklist /svc /fi "STATUS eq Not Responding"

# Análise de process tree
wmic process get Name,ProcessId,ParentProcessId
\`\`\`

## Monitoramento Contínuo

### Performance Counters
\`\`\`cmd
# Monitorar CPU ao longo do tempo
logman create counter CPUMonitor -c "\\Processor(_Total)\\% Processor Time" -si 00:00:10

# Monitorar pressão de memória
logman create counter MemMonitor -c "\\Memory\\Available MBytes" -si 00:00:10
\`\`\`

### Health Check Automatizado
\`\`\`powershell
# Script de verificação diária
$CPU = (Get-Counter '\\Processor(_Total)\\% Processor Time').CounterSamples.CookedValue
$Memory = (Get-Counter '\\Memory\\Available MBytes').CounterSamples.CookedValue

if ($CPU -gt 80) { Write-Warning "High CPU usage detected" }
if ($Memory -lt 1000) { Write-Warning "Low memory available" }
\`\`\`

## Escalação
**Quando escalar:**
- BSOD recorrentes
- Performance não melhora após otimizações
- Problemas de hardware suspeitos
- Afeta múltiplos usuários

**Informações para escalação:**
- Event Logs relevantes
- Performance baselines
- Hardware info (msinfo32)
- Lista de software instalado
- Mudanças recentes`
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

### Ameaças Avançadas
- **Fileless Malware:** Executa apenas na memória
- **Living off the Land:** Usa ferramentas legítimas
- **Zero-day Exploits:** Exploram vulnerabilidades desconhecidas
- **APT:** Ameaças persistentes avançadas

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

### Configurações Avançadas
\`\`\`powershell
# Habilitar proteções avançadas
Set-MpPreference -EnableControlledFolderAccess Enabled
Set-MpPreference -EnableNetworkProtection Enabled
Set-MpPreference -PUAProtection Enabled

# Cloud protection
Set-MpPreference -MAPSReporting Advanced
Set-MpPreference -CloudBlockLevel High
\`\`\`

### Controlled Folder Access
\`\`\`powershell
# Proteger pastas contra ransomware
Add-MpPreference -ControlledFolderAccessProtectedFolders "C:\\CriticalData"

# Adicionar aplicações confiáveis
Add-MpPreference -ControlledFolderAccessAllowedApplications "C:\\Program Files\\BackupApp\\backup.exe"
\`\`\`

## Detecção de Malware

### Sinais de Infecção
- Sistema lento sem causa aparente
- Pop-ups suspeitos frequentes
- Programas desconhecidos instalados
- Atividade de rede não usual
- Arquivos/pastas modificados sem autorização

### Análise com Process Monitor
**Filtros recomendados:**
- Process Name contains suspicious.exe
- Path contains \\AppData\\
- Registry contains Run

### Comandos de Investigação
\`\`\`powershell
# Verificar processos em execução
Get-Process | Sort-Object CPU -Descending

# Verificar conexões de rede
Get-NetTCPConnection | Where-Object {$_.State -eq "Established"}

# Verificar hashes de arquivos suspeitos
Get-FileHash "C:\\suspicious\\file.exe" -Algorithm SHA256

# Verificar programas instalados
Get-WmiObject -Class Win32_Product | Select-Object Name, InstallDate
\`\`\`

## Resposta a Incidentes

### Metodologia NIST
1. **Preparation:** Ferramentas e procedimentos
2. **Identification:** Detecção de eventos
3. **Containment:** Isolamento da ameaça
4. **Eradication:** Remoção completa
5. **Recovery:** Restauração de serviços
6. **Lessons Learned:** Análise pós-incidente

### Containment Rápido
\`\`\`powershell
# Isolamento de rede (manter RDP para análise)
New-NetFirewallRule -DisplayName "Block All Outbound" -Direction Outbound -Action Block
New-NetFirewallRule -DisplayName "Allow RDP" -Direction Inbound -Protocol TCP -LocalPort 3389 -Action Allow

# Desabilitar usuário comprometido
Disable-ADAccount -Identity "user.compromised"
\`\`\`

### Coleta de Evidências
\`\`\`cmd
# Informações básicas do sistema
systeminfo > systeminfo.txt
tasklist > processes.txt
netstat -ano > connections.txt

# Event logs críticos
wevtutil qe Security /q:"*[System[(EventID=4688)]]" /f:text > process_creation.txt
wevtutil qe System /q:"*[System[(Level=1 or Level=2)]]" /f:text > critical_events.txt
\`\`\`

## Proteção Contra Ransomware

### Prevenção
- Backup regular e testado
- Patches atualizados
- Controlled Folder Access habilitado
- Educação dos usuários
- Least privilege access

### Volume Shadow Copy Protection
\`\`\`powershell
# Criar shadow copy manual
vssadmin create shadow /for=C:

# Verificar shadow copies existentes
vssadmin list shadows
\`\`\`

### Recovery Strategy
1. **Isolate:** Desconectar da rede imediatamente
2. **Assess:** Determinar extensão da infecção
3. **Identify:** Tipo de ransomware (ID Ransomware tool)
4. **Decrypt:** Verificar se decryptors gratuitos existem
5. **Restore:** Backup limpo anterior à infecção

## Hardening Básico

### Registry Security Settings
**Desabilitar AutoRun:**
- HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer
- "NoDriveTypeAutoRun"=dword:000000ff

**Habilitar UAC:**
- HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System
- "EnableLUA"=dword:00000001

### PowerShell Security
\`\`\`powershell
# Configurar execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine

# Habilitar script block logging
New-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\PowerShell\\ScriptBlockLogging" -Name "EnableScriptBlockLogging" -Value 1
\`\`\`

## Monitoramento

### Event IDs Críticos
- **4688:** Process creation
- **4625:** Failed logon
- **4648:** Logon with explicit credentials
- **7045:** Service installation

### Automated Monitoring
\`\`\`powershell
# Script de monitoramento básico
$SuspiciousEvents = Get-WinEvent -FilterHashtable @{LogName='Security'; ID=4688} -MaxEvents 100 | 
    Where-Object {$_.Message -like "*powershell*" -or $_.Message -like "*cmd*"}

if ($SuspiciousEvents) {
    Send-MailMessage -To "security@company.com" -Subject "Suspicious Activity Detected"
}
\`\`\`

## Escalação
**Quando escalar:**
- Múltiplos endpoints infectados
- Suspeita de APT ou ataque direcionado
- Dados críticos comprometidos
- Sistemas de produção afetados
- Evidência de movimento lateral

**Informações para escalação:**
- Timeline detalhada do incidente
- Logs de segurança relevantes
- Hash de arquivos maliciosos
- Indicadores de comprometimento (IOCs)
- Impacto nos negócios estimado`
            }
        ];

        console.log(`📝 Inserindo ${articles.length} artigos profissionais...`);

        for (const article of articles) {
            const query = `
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
            
            await db.execute(query, [
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
        
        const [articleIds] = await db.execute('SELECT id FROM knowledge_base');
        for (const article of articleIds) {
            const views = Math.floor(Math.random() * 500) + 50;
            const rating = (Math.random() * 2 + 3).toFixed(1);
            
            await db.execute(
                'UPDATE knowledge_base SET views = ?, rating = ? WHERE id = ?',
                [views, rating, article.id]
            );
        }

        // Estatísticas finais
        const [stats] = await db.execute(`
            SELECT 
                COUNT(*) as total,
                COUNT(DISTINCT category) as categories,
                AVG(rating) as avg_rating,
                SUM(views) as total_views
            FROM knowledge_base
        `);

        console.log('\n🎉 Base de Conhecimento Profissional Criada!');
        console.log('=' .repeat(50));
        console.log(`📚 Total de Artigos: ${stats[0].total}`);
        console.log(`📂 Categorias: ${stats[0].categories}`);
        console.log(`⭐ Avaliação Média: ${parseFloat(stats[0].avg_rating).toFixed(1)}/5.0`);
        console.log(`👁️ Total de Visualizações: ${stats[0].total_views}`);
        
        console.log('\n🎯 Para testar:');
        console.log('1. Execute: npm start');
        console.log('2. Acesse a seção "Base de Conhecimento"');
        console.log('3. Teste busca e filtros');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        if (db) await db.end();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    expandKnowledgeBase();
}

module.exports = { expandKnowledgeBase };