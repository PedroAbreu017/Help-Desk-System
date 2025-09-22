describe('Basic Performance Tests', () => {
    test('módulos devem carregar rapidamente', () => {
        const start = Date.now();
        
        require('../../src/config/app');
        require('../../src/config/database');
        require('../../src/middleware/auth');
        require('../../src/routes/auth');
        
        const loadTime = Date.now() - start;
        
        expect(loadTime).toBeLessThan(1000); // Menos de 1 segundo para carregar módulos
    });
    
    test('geração de token deve ser rápida', () => {
        const { generateToken } = require('../../src/middleware/auth');
        const testPayload = { userId: 'test', email: 'test@test.com', role: 'user' };
        
        const start = Date.now();
        
        // Gerar 100 tokens
        for (let i = 0; i < 100; i++) {
            generateToken({ ...testPayload, userId: `test-${i}` });
        }
        
        const duration = Date.now() - start;
        
        expect(duration).toBeLessThan(500); // Menos de 500ms para 100 tokens
    });
    
    test('hash de senha deve ser consistente', async () => {
        const bcrypt = require('bcryptjs');
        const password = 'test123';
        
        const start = Date.now();
        const hash = await bcrypt.hash(password, 10);
        const hashTime = Date.now() - start;
        
        // Hash deve ser criado em tempo razoável (bcrypt é intencionalmente lento)
        expect(hashTime).toBeLessThan(200); // Menos de 200ms com salt 10
        expect(hash).toBeDefined();
        
        // Verificar se hash é válido
        const isValid = await bcrypt.compare(password, hash);
        expect(isValid).toBe(true);
    });
});