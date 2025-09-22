const mysql = require('mysql2/promise');

async function testConnection() {
    try {
        console.log('Testando conexão MySQL direta...');
        
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'V@ilos9597',
            database: 'helpdesk_system'
        });
        
        console.log('✅ Conexão MySQL funcionou!');
        
        // Teste uma query
        const [rows] = await connection.execute('SHOW TABLES');
        console.log('Tabelas:', rows);
        
        await connection.end();
    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

testConnection();