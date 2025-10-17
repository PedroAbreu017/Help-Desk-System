// PARTE 1/3 - scripts/expand-knowledge-base-balanced.js 
// EXECUTAR ESTA PARTE PRIMEIRO - Header, imports e primeiros 2 artigos

const mysql = require('mysql2/promise');
require('dotenv').config();

async function expandKnowledgeBaseBalanced() {
    let db;
    
    try {
        console.log('🚀 Expandindo Base de Conhecimento - Perfil TI + Dev...');
        
        db = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root', 
            password: process.env.DB_PASSWORD || 'V@ilos9597',
            database: process.env.DB_NAME || 'helpdesk_system'
        });
        
        console.log('✅ Conectado ao MySQL');
        
        const [users] = await db.execute('SELECT id FROM users LIMIT 1');
        const authorId = users.length > 0 ? users[0].id : '1';
        
        // ARTIGOS BASEADOS NA EXPERIÊNCIA REAL: TI Support + Full Stack Development
        const balancedArticles = [
            // CATEGORIA: SISTEMA (baseado na experiência RIOFIBRA + Docker/Linux)
            {
                title: "Docker Troubleshooting - Containers em Produção",
                slug: "docker-troubleshooting-containers-producao",
                category: "sistema",
                subcategory: "containers",
                priority: "alta",
                tags: "docker,containers,linux,logs,troubleshooting",
                summary: "Diagnóstico e resolução de problemas em containers Docker, baseado em cenários reais de produção.",
                content: `# Docker Troubleshooting - Containers em Produção

## Comandos Essenciais de Diagnóstico

### Status e Monitoramento
\`\`\`bash
# Verificar containers em execução
docker ps -a

# Monitorar recursos em tempo real
docker stats

# Informações detalhadas do container
docker inspect <container_id>

# Verificar logs
docker logs -f --tail 100 <container_id>
\`\`\`

### Análise de Performance
\`\`\`bash
# Uso de CPU e memória por container
docker stats --format "table {{.Container}}\\t{{.CPUPerc}}\\t{{.MemUsage}}"

# Processos dentro do container
docker exec <container_id> ps aux

# Espaço em disco utilizado
docker system df
\`\`\`

## Problemas Comuns e Soluções

### Container Não Inicia
**Sintomas:**
- Status "Exited (1)" ou "Exited (125)"
- Container para imediatamente após start

**Diagnóstico:**
\`\`\`bash
# Verificar logs de erro
docker logs <container_id>

# Testar comando manualmente
docker run --rm -it <image> /bin/bash

# Verificar portas em uso
netstat -tulpn | grep <port>
\`\`\`

**Soluções Comuns:**
- Verificar se porta está disponível
- Validar variáveis de ambiente
- Conferir permissões de arquivo
- Verificar dependências (banco, redis, etc.)

### Alto Uso de Memória
**Diagnóstico:**
\`\`\`bash
# Memory usage detalhado
docker exec <container_id> cat /proc/meminfo

# Processos que mais consomem memória
docker exec <container_id> top -o %MEM
\`\`\`

**Soluções:**
\`\`\`dockerfile
# Definir limites no Dockerfile
FROM node:18-alpine
# Limitar heap do Node.js
ENV NODE_OPTIONS="--max-old-space-size=512"
\`\`\`

### Problemas de Rede
**Diagnóstico:**
\`\`\`bash
# Verificar networks
docker network ls

# Inspecionar network específica
docker network inspect <network_name>

# Testar conectividade entre containers
docker exec -it <container1> ping <container2>
\`\`\`

## Logs Avançados

### Configuração de Logging
\`\`\`yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    image: myapp:latest
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
\`\`\`

### Análise com Ferramentas
\`\`\`bash
# Usar jq para filtrar logs JSON
docker logs <container_id> 2>&1 | jq '.level == "error"'

# Monitorar em tempo real com filtros
docker logs -f <container_id> | grep -i "error\\|exception\\|failed"
\`\`\`

## Health Checks
\`\`\`dockerfile
# Dockerfile com health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3000/health || exit 1
\`\`\`

\`\`\`bash
# Verificar status de saúde
docker inspect --format='{{.State.Health.Status}}' <container_id>
\`\`\`

## Backup e Recovery
\`\`\`bash
# Backup de volume
docker run --rm -v <volume_name>:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz -C /data .

# Restore de volume
docker run --rm -v <volume_name>:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/backup.tar.gz"
\`\`\`

## Troubleshooting por Tecnologia

### Node.js Applications
\`\`\`bash
# Debug de aplicação Node.js
docker exec -it <container> node --inspect=0.0.0.0:9229 app.js

# Memory dump para análise
docker exec <container> kill -USR2 <node_pid>
\`\`\`

### Java Applications
\`\`\`bash
# JVM heap dump
docker exec <container> jcmd <pid> GC.run_finalization
docker exec <container> jcmd <pid> VM.classloader_stats

# Thread dump
docker exec <container> jstack <pid>
\`\`\`

## Monitoramento Contínuo
\`\`\`bash
# Script de monitoramento
#!/bin/bash
while true; do
  echo "$(date): Container Status"
  docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"
  sleep 30
done
\`\`\`

## Melhores Práticas
- Sempre usar multi-stage builds
- Implementar health checks
- Configurar limits de resource
- Usar volumes para dados persistentes
- Manter logs estruturados (JSON)
- Implementar graceful shutdown`
            },
            
            // CATEGORIA: SOFTWARE (baseado em desenvolvimento Spring Boot + Node.js)
            {
                title: "API REST Troubleshooting - Java Spring Boot e Node.js",
                slug: "api-rest-troubleshooting-spring-nodejs",
                category: "software",
                subcategory: "desenvolvimento",
                priority: "alta",
                tags: "api,spring-boot,nodejs,rest,performance,debugging",
                summary: "Diagnóstico e otimização de APIs REST em Java Spring Boot e Node.js para ambientes de produção.",
                content: `# API REST Troubleshooting - Spring Boot e Node.js

## Métricas e Monitoramento

### Indicadores Importantes
- **Response Time**: < 200ms (ideal), < 500ms (aceitável)
- **Throughput**: Requisições por segundo
- **Error Rate**: < 1% em produção
- **CPU Usage**: < 70% sustentado
- **Memory Usage**: < 80% da heap disponível

### Ferramentas de Teste
\`\`\`bash
# Teste básico de performance
curl -w "@curl-format.txt" -s -o /dev/null http://api.example.com/health

# Arquivo curl-format.txt:
# time_namelookup: %{time_namelookup}s\\n
# time_connect: %{time_connect}s\\n
# time_appconnect: %{time_appconnect}s\\n
# time_pretransfer: %{time_pretransfer}s\\n
# time_redirect: %{time_redirect}s\\n
# time_starttransfer: %{time_starttransfer}s\\n
# time_total: %{time_total}s\\n

# Apache Bench para carga
ab -n 1000 -c 10 -H "Content-Type: application/json" http://api.example.com/users

# wrk para testes mais avançados
wrk -t4 -c100 -d30s --timeout 10s http://api.example.com/api/users
\`\`\`

## Spring Boot Troubleshooting

### Configurações de Performance
\`\`\`yaml
# application.yml
server:
  tomcat:
    max-threads: 200
    min-spare-threads: 10
    max-connections: 8192
    accept-count: 100
    connection-timeout: 20000

spring:
  datasource:
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 20000
      idle-timeout: 300000
      max-lifetime: 1200000

management:
  endpoints:
    web:
      exposure:
        include: health,metrics,info,prometheus
  endpoint:
    health:
      show-details: always
\`\`\`

### Debugging de Performance
\`\`\`java
// Adicionar timing em controllers
@RestController
@Slf4j
public class UserController {
    
    @GetMapping("/users")
    public ResponseEntity<List<User>> getUsers() {
        long startTime = System.currentTimeMillis();
        
        try {
            List<User> users = userService.findAll();
            return ResponseEntity.ok(users);
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            log.info("getUsers took {}ms", duration);
        }
    }
}

// Configurar logs para SQL
logging:
  level:
    org.hibernate.SQL: DEBUG
    org.hibernate.type.descriptor.sql.BasicBinder: TRACE
\`\`\`

### JVM Tuning
\`\`\`bash
# Configurações JVM para produção
java -Xms2g -Xmx4g \\
     -XX:+UseG1GC \\
     -XX:G1HeapRegionSize=16m \\
     -XX:+UseStringDeduplication \\
     -XX:+HeapDumpOnOutOfMemoryError \\
     -XX:HeapDumpPath=/tmp/ \\
     -jar application.jar

# Análise de heap dump
jvisualvm
# ou
eclipse MAT (Memory Analyzer Tool)
\`\`\`

## Node.js Troubleshooting

### Configurações de Performance
\`\`\`javascript
// server.js
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');

const app = express();

// Middlewares de performance
app.use(compression());
app.use(helmet());

// Connection pooling para database
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    pool.end();
    process.exit(0);
  });
});
\`\`\`

### Debugging e Profiling
\`\`\`bash
# Executar com profiling
node --prof app.js

# Processar profiling data
node --prof-process isolate-*.log > processed.txt

# Memory debugging
node --inspect=0.0.0.0:9229 app.js
# Chrome DevTools -> chrome://inspect

# Clinic.js para análise avançada
npm install -g clinic
clinic doctor -- node app.js
clinic flame -- node app.js
\`\`\`

### Event Loop Monitoring
\`\`\`javascript
// Monitorar event loop lag
const { performance, PerformanceObserver } = require('perf_hooks');

setInterval(() => {
  const start = performance.now();
  setImmediate(() => {
    const lag = performance.now() - start;
    if (lag > 10) {
      console.warn(\`Event loop lag: \${lag}ms\`);
    }
  });
}, 1000);

// Async/Await best practices
// ❌ Bloqueante
const results = [];
for (const item of items) {
  const result = await processItem(item);
  results.push(result);
}

// ✅ Paralelo
const results = await Promise.all(
  items.map(item => processItem(item))
);
\`\`\`

## Problemas Comuns e Soluções

### N+1 Query Problem
**Spring Boot:**
\`\`\`java
// ❌ Problema N+1
@Entity
public class User {
    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY)
    private List<Order> orders;
}

// ✅ Solução com JOIN FETCH
@Query("SELECT u FROM User u LEFT JOIN FETCH u.orders")
List<User> findAllWithOrders();
\`\`\`

**Node.js:**
\`\`\`javascript
// ❌ Problema N+1
const users = await User.findAll();
for (const user of users) {
  user.orders = await Order.findByUserId(user.id);
}

// ✅ Solução com JOIN
const users = await User.findAll({
  include: [{ model: Order }]
});
\`\`\`

### Memory Leaks
**Identificação:**
\`\`\`bash
# Monitorar memory usage
watch -n 1 'ps aux | grep java | grep -v grep'

# Node.js heap usage
node -e "setInterval(() => console.log(process.memoryUsage()), 1000)"
\`\`\`

**Prevenção:**
\`\`\`javascript
// Limpar timers e listeners
const interval = setInterval(() => {}, 1000);
clearInterval(interval);

process.removeAllListeners('SIGTERM');

// Usar WeakMap para referências fracas
const cache = new WeakMap();
\`\`\`

## Database Connection Issues
\`\`\`bash
# MySQL - verificar conexões ativas
SHOW PROCESSLIST;
SHOW STATUS LIKE 'Threads_%';

# PostgreSQL
SELECT * FROM pg_stat_activity;
\`\`\`

## Rate Limiting e Throttling
\`\`\`javascript
// Express rate limiting
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
\`\`\`

## Logs e Observabilidade
\`\`\`java
// Spring Boot - Structured logging
@Slf4j
@RestController
public class UserController {
    
    @GetMapping("/users/{id}")
    public ResponseEntity<User> getUser(@PathVariable Long id, HttpServletRequest request) {
        MDC.put("userId", id.toString());
        MDC.put("requestId", request.getHeader("X-Request-ID"));
        
        try {
            log.info("Fetching user with id: {}", id);
            User user = userService.findById(id);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            log.error("Error fetching user", e);
            throw e;
        } finally {
            MDC.clear();
        }
    }
}
\`\`\`

\`\`\`javascript
// Node.js - Winston logging
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

app.use((req, res, next) => {
  const duration = Date.now() - req.startTime;
  logger.info({
    method: req.method,
    url: req.url,
    status: res.statusCode,
    duration: \`\${duration}ms\`,
    userAgent: req.get('user-agent')
  });
  next();
});
\`\`\`

## Health Checks e Monitoring
\`\`\`java
// Spring Boot Actuator
@Component
public class DatabaseHealthIndicator implements HealthIndicator {
    
    @Autowired
    private DataSource dataSource;
    
    @Override
    public Health health() {
        try {
            Connection connection = dataSource.getConnection();
            connection.close();
            return Health.up().withDetail("database", "Available").build();
        } catch (Exception e) {
            return Health.down().withDetail("database", e.getMessage()).build();
        }
    }
}
\`\`\`

\`\`\`javascript
// Node.js health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'unknown',
      redis: 'unknown'
    }
  };
  
  try {
    await pool.execute('SELECT 1');
    health.checks.database = 'ok';
  } catch (error) {
    health.checks.database = 'error';
    health.status = 'error';
  }
  
  res.status(health.status === 'ok' ? 200 : 503).json(health);
});
\`\`\``
            }
 ,
            {
                title: "Diagnóstico de Conectividade - ISP e Redes Corporativas",
                slug: "diagnostico-conectividade-isp-redes-corporativas",
                category: "rede",
                subcategory: "conectividade",
                priority: "alta",
                tags: "isp,fibra,conectividade,diagnostico,latencia,throughput",
                summary: "Troubleshooting de conectividade em redes de provedores de internet e ambientes corporativos.",
                content: `# Diagnóstico de Conectividade - ISP e Redes Corporativas

## Metodologia de Diagnóstico

### Teste de Camadas (Bottom-Up)
1. **Física**: Cabos, fibra, equipamentos
2. **Enlace**: Switch, VLAN, MAC
3. **Rede**: IP, roteamento, NAT
4. **Transporte**: TCP/UDP, portas
5. **Aplicação**: DNS, HTTP, serviços

### Comandos Básicos de Diagnóstico
\`\`\`bash
# Teste de conectividade básica
ping -c 4 8.8.8.8
ping -c 4 google.com

# Trace route para identificar saltos
traceroute 8.8.8.8
mtr 8.8.8.8  # MTR combina ping + traceroute

# Teste de DNS
nslookup google.com
dig google.com
systemd-resolve --status

# Verificar interfaces de rede
ip addr show
ip route show
netstat -rn
\`\`\`

## Troubleshooting de Fibra Óptica

### Verificação Física
**Equipamentos Necessários:**
- Power meter óptico
- OTDR (Optical Time Domain Reflectometer)
- Visual Fault Locator (VFL)
- Microscópio para conectores

**Testes Básicos:**
\`\`\`bash
# Verificar status da interface
ethtool eth0

# Informações do link
cat /sys/class/net/eth0/carrier
cat /sys/class/net/eth0/speed
cat /sys/class/net/eth0/duplex

# Logs do kernel para problemas físicos
dmesg | grep -i "eth0\\|network\\|link"
journalctl -u NetworkManager
\`\`\`

### Análise de Performance
\`\`\`bash
# Teste de throughput
iperf3 -c servidor-teste.com
iperf3 -s  # Servidor local

# Teste de latência
ping -i 0.2 -c 100 8.8.8.8 | tail -1

# Jitter e packet loss
ping -i 0.01 -c 1000 8.8.8.8 | grep -E "transmitted|loss"

# Monitoramento contínuo
smokeping  # Para monitoramento histórico
\`\`\`

## Problemas Comuns em ISPs

### Congestão de Link
**Sintomas:**
- Lentidão em horários de pico
- Alto packet loss esporádico
- Variação extrema na latência

**Diagnóstico:**
\`\`\`bash
# Teste em diferentes horários
for hour in {00..23}; do
  echo "Testing at hour: $hour"
  speedtest-cli --simple >> speed_log_$hour.txt
  sleep 3600
done

# Verificar utilização do link
vnstat -i eth0
iftop -i eth0
\`\`\`

### Problemas de Roteamento
**Diagnóstico:**
\`\`\`bash
# Análise detalhada da rota
traceroute -I 8.8.8.8  # ICMP
traceroute -T -p 80 google.com  # TCP
traceroute -U -p 53 8.8.8.8  # UDP

# BGP Looking Glass (se disponível)
# Verificar rotas BGP em looking glass públicos
\`\`\`

### DNS Issues
\`\`\`bash
# Teste de resolução
dig @8.8.8.8 google.com
dig @1.1.1.1 google.com
dig @208.67.222.222 google.com  # OpenDNS

# Verificar cache DNS local
systemd-resolve --flush-caches
systemd-resolve --statistics

# Teste de autoridade DNS
dig google.com NS
dig @ns1.google.com google.com
\`\`\`

## Redes Corporativas

### VLAN Troubleshooting
\`\`\`bash
# Verificar configuração VLAN
ip link show
bridge vlan show

# Configurar VLAN manualmente
ip link add link eth0 name eth0.100 type vlan id 100
ip addr add 192.168.100.10/24 dev eth0.100
ip link set dev eth0.100 up
\`\`\`

### Problemas de DHCP
\`\`\`bash
# Renovar IP via DHCP
dhclient -r eth0  # Release
dhclient eth0     # Renew

# Debug DHCP
dhclient -d eth0  # Debug mode

# Verificar lease
cat /var/lib/dhcp/dhclient.leases
\`\`\`

### Análise de Tráfego
\`\`\`bash
# Captura de pacotes
tcpdump -i eth0 -w capture.pcap
tcpdump -i eth0 port 80 -A

# Análise com tshark
tshark -r capture.pcap -T fields -e ip.src -e ip.dst -e tcp.port

# Monitoramento de largura de banda
nload eth0
bmon -p eth0
iftop -i eth0
\`\`\`

## Ferramentas Avançadas

### Monitoramento Contínuo
\`\`\`bash
# Script de monitoramento de conectividade
#!/bin/bash
LOG_FILE="/var/log/connectivity_monitor.log"
HOSTS="8.8.8.8 1.1.1.1 google.com"

while true; do
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  
  for HOST in $HOSTS; do
    if ping -c 1 -W 3 "$HOST" > /dev/null 2>&1; then
      echo "$TIMESTAMP - $HOST: OK" >> $LOG_FILE
    else
      echo "$TIMESTAMP - $HOST: FAILED" >> $LOG_FILE
    fi
  done
  
  sleep 60
done
\`\`\`

### Análise de Performance
\`\`\`python
# Script Python para análise de latência
import subprocess
import time
import statistics

def ping_analysis(host, count=100):
    cmd = ['ping', '-c', str(count), host]
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    times = []
    for line in result.stdout.split('\\n'):
        if 'time=' in line:
            time_val = float(line.split('time=')[1].split(' ')[0])
            times.append(time_val)
    
    if times:
        return {
            'min': min(times),
            'max': max(times),
            'avg': statistics.mean(times),
            'median': statistics.median(times),
            'stdev': statistics.stdev(times) if len(times) > 1 else 0
        }
    return None

# Uso
stats = ping_analysis('8.8.8.8', 100)
print(f"Latency stats: {stats}")
\`\`\`

## Troubleshooting de Wi-Fi

### Análise de Sinal
\`\`\`bash
# Informações da conexão Wi-Fi
iwconfig wlan0
iw dev wlan0 info

# Scan de redes disponíveis
iwlist wlan0 scan | grep -E "ESSID|Quality|Frequency"

# Força do sinal
watch -n 1 'cat /proc/net/wireless'
\`\`\`

### Problemas de Interferência
\`\`\`bash
# Análise de canais
iw dev wlan0 scan | grep -E "freq|signal"

# Monitoramento contínuo
wavemon  # Interface gráfica para terminal
\`\`\`

## Documentação e Escalação

### Informações para Escalação
**Coleta de Dados:**
\`\`\`bash
# Script de coleta automática
#!/bin/bash
REPORT_DIR="/tmp/network_report_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$REPORT_DIR"

# Informações básicas
ip addr > "$REPORT_DIR/interfaces.txt"
ip route > "$REPORT_DIR/routes.txt"
cat /etc/resolv.conf > "$REPORT_DIR/dns.txt"

# Testes de conectividade
ping -c 10 8.8.8.8 > "$REPORT_DIR/ping_google_dns.txt"
traceroute 8.8.8.8 > "$REPORT_DIR/traceroute_google.txt"

# Logs relevantes
journalctl -u NetworkManager --since "1 hour ago" > "$REPORT_DIR/networkmanager.log"
dmesg | grep -i network > "$REPORT_DIR/kernel_network.log"

echo "Network report saved to: $REPORT_DIR"
\`\`\`

### Baseline de Performance
- **Latência normal**: < 30ms doméstica, < 10ms corporativa
- **Jitter**: < 5ms para VoIP, < 1ms para aplicações críticas
- **Packet loss**: < 0.1% em condições normais
- **Throughput**: Deve atingir 80-90% da velocidade contratada

## Prevenção e Monitoramento

### Alertas Proativos
\`\`\`bash
# Cron job para verificação automática
# /etc/crontab
*/5 * * * * root /usr/local/bin/network_check.sh

# network_check.sh
#!/bin/bash
if ! ping -c 1 8.8.8.8 >/dev/null 2>&1; then
  echo "Network connectivity issue detected at $(date)" | \\
  mail -s "Network Alert" admin@empresa.com
fi
\`\`\`

### Histórico de Performance
- Manter logs de conectividade por 30 dias
- Gráficos de latência e throughput
- Relatórios semanais de disponibilidade
- Documentar incidentes e soluções`
            },
            
            // CATEGORIA: HARDWARE (baseado na experiência de suporte técnico)
            {
                title: "Diagnóstico Avançado de Hardware - Metodologia Sistemática",
                slug: "diagnostico-avancado-hardware-metodologia",
                category: "hardware",
                subcategory: "diagnostico",
                priority: "alta",
                tags: "hardware,diagnostico,metodologia,testes,componentes",
                summary: "Metodologia sistemática para diagnóstico de hardware baseada em experiência prática de suporte técnico.",
                content: `# Diagnóstico Avançado de Hardware - Metodologia Sistemática

## Metodologia de Diagnóstico

### Abordagem Sistemática (Bottom-Up)
1. **Fonte de Alimentação** - Base de tudo
2. **Placa-mãe** - Comunicação entre componentes  
3. **Processador e RAM** - Processamento
4. **Armazenamento** - Persistência de dados
5. **Periféricos** - Dispositivos de entrada/saída

### Ferramentas Essenciais
**Hardware:**
- Multímetro digital
- POST card (diagnóstico de boot)
- Testador de fonte ATX
- Memtest86+ (pen drive bootável)
- Kit de chaves e componentes

**Software:**
- HWiNFO64 - Monitoramento completo
- CrystalDiskInfo - Status de HDs/SSDs
- MemTest86 - Teste de memória
- Prime95 - Stress test de CPU
- FurMark - Stress test de GPU

## Diagnóstico de Fonte de Alimentação

### Teste Visual
\`\`\`
Verificações iniciais:
- Capacitores estufados ou vazando
- Cheiro de queimado
- Ventilador funcionando
- Cabos danificados
- Conector 24 pinos bem encaixado
\`\`\`

### Teste com Multímetro
**Voltagens ATX padrão:**
- +12V: 11.4V - 12.6V
- +5V: 4.75V - 5.25V  
- +3.3V: 3.14V - 3.47V
- -12V: -10.8V - -13.2V
- +5VSB: 4.75V - 5.25V

\`\`\`bash
# Teste paperclip (fonte isolada)
# Conectar pino 16 (verde) com qualquer pino preto
# Fonte deve ligar e ventilador girar

# Medição sob carga
# Conectar resistores ou HD antigo como carga
# Medir voltagens nos conectores Molex/SATA
\`\`\`

### Problemas Comuns
- **Instabilidade**: Voltagens fora da tolerância
- **Ruído elétrico**: Capacitores com problemas
- **Shutdown aleatório**: Proteção térmica ativada
- **Não liga**: Fusível ou circuito de controle

## Diagnóstico de Placa-mãe

### Verificação Visual
\`\`\`
Pontos de inspeção:
- Capacitores estufados (principalmente próximos ao CPU)
- Trilhas queimadas ou oxidadas
- Slots de memória com pinos tortos
- Socket do processador danificado
- Bateria CMOS (CR2032) com carga
\`\`\`

### POST Codes
\`\`\`
Códigos comuns:
00 - Não inicializa
0d - Teste de memória
19 - Teclado não detectado
2A - Data/hora inválida
2B - Inicialização CMOS
FF - Boot normal concluído
\`\`\`

### BIOS/UEFI Reset
\`\`\`bash
# Métodos de reset:
1. Jumper CMOS (consultar manual)
2. Remover bateria por 10 minutos
3. Botão de reset (se disponível)

# Verificar após reset:
- Data/hora do sistema
- Detecção de componentes
- Configurações de boot
- Velocidade da RAM
\`\`\`

## Diagnóstico de Processador

### Verificação de Temperatura
\`\`\`
Temperaturas normais:
- Idle: 30-45°C
- Carga normal: 45-65°C
- Stress test: 65-85°C (máximo)
- Throttling: >90°C
\`\`\`

### Stress Tests
\`\`\`bash
# Prime95 - CPU stress test
# Configurações recomendadas:
- Small FFTs: Máximo aquecimento
- In-place large FFTs: Teste de memória + CPU
- Blend: Teste geral de estabilidade

# Duração mínima: 15 minutos
# Sistema estável: Sem erros ou travamentos
\`\`\`

### Problemas Térmicos
\`\`\`
Diagnóstico:
- Pasta térmica ressecada (trocar a cada 2 anos)
- Cooler mal instalado ou com poeira
- Thermal throttling (redução automática de clock)
- Desligamentos por proteção térmica
\`\`\`

## Diagnóstico de Memória RAM

### MemTest86 - Teste Completo
\`\`\`bash
# Criar pen drive bootável
# Download: memtest86.com

# Procedimento de teste:
1. Boot pelo pen drive
2. Selecionar "Start Test"
3. Deixar rodando por pelo menos 4 passes
4. 0 erros = Memória OK
5. Qualquer erro = Memória defeituosa
\`\`\`

### Teste Individual dos Pentes
\`\`\`
Metodologia:
1. Testar cada pente individualmente
2. Usar diferentes slots da placa-mãe
3. Testar combinações de pentes
4. Verificar compatibilidade (DDR3/DDR4, velocidade)

Problemas comuns:
- Pente defeituoso específico
- Slot da placa-mãe com problema
- Incompatibilidade entre pentes diferentes
- Configuração dual/quad channel incorreta
\`\`\`

### Windows Memory Diagnostic
\`\`\`cmd
# Executar via CMD como admin
mdsched.exe

# Ou via Windows:
# Windows + R -> mdsched -> Enter
# Selecionar "Restart now and check for problems"

# Verificar resultados:
# Event Viewer -> Windows Logs -> System
# Procurar por "MemoryDiagnostics-Results"
\`\`\`

## Diagnóstico de Armazenamento

### Hard Disk (HDD)
\`\`\`bash
# CrystalDiskInfo - Status SMART
# Indicadores críticos:
- Reallocated Sectors Count
- Current Pending Sector Count  
- Uncorrectable Sector Count
- Temperature (> 50°C = alerta)

# Teste de superfície
chkdsk C: /f /r

# HD Tune - Teste de performance
# Verificar gráfico de transfer rate
# Quedas bruscas = setores ruins
\`\`\`

### Solid State Drive (SSD)
\`\`\`bash
# SMART específico para SSD:
- Wear Level Count (desgaste)
- Program/Erase Count
- Available Reserved Space
- Temperature

# Verificar TRIM habilitado
fsutil behavior query DisableDeleteNotify
# Resultado 0 = TRIM habilitado

# Otimizar SSD
defrag C: /O
\`\`\`

### Sintomas de Falhas
- **HDD**: Ruídos estranhos, lentidão extrema, erros de leitura
- **SSD**: Travamentos, arquivos corrompidos, não detectado no boot
- **Ambos**: Blue screens frequentes, sistema não inicia

## Diagnóstico de Placa de Vídeo

### Verificação Básica
\`\`\`bash
# Device Manager
# Verificar se está sendo detectada
# Procurar por "Código 43" ou sinal de exclamação

# Drivers atualizados:
# NVIDIA: GeForce Experience
# AMD: AMD Software
# Intel: Intel Graphics Command Center
\`\`\`

### Stress Test
\`\`\`bash
# FurMark - GPU stress test
# Configurações:
- Resolução nativa
- Anti-aliasing desabilitado
- Duração: 15 minutos

# Temperaturas normais:
- Idle: 30-50°C
- Carga: 60-85°C
- Crítica: >90°C
\`\`\`

### Problemas Visuais
- **Artefatos na tela**: Memória de vídeo com problemas
- **Tela azul/verde**: Driver ou hardware com falha
- **Sem sinal**: Cabo, porta ou placa com defeito
- **Performance baixa**: Thermal throttling ou driver

## Ferramentas de Diagnóstico Completo

### HWiNFO64 - Monitoramento Total
\`\`\`
Informações fornecidas:
- Temperaturas de todos componentes
- Voltagens em tempo real
- Velocidade dos fans
- Utilização de CPU/GPU/RAM
- Status SMART dos drives
- Sensores da placa-mãe
\`\`\`

### CPU-Z - Identificação de Hardware
\`\`\`
Detalhes fornecidos:
- CPU: Modelo, arquitetura, cache, voltagem
- Mainboard: Fabricante, chipset, BIOS
- Memory: Tipo, tamanho, timings, frequência
- Graphics: GPU, memória de vídeo, driver
\`\`\`

## Metodologia de Eliminação

### Configuração Mínima
\`\`\`
Para teste de POST:
1. Fonte de alimentação
2. Placa-mãe
3. 1 pente de RAM
4. Processador + cooler
5. Placa de vídeo (se não houver vídeo onboard)

Progressivamente adicionar:
- Segundo pente de RAM
- Drives de armazenamento  
- Placas de expansão
- Periféricos
\`\`\`

### Teste de Substituição
\`\`\`
Usar componentes conhecidamente funcionais:
1. Trocar fonte por uma testada
2. Testar RAM em outro computador
3. Usar placa de vídeo reserva
4. Conectar HD em outro PC

Regra: Um componente por vez
Documentar cada teste realizado
\`\`\`

## Documentação e Relatório

### Modelo de Relatório
\`\`\`
DIAGNÓSTICO DE HARDWARE
Data: ___________
Técnico: ___________

SINTOMAS RELATADOS:
- Descrição do problema
- Frequência de ocorrência
- Últimas alterações no sistema

TESTES REALIZADOS:
[ ] Fonte de alimentação - Voltagens OK/NOK
[ ] Memória RAM - MemTest86 passes sem erro
[ ] Processador - Stress test 15min sem falhas
[ ] Armazenamento - SMART status OK
[ ] Placa de vídeo - FurMark sem artefatos

COMPONENTE(S) COM DEFEITO:
- Item defeituoso
- Sintoma específico
- Teste que identificou o problema

AÇÃO RECOMENDADA:
- Substituição de componente
- Atualização de driver/BIOS
- Limpeza/manutenção
\`\`\`

## Prevenção e Manutenção

### Cronograma de Manutenção
\`\`\`
Mensal:
- Limpeza de filtros e ventiladores
- Verificação de temperatura dos componentes

Semestral:  
- Troca de pasta térmica do processador
- Backup completo do sistema
- Verificação de cabos e conexões

Anual:
- Teste completo de memória
- Verificação SMART dos HDs
- Atualização de BIOS (se necessário)
\`\`\`

### Sinais de Alerta
- Aumento gradual da temperatura
- Ruídos anormais (cliques, chiados)
- Lentidão progressiva do sistema
- Travamentos esporádicos
- Erros de memória no Event Viewer`
            },
            

            {
                title: "Database Performance Tuning - MySQL e PostgreSQL",
                slug: "database-performance-tuning-mysql-postgresql",
                category: "software",
                subcategory: "database",
                priority: "media",
                tags: "mysql,postgresql,performance,tuning,queries,optimization",
                summary: "Otimização de performance para MySQL e PostgreSQL em aplicações de produção.",
                content: `# Database Performance Tuning - MySQL e PostgreSQL

## Diagnóstico de Performance

### Identificando Problemas
\`\`\`sql
-- MySQL: Verificar queries lentas
SHOW VARIABLES LIKE 'slow_query_log';
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;

-- Ver queries mais lentas
SELECT * FROM mysql.slow_log 
ORDER BY start_time DESC 
LIMIT 10;

-- PostgreSQL: Queries lentas
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
\`\`\`

### Ferramentas de Monitoramento
\`\`\`bash
# MySQL
mysqladmin -u root -p processlist
mysqladmin -u root -p status
mytop  # Ferramenta como htop para MySQL

# PostgreSQL
SELECT * FROM pg_stat_activity;
SELECT * FROM pg_stat_database;
pg_top  # Monitor em tempo real
\`\`\`

## Otimização de Queries

### Análise de Execution Plan
\`\`\`sql
-- MySQL
EXPLAIN FORMAT=JSON 
SELECT u.name, COUNT(o.id) as total_orders 
FROM users u 
LEFT JOIN orders o ON u.id = o.user_id 
GROUP BY u.id;

-- PostgreSQL
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.name, COUNT(o.id) as total_orders 
FROM users u 
LEFT JOIN orders o ON u.id = o.user_id 
GROUP BY u.id;
\`\`\`

### Connection Pooling (Java)
\`\`\`java
// HikariCP configuration
@Configuration
public class DatabaseConfig {
    
    @Bean
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:mysql://localhost:3306/myapp");
        config.setUsername("user");
        config.setPassword("password");
        
        // Pool settings
        config.setMaximumPoolSize(20);
        config.setMinimumIdle(5);
        config.setConnectionTimeout(20000);
        config.setIdleTimeout(300000);
        config.setMaxLifetime(1200000);
        
        return new HikariDataSource(config);
    }
}
\`\`\`

## Backup Strategy
\`\`\`bash
#!/bin/bash
# Backup automatizado MySQL
DB_USER="backup_user"
DB_PASS="backup_pass"
BACKUP_DIR="/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)

mysqldump -u$DB_USER -p$DB_PASS --single-transaction \\
          --routines --triggers --all-databases \\
          > "$BACKUP_DIR/full_backup_$DATE.sql"

gzip "$BACKUP_DIR/full_backup_$DATE.sql"
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
\`\`\``
            },
            
            // CATEGORIA: SISTEMA (Linux para desenvolvimento)
            {
                title: "Linux System Administration - Troubleshooting para Desenvolvedores",
                slug: "linux-system-administration-troubleshooting-desenvolvedores",
                category: "sistema",
                subcategory: "linux",
                priority: "alta",
                tags: "linux,systemd,logs,performance,desenvolvimento,ubuntu",
                summary: "Administração de sistemas Linux focada em ambientes de desenvolvimento e troubleshooting.",
                content: `# Linux System Administration - Troubleshooting para Desenvolvedores

## Diagnóstico de Sistema

### Informações Básicas do Sistema
\`\`\`bash
# Informações do sistema
uname -a
hostnamectl
lsb_release -a

# Uso de recursos
top
htop
free -h
df -h

# Processos e serviços
ps aux
systemctl list-units --failed
systemctl status
\`\`\`

### Análise de Performance
\`\`\`bash
# CPU usage por processo
ps aux --sort=-%cpu | head -10

# Memoria usage por processo  
ps aux --sort=-%mem | head -10

# I/O disk usage
iotop
iostat -x 1

# Network usage
nethogs
iftop
\`\`\`

## Gerenciamento de Serviços (systemd)

### Criar Serviço Custom
\`\`\`ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My Node.js Application
After=network.target

[Service]
Type=simple
User=nodejs
WorkingDirectory=/opt/myapp
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
\`\`\`

\`\`\`bash
# Ativar o serviço
systemctl daemon-reload
systemctl enable myapp
systemctl start myapp
systemctl status myapp
\`\`\`

## Análise de Logs

### Journalctl (systemd logs)
\`\`\`bash
# Logs por prioridade
journalctl -p err
journalctl -p warning

# Logs por tempo
journalctl --since "10 minutes ago"
journalctl --until "1 hour ago"

# Seguir logs em tempo real
journalctl -f
journalctl -f -u nginx
\`\`\`

## Gerenciamento de Processos

### Identificar Processos Problemáticos
\`\`\`bash
# Processos que mais consomem CPU
ps aux --sort=-%cpu | head -10

# Kill por PID
kill PID
kill -9 PID  # Force kill

# Kill por nome
killall process_name
pkill -f "process_pattern"
\`\`\`

## Diagnóstico de Rede

### Conectividade Básica
\`\`\`bash
# Interfaces de rede
ip addr show
ip route show

# Teste de conectividade
ping google.com
traceroute google.com

# DNS
nslookup google.com
dig google.com
\`\`\`

### Análise de Conexões
\`\`\`bash
# Conexões ativas
netstat -tulpn
ss -tulpn  # Versão mais moderna

# Conexões por estado
netstat -an | grep ESTABLISHED
netstat -an | grep LISTEN
\`\`\`

## Storage e File System

### Uso de Disco
\`\`\`bash
# Espaço em disco
df -h
df -i  # Inodes

# Uso por diretório
du -sh /var/log/*
ncdu /  # Interativo

# Arquivos grandes
find / -size +100M -type f 2>/dev/null
\`\`\`

### Monitoramento de I/O
\`\`\`bash
# Disk I/O statistics
iostat -x 1 5

# I/O por processo
iotop

# Filesystem check
fsck /dev/sda1
\`\`\`

## Troubleshooting por Aplicação

### Node.js Applications
\`\`\`bash
# Verificar processo Node.js
ps aux | grep node
pgrep -fl node

# Logs da aplicação
journalctl -f -u myapp

# Memory usage específico
cat /proc/$(pgrep node)/status | grep VmRSS
\`\`\`

### Java Applications
\`\`\`bash
# Verificar processos Java
jps -v

# Thread dump
jstack PID

# Memory dump
jmap -dump:format=b,file=heapdump.hprof PID
\`\`\`

### Docker Applications
\`\`\`bash
# Container stats
docker stats

# Container logs
docker logs -f container_name

# Entrar no container
docker exec -it container_name /bin/bash
\`\`\`

## Segurança e Auditoria

### Verificar Tentativas de Login
\`\`\`bash
# Failed login attempts
grep "Failed password" /var/log/auth.log

# Successful logins
grep "Accepted password" /var/log/auth.log

# SSH connections
grep "sshd" /var/log/auth.log | tail -20
\`\`\`

### Firewall (UFW)
\`\`\`bash
# Status do firewall
ufw status verbose

# Regras básicas
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp

# Habilitar firewall
ufw enable
\`\`\`

## Automatização e Scripts

### Script de Monitoramento
\`\`\`bash
#!/bin/bash
# System health check

echo "=== System Health Check ===" >> /var/log/health.log
date >> /var/log/health.log

# CPU Load
echo "Load Average: $(uptime | awk -F'load average:' '{ print $2 }')" >> /var/log/health.log

# Memory usage
echo "Memory Usage: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')" >> /var/log/health.log

# Disk usage
echo "Disk Usage:" >> /var/log/health.log
df -h | grep -vE '^Filesystem|tmpfs|cdrom' >> /var/log/health.log

# Failed services
echo "Failed Services:" >> /var/log/health.log
systemctl --failed >> /var/log/health.log 2>/dev/null

echo "------------------------" >> /var/log/health.log
\`\`\`

### Crontab para Automação
\`\`\`bash
# Editar crontab
crontab -e

# Executar script de monitoramento a cada 5 minutos
*/5 * * * * /usr/local/bin/health-check.sh

# Backup diário às 2:00 AM
0 2 * * * /usr/local/bin/backup-db.sh

# Limpeza de logs semanalmente
0 3 * * 0 find /var/log -name "*.log" -mtime +30 -delete
\`\`\`

## Otimização de Performance

### Kernel Parameters
\`\`\`bash
# /etc/sysctl.conf
# Network optimization
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216

# File descriptor limits
fs.file-max = 2097152

# Aplicar mudanças
sysctl -p
\`\`\`

### Limits Configuration
\`\`\`bash
# /etc/security/limits.conf
# Increase limits for applications
* soft nofile 65535
* hard nofile 65535
* soft nproc 65535
* hard nproc 65535
\`\`\`

## Melhores Práticas

### Desenvolvimento
- Usar systemd para gerenciar aplicações
- Implementar logs estruturados
- Configurar rotation de logs
- Monitorar recursos continuamente
- Automatizar backups

### Operação
- Manter sistema atualizado
- Configurar alertas proativos
- Documentar configurações
- Implementar monitoramento
- Fazer testes regulares de disaster recovery`
            }
        ];

        console.log(`📝 Inserindo ${balancedArticles.length} artigos técnicos autênticos...`);

        for (const article of balancedArticles) {
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
        
        const [articleIds] = await db.execute('SELECT id FROM knowledge_base WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)');
        for (const article of articleIds) {
            // Métricas baseadas no tipo de artigo
            const views = Math.floor(Math.random() * 300) + 100; // 100-400 views
            const rating = (Math.random() * 1.5 + 3.5).toFixed(1); // 3.5-5.0 rating
            
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

        console.log('\n🎉 Base de Conhecimento Expandida com Sucesso!');
        console.log('=' .repeat(60));
        console.log(`📚 Total de Artigos: ${stats[0].total}`);
        console.log(`📂 Categorias: ${stats[0].categories}`);
        console.log(`⭐ Avaliação Média: ${parseFloat(stats[0].avg_rating).toFixed(1)}/5.0`);
        console.log(`👁️ Total de Visualizações: ${stats[0].total_views}`);
        
        console.log('\n🎯 Artigos Adicionados:');
        console.log('• Docker Troubleshooting (Sistema)');
        console.log('• API REST Performance Java/Node.js (Software)');
        console.log('• Diagnóstico de Conectividade ISP (Rede)');
        console.log('• Diagnóstico Avançado de Hardware (Hardware)');
        console.log('• Database Performance MySQL/PostgreSQL (Software)');
        console.log('• Linux System Administration (Sistema)');
        
        console.log('\n🚀 Para testar:');
        console.log('1. Execute: npm start');
        console.log('2. Acesse a seção "Base de Conhecimento"');
        console.log('3. Teste busca e filtros por categoria');
        console.log('4. Verifique artigos com seu conhecimento técnico real');
        
    } catch (error) {
        console.error('❌ Erro ao expandir knowledge base:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (db) await db.end();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    expandKnowledgeBaseBalanced();
}

module.exports = { expandKnowledgeBaseBalanced };