// scripts/add-software-articles.js - Adicionar Artigos de Software
const mysql = require('mysql2/promise');
require('dotenv').config();

async function addSoftwareArticles() {
    let db;
    
    try {
        console.log('🖥️ Adicionando artigos de software...');
        
        db = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root', 
            password: process.env.DB_PASSWORD || 'V@ilos9597',
            database: process.env.DB_NAME || 'helpdesk_system'
        });
        
        console.log('✅ Conectado ao MySQL');
        
        const [users] = await db.execute('SELECT id FROM users LIMIT 1');
        const authorId = users.length > 0 ? users[0].id : '1';
        
        const softwareArticles = [
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

## Problemas do PowerPoint

### Apresentação Trava Durante Execução
**Sintomas:** PowerPoint para de responder durante apresentação
**Soluções:**
- Reduzir qualidade de imagens: Arquivo > Opções > Avançado > Qualidade da Imagem
- Desabilitar transições complexas
- Executar em modo compatibilidade

### Vídeos Não Reproduzem
**Sintomas:** Vídeo aparece como caixa preta ou não inicia
**Soluções:**
- Instalar codecs de vídeo: K-Lite Codec Pack
- Converter vídeo para MP4: Usar Handbrake ou similar
- Verificar caminho do arquivo: Arquivo > Informações > Editar Links

## Problemas do Outlook

### Emails Não Sincronizam
**Sintomas:** Emails antigos não aparecem, sincronização lenta
**Soluções:**
- Verificar configurações de sincronização: Arquivo > Configurações da Conta > Mais Configurações
- Reconstruir índice de pesquisa: Arquivo > Opções > Pesquisar > Opções de Indexação
- Compactar arquivo PST: Arquivo > Informações > Ferramentas de Limpeza

### Outlook Não Inicia
**Sintomas:** Erro ao iniciar, perfil corrompido
**Soluções:**
- Modo de segurança: \`outlook /safe\`
- Criar novo perfil: Painel de Controle > Email > Mostrar Perfis
- Reparar instalação do Office

## Ferramentas de Diagnóstico

### Ferramenta de Reparo do Office
\`\`\`cmd
# Reparo online (requer internet)
OfficeClickToRun.exe scenario=Repair platform=x64 culture=pt-br

# Reparo rápido
Painel de Controle > Programas > Microsoft Office > Alterar > Reparo Rápido
\`\`\`

### Logs de Diagnóstico
- **Word:** %appdata%\\Microsoft\\Word\\
- **Excel:** %appdata%\\Microsoft\\Excel\\
- **PowerPoint:** %appdata%\\Microsoft\\PowerPoint\\
- **Outlook:** %appdata%\\Microsoft\\Outlook\\

## Prevenção de Problemas

### Manutenção Regular
- Manter Office atualizado via Windows Update
- Fazer backup de arquivos importantes
- Limpar arquivos temporários: %temp%
- Verificar espaço em disco disponível

### Configurações Recomendadas
- Habilitar salvamento automático
- Configurar backup do Outlook
- Desabilitar suplementos desnecessários
- Manter apenas uma versão do Office instalada`
            },
            {
                title: "Browsers - Chrome, Edge e Firefox Troubleshooting",
                slug: "browsers-chrome-edge-firefox-troubleshooting",
                category: "software",
                subcategory: "browsers",
                priority: "alta",
                tags: "chrome,edge,firefox,browser,internet,navegador",
                summary: "Soluções para problemas comuns nos principais navegadores: lentidão, travamentos, sites que não carregam.",
                content: `# Troubleshooting de Navegadores

## Problemas Gerais (Todos os Browsers)

### Navegador Lento
**Sintomas:** Páginas demoram para carregar, browser trava
**Soluções Universais:**
- Limpar cache e cookies: Ctrl+Shift+Delete
- Desabilitar extensões desnecessárias
- Verificar uso de memória: Task Manager
- Atualizar para versão mais recente
- Verificar conexão de internet: speedtest.net

### Sites Não Carregam
**Sintomas:** Erro de conexão, página em branco
**Diagnóstico:**
- Testar em modo privado/incógnito
- Testar em outro browser
- Verificar DNS: nslookup site.com
- Testar outro dispositivo na mesma rede

## Google Chrome

### Chrome Específico - Configurações Avançadas
\`\`\`
chrome://settings/reset - Reset configurações
chrome://flags - Funcionalidades experimentais  
chrome://net-internals/#dns - Limpar cache DNS
chrome://extensions - Gerenciar extensões
chrome://settings/content - Configurações de site
\`\`\`

### Problemas Comuns do Chrome
**Alto Uso de Memória:**
- Verificar abas abertas: Shift+Esc (Task Manager do Chrome)
- Desabilitar extensões pesadas
- Habilitar agrupamento de abas
- Usar flag: --memory-pressure-off

**Vídeos Não Reproduzem:**
- Verificar hardware acceleration: chrome://settings > Avançado > Sistema
- Atualizar drivers de vídeo
- Limpar dados do site específico

**Crash Frequente:**
- Verificar conflitos: chrome://conflicts
- Desabilitar sandbox: --no-sandbox (temporário)
- Verificar antivírus interferindo

## Microsoft Edge

### Edge Specific - URLs de Diagnóstico
\`\`\`
edge://settings/reset - Reset configurações
edge://flags - Recursos experimentais
edge://net-internals/#dns - Cache DNS
edge://extensions - Extensões
edge://settings/content - Permissões de site
\`\`\`

### Problemas Específicos do Edge
**Compatibilidade com Sites Antigos:**
- Modo de compatibilidade IE: edge://settings/defaultBrowser
- Adicionar site à lista de compatibilidade
- Configurar modo empresarial

**Problemas de Sincronização:**
- Verificar conta Microsoft: edge://settings/profiles
- Reconfigurar sincronização
- Limpar dados de sincronização

## Mozilla Firefox

### Firefox Specific - Páginas de Configuração
\`\`\`
about:config - Configurações avançadas
about:support - Informações de solução de problemas
about:memory - Uso de memória
about:networking - Diagnósticos de rede
about:profiles - Gerenciar perfis
\`\`\`

### Problemas Específicos do Firefox
**Firefox Lento para Iniciar:**
- Limpar perfil: firefox -safe-mode
- Criar novo perfil: firefox -ProfileManager
- Verificar suplementos problemáticos

**Problemas de Certificado:**
- Verificar data/hora do sistema
- Limpar certificados: about:preferences#privacy
- Adicionar exceção de segurança

## Comandos de Linha de Comando

### Chrome
\`\`\`cmd
# Modo incógnito
chrome --incognito

# Desabilitar extensões
chrome --disable-extensions

# Modo de segurança
chrome --no-sandbox --disable-web-security

# Limpar dados
chrome --user-data-dir="C:\\temp\\chrome_clean"
\`\`\`

### Edge
\`\`\`cmd
# Modo InPrivate
msedge --inprivate

# Desabilitar extensões
msedge --disable-extensions

# Reset total
msedge --reset-variation-state
\`\`\`

### Firefox
\`\`\`cmd
# Modo seguro
firefox -safe-mode

# Novo perfil
firefox -CreateProfile "teste"

# Modo offline
firefox -offline
\`\`\`

## Troubleshooting Avançado

### Problemas de DNS
\`\`\`cmd
# Limpar cache DNS do Windows
ipconfig /flushdns

# Verificar servidores DNS
nslookup site.com
nslookup site.com 8.8.8.8

# Testar conectividade
ping 8.8.8.8
tracert google.com
\`\`\`

### Problemas de Proxy/Firewall
- Verificar configurações de proxy: Configurações de Rede do Windows
- Testar sem proxy: netsh winhttp reset proxy
- Verificar regras de firewall para browsers

### Análise de Performance
**Ferramentas do Developer Tools (F12):**
- Network tab: Verificar recursos que demoram para carregar
- Performance tab: Analisar uso de CPU/memória
- Console: Verificar erros JavaScript
- Security tab: Problemas de certificados

## Manutenção Preventiva

### Limpeza Regular
- Cache e cookies: Semanalmente
- Extensões: Revisar mensalmente  
- Atualizações: Automáticas habilitadas
- Bookmarks: Organizar e limpar

### Configurações de Segurança
- Habilitar bloqueio de pop-ups
- Configurar gerenciador de senhas
- Verificar permissões de sites
- Habilitar proteção contra phishing`
            },
            {
                title: "Instalação e Licenciamento de Software Empresarial",
                slug: "instalacao-licenciamento-software-empresarial",
                category: "software",
                subcategory: "instalacao",
                priority: "alta",
                tags: "instalacao,licenciamento,software,ativacao,empresarial",
                summary: "Procedimentos para instalação, ativação e gerenciamento de licenças de software em ambiente corporativo.",
                content: `# Instalação e Licenciamento de Software

## Planejamento de Instalação

### Levantamento de Requisitos
**Antes da Instalação:**
- Verificar compatibilidade de sistema operacional
- Confirmar requisitos de hardware (RAM, espaço em disco)
- Identificar dependências (Visual C++, .NET Framework)
- Verificar conflitos com software existente
- Planejar downtime necessário

### Preparação do Ambiente
\`\`\`cmd
# Verificar informações do sistema
systeminfo
dxdiag

# Verificar espaço em disco
dir c: /-c
fsutil volume diskfree c:

# Listar software instalado
wmic product get name,version

# Verificar serviços em execução
sc query state= all
\`\`\`

## Tipos de Instalação

### Instalação Manual (Workstations)
**Processo Padrão:**
1. Fazer backup do sistema
2. Criar ponto de restauração: rstrui.exe
3. Fechar aplicações desnecessárias
4. Executar instalador como administrador
5. Seguir wizard de instalação
6. Configurar settings iniciais
7. Testar funcionalidade básica

### Instalação Silenciosa (Deploy em Massa)
\`\`\`cmd
# MSI com parâmetros silenciosos
msiexec /i "software.msi" /quiet /norestart INSTALLDIR="C:\\Program Files\\Software"

# Instalador NSIS
software-installer.exe /S /D="C:\\Program Files\\Software"

# InstallShield
setup.exe /s /v"/qn INSTALLDIR=\"C:\\Program Files\\Software\""

# Log de instalação
msiexec /i "software.msi" /quiet /l*v "install.log"
\`\`\`

### Group Policy Deployment
**Via GPO (Active Directory):**
1. Computer Configuration > Software Installation
2. New > Package
3. Selecionar arquivo MSI em share de rede
4. Configurar deployment method:
   - Assigned: Instalação obrigatória
   - Published: Disponível via Add/Remove Programs

## Gerenciamento de Licenças

### Tipos de Licenciamento
**Volume Licensing (Empresarial):**
- **MAK (Multiple Activation Key)**: Chave única para múltiplas ativações
- **KMS (Key Management Service)**: Servidor interno de ativação
- **Active Directory-Based**: Ativação via domínio

### Microsoft Volume Licensing
\`\`\`cmd
# Verificar status de ativação
slmgr /xpr
slmgr /dlv

# Instalar chave de produto
slmgr /ipk XXXXX-XXXXX-XXXXX-XXXXX-XXXXX

# Ativar online
slmgr /ato

# Configurar servidor KMS
slmgr /skms kms.empresa.local:1688

# Verificar servidor KMS
nslookup -type=srv _vlmcs._tcp.empresa.local
\`\`\`

### Ativação KMS Server
\`\`\`cmd
# No servidor KMS
slmgr /ipk XXXXX-XXXXX-XXXXX-XXXXX-XXXXX (KMS Host Key)
slmgr /ato
slmgr /dlv

# Configurar DNS SRV record
_vlmcs._tcp.empresa.local SRV 0 0 1688 kms.empresa.local
\`\`\`

## Troubleshooting de Instalação

### Problemas Comuns
**Erro de Permissões:**
- Executar como administrador
- Verificar UAC (User Account Control)
- Verificar permissões NTFS na pasta de destino

**Dependências Faltando:**
\`\`\`cmd
# Verificar versões do .NET Framework
reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\NET Framework Setup\\NDP" /s

# Instalar Visual C++ Redistributables
# Baixar de microsoft.com/downloads

# Verificar Windows Updates
sconfig (Windows Server Core)
\`\`\`

**Instalação Incompleta:**
- Verificar logs em %TEMP%
- Usar Windows Installer CleanUp Utility
- Registro manual de DLLs: regsvr32 arquivo.dll

### Logs de Diagnóstico
**Locais Comuns de Logs:**
- Windows Installer: %WINDIR%\\Logs\\
- Application Events: Event Viewer > Application
- MSI Logs: %TEMP%\\MSI*.log
- Software específico: %PROGRAMDATA%\\[Vendor]\\Logs\\

## Adobe Creative Suite

### Instalação Enterprise
- Creative Cloud for Enterprise
- Admin Console para gerenciar licenças
- Pacotes personalizados via Creative Cloud Packager
- Deploy silencioso: installer.exe --silent

### Troubleshooting Adobe
\`\`\`cmd
# Creative Cloud Cleaner Tool
# Baixar de adobe.com/support/

# Verificar processos Adobe em execução
tasklist | findstr adobe

# Limpar preferências corrompidas
# Deletar pasta: %APPDATA%\\Adobe\\
\`\`\`

## Autodesk Software

### Instalação Network License
1. Instalar Network License Manager
2. Configurar arquivo de licença (.lic)
3. Configurar clientes para usar servidor de licença
4. Testar conectividade: telnet licenseserver 27000

### Troubleshooting Autodesk
- Verificar serviços: Autodesk Desktop Licensing Service
- Reset licensing: AdskLicensingInstaller --mode=remove
- Arquivo de log: %LOCALAPPDATA%\\Autodesk\\CLM\\

## Compliance e Auditoria

### Software Asset Management (SAM)
**Ferramentas de Inventário:**
- Microsoft System Center Configuration Manager (SCCM)
- Lansweeper para descoberta de rede
- Scripts PowerShell para auditoria

\`\`\`powershell
# Inventário de software instalado
Get-WmiObject -Class Win32_Product | 
    Select-Object Name, Version, Vendor | 
    Export-Csv "software-inventory.csv"

# Verificar licenças Windows
Get-WmiObject -Query "SELECT * FROM SoftwareLicensingProduct WHERE PartialProductKey IS NOT NULL"
\`\`\`

### Documentação Obrigatória
- Lista de software aprovado pela empresa
- Inventário de licenças vs. instalações
- Processo de aprovação para novas instalações
- Registros de compliance para auditorias

## Automação com PowerShell

### Script de Instalação Automatizada
\`\`\`powershell
# Verificar se software já está instalado
$software = Get-WmiObject -Class Win32_Product | Where-Object {$_.Name -like "*Nome do Software*"}

if (-not $software) {
    # Instalar software
    Start-Process -FilePath "installer.msi" -ArgumentList "/quiet /norestart" -Wait
    
    # Verificar instalação
    $installed = Get-WmiObject -Class Win32_Product | Where-Object {$_.Name -like "*Nome do Software*"}
    if ($installed) {
        Write-Output "Software instalado com sucesso"
    } else {
        Write-Error "Falha na instalação"
    }
}
\`\`\`

## Melhores Práticas

### Padronização
- Manter lista de software aprovado
- Usar sempre versões mais recentes estáveis
- Documentar configurações customizadas
- Manter backups de instaladores

### Segurança
- Verificar assinaturas digitais dos instaladores
- Baixar apenas de fontes oficiais
- Escanear com antivírus antes da instalação
- Implementar Application Control (AppLocker/WDAC)

### Manutenção
- Agendar atualizações regulares
- Monitorar expiração de licenças
- Manter inventário atualizado
- Planejar migração de versões obsoletas`
            },
            {
                title: "Drivers e Compatibilidade - Resolução de Conflitos",
                slug: "drivers-compatibilidade-resolucao-conflitos",
                category: "software",
                subcategory: "drivers",
                priority: "alta",
                tags: "drivers,compatibilidade,conflitos,hardware,windows",
                summary: "Guia completo para identificar, atualizar e resolver problemas de drivers e compatibilidade de software.",
                content: `# Drivers e Compatibilidade de Software

## Identificação de Problemas de Driver

### Sintomas Comuns
**Indicadores de Problemas de Driver:**
- Dispositivos com ponto de exclamação no Device Manager
- Blue Screen of Death (BSOD) com códigos específicos
- Hardware não funcionando ou funcionando incorretamente
- Performance degradada do sistema
- Mensagens de erro específicas do dispositivo

### Ferramentas de Diagnóstico
\`\`\`cmd
# Device Manager via linha de comando
devmgmt.msc

# Informações detalhadas do sistema
msinfo32

# Verificar drivers problemáticos
driverquery /v

# Verificar assinaturas de driver
sigverif

# DxDiag para drivers gráficos
dxdiag
\`\`\`

## Device Manager - Diagnóstico Avançado

### Interpretar Códigos de Erro
**Códigos Comuns:**
- **Código 1**: Device não configurado corretamente
- **Código 10**: Device não pode iniciar
- **Código 28**: Drivers não instalados
- **Código 43**: Device reportou problema
- **Código 52**: Driver não possui assinatura digital válida

### Ações no Device Manager
\`\`\`
Clic direito no dispositivo:
- Update Driver: Buscar automaticamente
- Uninstall Device: Remover completamente
- Disable Device: Desabilitar temporariamente
- Properties > Details: Ver informações técnicas
- Roll Back Driver: Voltar versão anterior
\`\`\`

## Atualização de Drivers

### Métodos de Atualização
**1. Windows Update:**
- Configurações > Update & Security > Windows Update
- Opção: "Buscar atualizações opcionais"
- Incluir drivers de terceiros

**2. Fabricante do Hardware:**
- Site oficial do fabricante (Intel, NVIDIA, AMD, etc.)
- Utilitários próprios (Intel Driver & Support Assistant)
- Download manual baseado em modelo específico

**3. Device Manager:**
- Clic direito > Update Driver
- "Search automatically" ou "Browse my computer"

### PowerShell para Gerenciamento
\`\`\`powershell
# Listar todos os drivers
Get-WmiObject Win32_PnPEntity | Where-Object {$_.ConfigManagerErrorCode -ne 0}

# Verificar drivers sem assinatura
Get-WmiObject Win32_PnPEntity | Where-Object {$_.IsSigned -eq $false}

# Informações detalhadas de driver específico
Get-WmiObject Win32_PnPEntity | Where-Object {$_.Name -like "*Audio*"} | 
    Select-Object Name, Manufacturer, DriverVersion, DriverDate
\`\`\`

## Drivers Gráficos

### NVIDIA
**Ferramentas de Diagnóstico:**
- NVIDIA Control Panel: Verificar configurações
- NVIDIA GeForce Experience: Atualizações automáticas
- nvidia-smi: Command line para GPUs profissionais

\`\`\`cmd
# Verificar driver NVIDIA
nvidia-smi

# Informações detalhadas
nvidia-ml-py --query-gpu=name,driver_version,memory.total --format=csv
\`\`\`

### AMD
**Ferramentas:**
- AMD Radeon Software: Interface principal
- AMD Cleanup Utility: Remoção completa de drivers
- WattMan: Overclock e monitoramento

### Intel
**Intel Graphics:**
- Intel Graphics Control Panel
- Intel Driver & Support Assistant
- Intel Arc Control (para GPUs dedicadas)

## Compatibilidade de Software

### Windows Compatibility Mode
**Configuração Manual:**
1. Clic direito no executável > Properties
2. Compatibility tab
3. Selecionar versão do Windows
4. Opções adicionais:
   - Run in 640x480 resolution
   - Disable fullscreen optimizations
   - Run as administrator

### PowerShell para Compatibility
\`\`\`powershell
# Configurar modo de compatibilidade
Set-ItemProperty -Path "HKCU:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers" -Name "C:\\path\\to\\app.exe" -Value "WIN7RTM"

# Verificar configurações atuais
Get-ItemProperty -Path "HKCU:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers"
\`\`\`

## Resolução de Conflitos

### Conflitos de Driver
**Identificação:**
- Múltiplos drivers para mesmo hardware
- Drivers assinados vs. não assinados
- Versões conflitantes (32-bit vs 64-bit)

**Soluções:**
\`\`\`cmd
# Remover driver completamente
pnputil /delete-driver oem##.inf /uninstall

# Listar drivers de terceiros
pnputil /enum-drivers

# Forçar reinstalação
pnputil /add-driver C:\\path\\to\\driver.inf /install
\`\`\`

### Driver Signature Enforcement
**Desabilitar Temporariamente:**
\`\`\`cmd
# Boot options (F8 durante boot)
# Ou via bcdedit:
bcdedit /set nointegritychecks on
bcdedit /set testsigning on

# Reverter:
bcdedit /set nointegritychecks off
bcdedit /set testsigning off
\`\`\`

## Problemas Específicos por Categoria

### Drivers de Rede
**Problemas Comuns:**
- Perda de conectividade após update do Windows
- Performance reduzida
- Intermitência na conexão

**Diagnóstico:**
\`\`\`cmd
# Status do adaptador de rede
ipconfig /all
netsh interface show interface

# Reset stack TCP/IP
netsh int ip reset
netsh winsock reset

# Reinstalar adaptador de rede
devcon remove "PCI\\VEN_*&DEV_*&SUBSYS_*"
devcon rescan
\`\`\`

### Drivers de Audio
**Troubleshooting:**
- Verificar se device está habilitado: Control Panel > Sound
- Testar diferentes sample rates
- Verificar conflitos com ASIO drivers

\`\`\`cmd
# Windows Audio service
net stop audiosrv
net start audiosrv

# Verificar devices de audio
dxdiag > Sound tab
\`\`\`

### Drivers de Impressora
**Problemas Frequentes:**
- Print spooler travado
- Driver incompatível com Windows 11
- Problemas de comunicação USB/Network

\`\`\`cmd
# Restart print spooler
net stop spooler
net start spooler

# Limpar fila de impressão
del /q /f %systemroot%\\System32\\spool\\printers\\*.*
\`\`\`

## Ferramentas Avançadas

### Driver Verifier
\`\`\`cmd
# Habilitar verificação de drivers
verifier /standard /all

# Verificação específica de driver
verifier /standard /driver driver.sys

# Desabilitar verificação
verifier /reset
\`\`\`

### Windows Driver Kit (WDK)
**Ferramentas Úteis:**
- **DevCon**: Command-line Device Manager
- **PnPUtil**: Gerenciar driver store
- **SignTool**: Verificar assinaturas

### Sysinternals Tools
- **Process Monitor**: Monitorar atividade de drivers
- **Process Explorer**: Ver drivers carregados por processo
- **ListDLLs**: Verificar DLLs carregadas

## Backup e Restauração

### Backup de Drivers
\`\`\`cmd
# Backup automático com DISM
DISM /online /export-driver /destination:C:\\DriversBackup

# Backup seletivo
pnputil /export-driver * C:\\DriversBackup
\`\`\`

### Restauração de Sistema
**Quando Driver Causa Problemas:**
1. Boot em Safe Mode
2. System Restore: rstrui.exe
3. Escolher ponto antes da instalação do driver
4. Ou usar Last Known Good Configuration

### Driver Store Cleanup
\`\`\`cmd
# Limpar drivers antigos
Dism.exe /online /cleanup-image /startcomponentcleanup /resetbase

# Verificar tamanho do driver store
dir C:\\Windows\\System32\\DriverStore\\FileRepository /s
\`\`\`

## Automação e Scripts

### PowerShell para Monitoramento
\`\`\`powershell
# Script de monitoramento de drivers
$ProblemDevices = Get-WmiObject Win32_PnPEntity | 
    Where-Object {$_.ConfigManagerErrorCode -ne 0}

if ($ProblemDevices) {
    $ProblemDevices | Select-Object Name, ConfigManagerErrorCode, Description |
    Export-Csv "driver-problems.csv" -NoTypeInformation
    
    Send-MailMessage -To "admin@empresa.com" -Subject "Driver Issues Detected" -Body "Ver anexo"
}
\`\`\`

### Deployment Script
\`\`\`batch
@echo off
echo Iniciando instalação de drivers...

# Instalar drivers Intel
pnputil /add-driver "C:\\Drivers\\Intel\\*.inf" /subdirs /install

# Instalar drivers NVIDIA
"C:\\Drivers\\NVIDIA\\setup.exe" -s -noreboot

# Verificar instalação
echo Verificando instalação de drivers...
driverquery /v | findstr /i "problema"

echo Instalação concluída!
pause
\`\`\`

## Monitoramento Contínuo

### Logs de Sistema
**Event Viewer - Filtros Importantes:**
- System Log: Errors relacionados a drivers
- Application Log: Crashes de aplicações
- Setup Log: Problemas de instalação

### Scripts de Verificação Automática
\`\`\`powershell
# Verificação diária de drivers problemáticos
$logPath = "C:\\Logs\\driver-check.log"
$date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Verificar drivers com problemas
$problemDrivers = Get-WmiObject Win32_PnPEntity | Where-Object {$_.ConfigManagerErrorCode -ne 0}

if ($problemDrivers) {
    "$date - PROBLEMAS ENCONTRADOS:" | Out-File $logPath -Append
    $problemDrivers | Select-Object Name, ConfigManagerErrorCode | Out-File $logPath -Append
} else {
    "$date - Sistema OK - Nenhum problema de driver detectado" | Out-File $logPath -Append
}
\`\`\`

## Troubleshooting por Categoria de Hardware

### Problemas de Webcam
**Sintomas Comuns:**
- Câmera não detectada no Device Manager
- Imagem escura ou com qualidade ruim
- Não funciona em aplicações específicas

**Soluções:**
- Verificar Privacy Settings: Configurações > Privacidade > Câmera
- Atualizar driver via fabricante (Logitech, Microsoft, etc.)
- Testar com Camera app nativa do Windows

### Problemas de Touchpad/Mouse
**Diagnóstico:**
- Verificar se está habilitado: Configurações > Dispositivos > Touchpad
- Testar em Safe Mode
- Verificar drivers Synaptics/ELAN no Device Manager

**Soluções Específicas:**
- Reinstalar drivers do fabricante
- Verificar configurações de palm rejection
- Testar mouse USB para isolamento do problema`
            }
        ];

        // Verificar estrutura da tabela primeiro
        const [tableInfo] = await db.execute('DESCRIBE knowledge_base');
        const columns = tableInfo.map(col => col.Field);
        console.log('📋 Colunas disponíveis:', columns.join(', '));
        
        // Inserir artigos no banco usando apenas colunas existentes
        for (const article of softwareArticles) {
            const insertQuery = `
                INSERT INTO knowledge_base (
                    title, slug, category, subcategory, priority, tags, summary, content, 
                    author_id, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', NOW(), NOW())
            `;
            
            const values = [
                article.title,
                article.slug,
                article.category,
                article.subcategory,
                article.priority,
                article.tags,
                article.summary,
                article.content,
                authorId
            ];
            
            await db.execute(insertQuery, values);
            console.log(`✅ Adicionado: ${article.title}`);
        }
        
        // Verificar total de artigos
        const [stats] = await db.execute(`
            SELECT 
                COUNT(*) as total,
                COUNT(DISTINCT category) as categories
            FROM knowledge_base 
            WHERE status = 'published'
        `);
        
        console.log('\n🎉 Artigos de Software Adicionados com Sucesso!');
        console.log('='.repeat(50));
        console.log(`📚 Total de Artigos: ${stats[0].total}`);
        console.log(`📂 Categorias: ${stats[0].categories}`);
        console.log('\n📋 Categorias Disponíveis:');
        console.log('- Hardware (diagnóstico, componentes)');
        console.log('- Software (Office, browsers, instalação, drivers)');
        console.log('- Sistema (performance, Active Directory, segurança)');
        console.log('- Rede (troubleshooting OSI)');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        if (db) {
            await db.end();
            console.log('🔌 Conexão fechada');
        }
    }
}

// Executar função
addSoftwareArticles().catch(console.error);