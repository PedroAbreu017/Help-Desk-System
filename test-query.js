const { executeQuery, initDatabase } = require('./src/config/database');

async function testQueries() {
    try {
        // Inicializar database
        await initDatabase();
        
        console.log('=== DIAGNÓSTICO DE QUERIES ===\n');
        
        // Teste 1: Query simples sem parâmetros (deveria funcionar)
        console.log('Teste 1: Query simples sem parâmetros');
        try {
            const result1 = await executeQuery('SELECT COUNT(*) as total FROM users');
            console.log('✅ Usuários:', result1);
        } catch (e) {
            console.log('❌ Erro:', e.message);
        }
        
        // Teste 2: Verificar se tabela knowledge_base existe
        console.log('\nTeste 2: Verificar tabela knowledge_base');
        try {
            const result2 = await executeQuery("SHOW TABLES LIKE 'knowledge%'");
            console.log('✅ Tabelas knowledge:', result2);
        } catch (e) {
            console.log('❌ Erro:', e.message);
        }
        
        // Teste 3: Contar registros na knowledge_base
        console.log('\nTeste 3: Contar registros knowledge_base');
        try {
            const result3 = await executeQuery('SELECT COUNT(*) as total FROM knowledge_base');
            console.log('✅ Total artigos:', result3);
        } catch (e) {
            console.log('❌ Erro:', e.message);
        }
        
        // Teste 4: Query com parâmetros simples
        console.log('\nTeste 4: Query com parâmetros simples');
        try {
            const result4 = await executeQuery('SELECT * FROM users WHERE role = ?', ['admin']);
            console.log('✅ Admins:', result4);
        } catch (e) {
            console.log('❌ Erro:', e.message);
        }
        
        // Teste 5: Query com LIMIT usando parâmetro (onde falha)
        console.log('\nTeste 5: Query com LIMIT parametrizado');
        try {
            const result5 = await executeQuery('SELECT * FROM knowledge_base LIMIT ?', [1]);
            console.log('✅ Com LIMIT:', result5);
        } catch (e) {
            console.log('❌ Erro (esperado):', e.message);
        }
        
        // Teste 6: Query com LIMIT fixo (alternativa)
        console.log('\nTeste 6: Query com LIMIT fixo');
        try {
            const result6 = await executeQuery('SELECT * FROM knowledge_base LIMIT 1');
            console.log('✅ Com LIMIT fixo:', result6);
        } catch (e) {
            console.log('❌ Erro:', e.message);
        }
        
        // Teste 7: Verificar estrutura da tabela
        console.log('\nTeste 7: Estrutura da tabela knowledge_base');
        try {
            const result7 = await executeQuery('DESCRIBE knowledge_base');
            console.log('✅ Estrutura:', result7);
        } catch (e) {
            console.log('❌ Erro:', e.message);
        }
        
    } catch (error) {
        console.error('❌ Erro geral:', error.message);
    } finally {
        console.log('\n=== FIM DOS TESTES ===');
        process.exit(0);
    }
}

testQueries();