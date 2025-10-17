// scripts/add-software-articles-dual.js - Versão MySQL/SQLite compatível
require('dotenv').config();

async function addSoftwareArticles() {
    const { executeQuery, getDatabaseType, initDatabase } = require('../src/config/database');
    
    try {
        console.log('🖥️ Adicionando artigos de software...');
        
        // Inicializar banco (detecta automaticamente MySQL ou SQLite)
        await initDatabase();
        const dbType = getDatabaseType();
        console.log(`✅ Conectado ao ${dbType.toUpperCase()}`);
        
        const users = await executeQuery('SELECT id FROM users LIMIT 1');
        const authorId = users.length > 0 ? users[0].id : '1';
        
        const softwareArticles = [
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

## Mozilla Firefox

### Firefox Specific - Páginas de Configuração
\`\`\`
about:config - Configurações avançadas
about:support - Informações de solução de problemas
about:memory - Uso de memória
about:networking - Diagnósticos de rede
about:profiles - Gerenciar perfis
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

## Manutenção Preventiva

### Limpeza Regular
- Cache e cookies: Semanalmente
- Extensões: Revisar mensalmente  
- Atualizações: Automáticas habilitadas
- Bookmarks: Organizar e limpar`
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

# Log de instalação
msiexec /i "software.msi" /quiet /l*v "install.log"
\`\`\`

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
\`\`\``
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

## Drivers Gráficos

### NVIDIA
**Ferramentas de Diagnóstico:**
- NVIDIA Control Panel: Verificar configurações
- NVIDIA GeForce Experience: Atualizações automáticas
- nvidia-smi: Command line para GPUs profissionais

### AMD
**Ferramentas:**
- AMD Radeon Software: Interface principal
- AMD Cleanup Utility: Remoção completa de drivers
- WattMan: Overclock e monitoramento

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
\`\`\``
            },
            {
                title: "Virtualização - VMware e Hyper-V Troubleshooting",
                slug: "virtualizacao-vmware-hyperv-troubleshooting",
                category: "software",
                subcategory: "virtualizacao",
                priority: "alta",
                tags: "virtualizacao,vmware,hyperv,vm,troubleshooting",
                summary: "Diagnóstico e resolução de problemas em ambientes de virtualização VMware e Microsoft Hyper-V.",
                content: `# Virtualização - Troubleshooting

## VMware Workstation/vSphere

### Problemas Comuns de Performance
**Sintomas:** VM lenta, alto uso de CPU, memória insuficiente
**Diagnóstico:**
- Verificar alocação de recursos: CPU, RAM, Disk
- Monitorar Resource Pool no vCenter
- Verificar VMware Tools instaladas e atualizadas
- Analisar storage performance (IOPS, latência)

**Soluções:**
- Ajustar reservas e limites de recursos
- Habilitar CPU/Memory Hot Add se suportado
- Configurar DRS (Distributed Resource Scheduler)
- Implementar Storage vMotion para balancear I/O

### Problemas de Rede
**Sintomas:** Conectividade intermitente, performance de rede baixa
**Diagnóstico:**
\`\`\`cmd
# No host ESXi
esxcli network nic list
esxcli network vswitch standard list
esxcli network vm list

# Verificar configuração de rede na VM
vmware-toolbox-cmd stat hosttime
vmware-toolbox-cmd stat balloon
\`\`\`

**Soluções:**
- Verificar configuração de vSwitch
- Validar VLAN tagging
- Testar diferentes adaptadores de rede virtual
- Verificar MTU size (jumbo frames)

## Microsoft Hyper-V

### Configuração Básica
\`\`\`powershell
# Verificar status do Hyper-V
Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V

# Habilitar Hyper-V
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All

# Listar VMs
Get-VM

# Verificar status dos Integration Services
Get-VM | Get-VMIntegrationService
\`\`\`

### Troubleshooting Hyper-V
**VM não inicia:**
\`\`\`powershell
# Verificar configuração da VM
Get-VM "VMName" | fl *

# Verificar eventos
Get-WinEvent -LogName "Microsoft-Windows-Hyper-V-VMMS/Admin" -MaxEvents 50

# Verificar recursos disponíveis
Get-VMHost | Select ComputerName, LogicalProcessorCount, TotalMemory
\`\`\`

**Performance Issues:**
\`\`\`powershell
# Verificar Dynamic Memory
Get-VM | Get-VMMemory

# Configurar Dynamic Memory
Set-VMMemory -VMName "VMName" -DynamicMemoryEnabled $true -StartupBytes 2GB -MinimumBytes 512MB -MaximumBytes 8GB

# Verificar CPU usage
Get-VM | Measure-VM
\`\`\`

## Problemas de Armazenamento

### Thin vs Thick Provisioning
**VMware:**
- Thin: Cresce conforme necessário, economia de espaço
- Thick Lazy Zeroed: Espaço alocado imediatamente
- Thick Eager Zeroed: Melhor performance, espaço zerado

**Hyper-V:**
- Dynamic: Similar ao Thin provisioning
- Fixed: Espaço alocado completamente

### Diagnóstico de Storage
\`\`\`cmd
# VMware - verificar datastore usage
vim-cmd hostsvc/datastore/listsummary

# Hyper-V - verificar espaço de VM
Get-VM | Get-VMHardDiskDrive | Select VMName, Path, @{N="SizeGB";E={$_.MaximumSize/1GB}}
\`\`\`

## Backup e Snapshot Management

### VMware Snapshots
**Best Practices:**
- Não manter snapshots por mais de 72 horas
- Consolidar snapshots após uso
- Monitorar crescimento dos arquivos delta

\`\`\`cmd
# Via vSphere CLI
vim-cmd vmsvc/snapshot.get vmid
vim-cmd vmsvc/snapshot.removeall vmid
\`\`\`

### Hyper-V Checkpoints
\`\`\`powershell
# Criar checkpoint
Checkpoint-VM -Name "VMName" -SnapshotName "Before Update"

# Listar checkpoints
Get-VMSnapshot -VMName "VMName"

# Remover checkpoint
Remove-VMSnapshot -VMName "VMName" -Name "SnapshotName"

# Aplicar checkpoint
Restore-VMSnapshot -VMName "VMName" -Name "SnapshotName" -Confirm:$false
\`\`\`

## Integration Services / VMware Tools

### VMware Tools
**Instalação e Atualização:**
- ISO disponível no datastore do ESXi
- Instalar sempre após instalação do SO guest
- Configurar atualização automática via VMware

### Hyper-V Integration Services
\`\`\`powershell
# Verificar status dos services
Get-VM | Get-VMIntegrationService | Where-Object {$_.Enabled -eq $false}

# Habilitar serviços específicos
Enable-VMIntegrationService -VMName "VMName" -Name "Time Synchronization"
\`\`\`

## Troubleshooting Avançado

### Logs Importantes
**VMware ESXi:**
- /var/log/vmkernel.log - Kernel do hypervisor
- /var/log/vmware.log - Eventos gerais
- /var/log/hostd.log - Host daemon

**Hyper-V:**
- Event Viewer > Applications and Services > Microsoft > Windows > Hyper-V-*
- Hyper-V-VMMS - Virtual Machine Management Service
- Hyper-V-Worker - VM Worker Process

### Performance Monitoring
\`\`\`powershell
# Hyper-V performance counters
Get-Counter "\\Hyper-V Hypervisor Virtual Processor(*)\\% Total Run Time" -MaxSamples 5

# VMware - via PowerCLI
Connect-VIServer vcenter.empresa.local
Get-Stat -Entity (Get-VM "VMName") -Stat cpu.usage.average -IntervalMins 5 -MaxSamples 12
\`\`\`

## Migração e P2V/V2V

### Physical to Virtual (P2V)
**VMware vCenter Converter:**
- Suporta hot cloning de máquinas físicas
- Conversão de outros formatos de VM
- Otimização automática para virtual hardware

### Virtual to Virtual (V2V)
**Hyper-V to VMware:**
- Microsoft Virtual Machine Converter (MVMC)
- StarWind V2V Converter (gratuito)
- Conversão manual via disk export/import

## Networking Avançado

### VMware vSphere Networking
**Configuração de Port Groups:**
- Standard vSwitch vs Distributed vSwitch
- VLAN tagging e trunking
- NIC teaming e load balancing

### Hyper-V Virtual Networking
\`\`\`powershell
# Criar virtual switch
New-VMSwitch -Name "Internal Network" -SwitchType Internal

# Configurar VLAN
Set-VMNetworkAdapterVlan -VMName "VMName" -VlanId 10 -Access

# Verificar configuração de rede
Get-VMNetworkAdapter -VMName "VMName" | fl *
\`\`\`

## Licenciamento

### VMware Licensing
- vSphere Standard vs Enterprise Plus
- Per-processor licensing
- vCenter Server licensing separado

### Hyper-V Licensing
- Incluído no Windows Server
- CALs necessárias para VMs Windows
- Datacenter edition para VMs ilimitadas

## Disaster Recovery

### VMware Site Recovery Manager
- Replicação baseada em array ou vSphere Replication
- Automated failover e failback
- Non-disruptive testing

### Hyper-V Replica
\`\`\`powershell
# Configurar replicação
Enable-VMReplication -VMName "VMName" -ReplicaServerName "DR-Server" -ReplicaServerPort 80 -AuthenticationType Integrated

# Iniciar replicação inicial
Start-VMInitialReplication -VMName "VMName"

# Failover de teste
Start-VMFailover -VMName "VMName" -Test
\`\`\`

## Melhores Práticas

### Sizing e Capacity Planning
- CPU: Não over-commit além de 4:1 para workloads críticos
- RAM: Monitorar balloon memory e swapping
- Storage: IOPS requirements vs. available performance
- Network: Bandwidth planning e redundância

### Security
- Isolamento de rede entre diferentes tiers
- Patch management para hypervisor e guest OS
- Role-based access control (RBAC)
- Encryption at rest e in transit`
            }
        ];

        // Verificar se já existem artigos de software para evitar duplicatas
        const existingSoftwareArticles = await executeQuery(
            'SELECT COUNT(*) as count FROM knowledge_base WHERE category = ?', 
            ['software']
        );

        if (existingSoftwareArticles[0].count > 0) {
            console.log(`⚠️ Já existem ${existingSoftwareArticles[0].count} artigos de software. Limpando categoria...`);
            await executeQuery('DELETE FROM knowledge_base WHERE category = ?', ['software']);
        }

        // Inserir artigos usando sintaxe compatível
        for (const article of softwareArticles) {
            let insertQuery;
            if (dbType === 'mysql') {
                insertQuery = `
                    INSERT INTO knowledge_base (
                        title, slug, category, subcategory, priority, tags, summary, content, 
                        author_id, status, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', NOW(), NOW())
                `;
            } else {
                // SQLite
                insertQuery = `
                    INSERT INTO knowledge_base (
                        title, slug, category, subcategory, priority, tags, summary, content, 
                        author_id, status, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', datetime('now'), datetime('now'))
                `;
            }
            
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
            
            await executeQuery(insertQuery, values);
            console.log(`✅ Adicionado: ${article.title}`);
        }
        
        // Verificar total de artigos
        const stats = await executeQuery(`
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
        console.log(`💾 Banco de Dados: ${dbType.toUpperCase()}`);
        console.log('\n📋 Categorias Disponíveis:');
        console.log('- Hardware (diagnóstico, componentes)');
        console.log('- Software (Office, browsers, instalação, drivers, virtualização)');
        console.log('- Sistema (performance, Active Directory, segurança)');
        console.log('- Rede (troubleshooting OSI)');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    addSoftwareArticles();
}

module.exports = { addSoftwareArticles };