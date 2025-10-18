import { PrismaClient } from '../../generated/prisma/index.js';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding users database...');

  // Limpar dados existentes (apenas em desenvolvimento!)
  if (process.env.NODE_ENV !== 'production') {
    console.log('🗑️  Cleaning existing data...');
    await prisma.balanceHistory.deleteMany();
    await prisma.bankingDetails.deleteMany();
    await prisma.user.deleteMany();
  }

  // Criar usuários de teste
  const usersData = [
    {
      name: 'João Silva',
      email: 'joao@microbank.com',
      password: await argon2.hash('senha123'),
      address: 'Rua Exemplo, 123 - Boa Viagem, Recife - PE, 51020-000',
      profilePicture: 'https://i.pravatar.cc/150?img=1',
      bankingDetails: {
        create: {
          agency: '0001',
          accountNumber: '12345-6',
          balance: 10000.00, // R$ 10.000,00 saldo inicial
        },
      },
    },
    {
      name: 'Maria Santos',
      email: 'maria@microbank.com',
      password: await argon2.hash('senha123'),
      address: 'Av. Boa Viagem, 456 - Pina, Recife - PE, 51011-000',
      profilePicture: 'https://i.pravatar.cc/150?img=5',
      bankingDetails: {
        create: {
          agency: '0001',
          accountNumber: '67890-1',
          balance: 5000.00, // R$ 5.000,00 saldo inicial
        },
      },
    },
    {
      name: 'Pedro Oliveira',
      email: 'pedro@microbank.com',
      password: await argon2.hash('senha123'),
      address: 'Rua do Sol, 789 - Casa Forte, Recife - PE, 52060-000',
      profilePicture: 'https://i.pravatar.cc/150?img=12',
      bankingDetails: {
        create: {
          agency: '0002',
          accountNumber: '11111-2',
          balance: 15000.00, // R$ 15.000,00 saldo inicial
        },
      },
    },
    {
      name: 'Ana Costa',
      email: 'ana@microbank.com',
      password: await argon2.hash('senha123'),
      address: 'Av. Conselheiro Aguiar, 321 - Boa Viagem, Recife - PE, 51021-020',
      profilePicture: 'https://i.pravatar.cc/150?img=9',
      bankingDetails: {
        create: {
          agency: '0003',
          accountNumber: '22222-3',
          balance: 7500.00, // R$ 7.500,00 saldo inicial
        },
      },
    },
    {
      name: 'Carlos Mendes',
      email: 'carlos@microbank.com',
      password: await argon2.hash('senha123'),
      address: 'Rua da Aurora, 654 - Santo Amaro, Recife - PE, 50040-090',
      bankingDetails: {
        create: {
          agency: '0002',
          accountNumber: '33333-4',
          balance: 20000.00, // R$ 20.000,00 saldo inicial
        },
      },
    },
  ];

  for (const userData of usersData) {
    const user = await prisma.user.create({
      data: userData,
      include: { bankingDetails: true },
    });
    
    // Criar histórico de saldo inicial
    if (user.bankingDetails) {
      await prisma.balanceHistory.create({
        data: {
          userId: user.id,
          previousBalance: 0,
          newBalance: user.bankingDetails.balance,
          amount: user.bankingDetails.balance,
          type: 'INITIAL',
          description: 'Saldo inicial da conta',
        },
      });
    }
    
    console.log(`✅ Created user: ${user.email} (Agency: ${user.bankingDetails?.agency}, Account: ${user.bankingDetails?.accountNumber}, Balance: R$ ${user.bankingDetails?.balance})`);
  }

  console.log('✨ Seeding completed successfully!');
  console.log('');
  console.log('📋 Test accounts created:');
  console.log('   Email: joao@microbank.com | Password: senha123');
  console.log('   Email: maria@microbank.com | Password: senha123');
  console.log('   Email: pedro@microbank.com | Password: senha123');
  console.log('   Email: ana@microbank.com | Password: senha123');
  console.log('   Email: carlos@microbank.com | Password: senha123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });