// src/config/server.js - Configuração do Servidor HTTP
const http = require('http');

function createServer(app, port) {
    const server = http.createServer(app);
    
    // Configurações do servidor
    server.timeout = 30000; // 30 segundos
    server.keepAliveTimeout = 65000; // 65 segundos
    server.headersTimeout = 66000; // 66 segundos
    
    // Event listeners do servidor
    server.on('listening', () => {
        const addr = server.address();
        const bind = typeof addr === 'string'
            ? `pipe ${addr}`
            : `porta ${addr.port}`;
        console.log(`🌐 Servidor ouvindo em ${bind}`);
    });

    server.on('error', (error) => {
        if (error.syscall !== 'listen') {
            throw error;
        }

        const bind = typeof port === 'string'
            ? `Pipe ${port}`
            : `Porta ${port}`;

        switch (error.code) {
            case 'EACCES':
                console.error(`❌ ${bind} requer privilégios elevados`);
                process.exit(1);
                break;
            case 'EADDRINUSE':
                console.error(`❌ ${bind} já está em uso`);
                console.error(`💡 Tente uma porta diferente ou pare o processo que está usando a porta ${port}`);
                process.exit(1);
                break;
            default:
                throw error;
        }
    });

    server.on('connection', (socket) => {
        socket.setTimeout(30000);
    });

    // Iniciar o servidor
    server.listen(port, '0.0.0.0');
    
    return server;
}

module.exports = { createServer };