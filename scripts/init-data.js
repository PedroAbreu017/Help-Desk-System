// scripts/init-data.js
const fs = require('fs').promises;
const path = require('path');

async function initializeData() {
    console.log('🗄️ Inicializando dados do sistema...');
    
    const dataDir = path.join(__dirname, '..', 'data');
    
    try {
        await fs.mkdir(dataDir, { recursive: true });
        
        // Dados iniciais de tickets
        const ticketsData = [];
        await fs.writeFile(
            path.join(dataDir, 'tickets.json'), 
            JSON.stringify(ticketsData, null, 2)
        );
        
        // Dados iniciais de usuários
        const usersData = [
            {
                id: '1',
                name: 'Suporte TI',
                email: 'suporte@empresa.com',
                role: 'technician',
                department: 'TI'
            },
            {
                id: '2',
                name: 'Admin Sistema',
                email: 'admin@empresa.com',
                role: 'admin',
                department: 'TI'
            }
        ];
        await fs.writeFile(
            path.join(dataDir, 'users.json'), 
            JSON.stringify(usersData, null, 2)
        );
        
        console.log('✅ Dados inicializados com sucesso!');
        console.log('📁 Arquivos criados:');
        console.log('  - data/tickets.json');
        console.log('  - data/users.json');
        
    } catch (error) {
        console.error('❌ Erro ao inicializar dados:', error);
    }
}

initializeData();
