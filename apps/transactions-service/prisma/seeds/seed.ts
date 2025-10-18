import { 
  PrismaClient, 
  TransactionType, 
  TransactionStatus,
  TransactionEventType 
} from '../../generated/prisma/index.js';


const prisma = new PrismaClient();

// IDs dos usuários do Users Service (devem corresponder aos seeds lá)
const USERS = {
  joao: '6cd9c9c5-eb09-42e5-92c4-500d51f11599', // Substituir pelos IDs reais
  maria: 'c0bd0520-6cc4-496f-a0e5-5bc64a5b049e',
  pedro: '1df6356c-779d-476f-a0b3-5bdd7d64ec90',
  ana: '5c67ab40-55dc-40b7-8f4a-52f94407ae10',
  carlos: '9bba477e-1217-4c4d-8b9d-5f2216a680a6',
  juliana: '553c078e-c347-44bd-9c06-7388d65b3649',
};

async function main() {
  console.log('🌱 Seeding transactions database...');

  // Limpar dados existentes (apenas em desenvolvimento!)
  if (process.env.NODE_ENV !== 'production') {
    console.log('🗑️  Cleaning existing data...');
    await prisma.transactionEvent.deleteMany();
    await prisma.transaction.deleteMany();
  }

  console.log('');
  console.log('💰 Creating transactions...');
  console.log('');

  // ========================================
  // Transação 1: João → Maria (COMPLETED)
  // ========================================
  const tx1 = await prisma.transaction.create({
    data: {
      senderUserId: USERS.joao,
      receiverUserId: USERS.maria,
      amount: 500.00,
      fee: 0.00,
      totalAmount: 500.00,
      description: 'Pagamento aluguel - Outubro',
      type: TransactionType.TRANSFER,
      status: TransactionStatus.COMPLETED,
      completedAt: new Date('2025-10-01T10:30:00Z'),
      ipAddress: '177.10.20.30',
    },
  });

  await createEvent(tx1.id, TransactionEventType.CREATED, null, TransactionStatus.PENDING);
  await createEvent(tx1.id, TransactionEventType.COMPLETED, TransactionStatus.PENDING, TransactionStatus.COMPLETED);
  
  console.log(`✅ Transaction 1: João → Maria (R$ 500,00) - COMPLETED`);

  // ========================================
  // Transação 2: Maria → Pedro (COMPLETED)
  // ========================================
  const tx2 = await prisma.transaction.create({
    data: {
      senderUserId: USERS.maria,
      receiverUserId: USERS.pedro,
      amount: 1200.50,
      fee: 0.00,
      totalAmount: 1200.50,
      description: 'Presente de aniversário',
      type: TransactionType.PIX,
      status: TransactionStatus.COMPLETED,
      completedAt: new Date('2025-10-05T14:20:00Z'),
      ipAddress: '177.10.20.31',
    },
  });

  await createEvent(tx2.id, TransactionEventType.CREATED, null, TransactionStatus.PENDING);
  await createEvent(tx2.id, TransactionEventType.COMPLETED, TransactionStatus.PENDING, TransactionStatus.COMPLETED);
  
  console.log(`✅ Transaction 2: Maria → Pedro (R$ 1.200,50) - COMPLETED`);

  // ========================================
  // Transação 3: Pedro → Ana (FAILED)
  // ========================================
  const tx3 = await prisma.transaction.create({
    data: {
      senderUserId: USERS.pedro,
      receiverUserId: USERS.ana,
      amount: 50000.00,
      fee: 0.00,
      totalAmount: 50000.00,
      description: 'Empréstimo',
      type: TransactionType.TRANSFER,
      status: TransactionStatus.FAILED,
      failureReason: 'Insufficient funds',
      retryCount: 3,
      ipAddress: '177.10.20.32',
    },
  });

  await createEvent(tx3.id, TransactionEventType.CREATED, null, TransactionStatus.PENDING);
  await createEvent(tx3.id, TransactionEventType.PROCESSING_STARTED, TransactionStatus.PENDING, TransactionStatus.PROCESSING);
  await createEvent(tx3.id, TransactionEventType.FAILED, TransactionStatus.PROCESSING, TransactionStatus.FAILED, 'Insufficient funds');
  
  console.log(`❌ Transaction 3: Pedro → Ana (R$ 50.000,00) - FAILED (saldo insuficiente)`);

  // ========================================
  // Transação 4: Ana → João (PENDING)
  // ========================================
  const tx4 = await prisma.transaction.create({
    data: {
      senderUserId: USERS.ana,
      receiverUserId: USERS.joao,
      amount: 150.00,
      fee: 2.50,
      totalAmount: 152.50,
      description: 'Pagamento serviço freelancer',
      type: TransactionType.TED,
      status: TransactionStatus.PENDING,
      ipAddress: '177.10.20.33',
    },
  });

  await createEvent(tx4.id, TransactionEventType.CREATED, null, TransactionStatus.PENDING);
  
  console.log(`⏳ Transaction 4: Ana → João (R$ 150,00 + R$ 2,50 taxa) - PENDING`);

  // ========================================
  // Transação 5: Juliana → Maria (COMPLETED)
  // ========================================
  const tx5 = await prisma.transaction.create({
    data: {
      senderUserId: USERS.juliana,
      receiverUserId: USERS.maria,
      amount: 5000.00,
      fee: 0.00,
      totalAmount: 5000.00,
      description: 'Investimento conjunto',
      type: TransactionType.TRANSFER,
      status: TransactionStatus.COMPLETED,
      completedAt: new Date('2025-10-10T09:15:00Z'),
      ipAddress: '177.10.20.34',
    },
  });

  await createEvent(tx5.id, TransactionEventType.CREATED, null, TransactionStatus.PENDING);
  await createEvent(tx5.id, TransactionEventType.COMPLETED, TransactionStatus.PENDING, TransactionStatus.COMPLETED);
  
  console.log(`✅ Transaction 5: Juliana → Maria (R$ 5.000,00) - COMPLETED`);

  // ========================================
  // Transação 6: Carlos → João (CANCELLED)
  // ========================================
  const tx6 = await prisma.transaction.create({
    data: {
      senderUserId: USERS.carlos,
      receiverUserId: USERS.joao,
      amount: 100.00,
      fee: 0.00,
      totalAmount: 100.00,
      description: 'Pagamento cancelado',
      type: TransactionType.TRANSFER,
      status: TransactionStatus.CANCELLED,
      cancelledAt: new Date('2025-10-12T16:45:00Z'),
      ipAddress: '177.10.20.35',
    },
  });

  await createEvent(tx6.id, TransactionEventType.CREATED, null, TransactionStatus.PENDING);
  await createEvent(tx6.id, TransactionEventType.CANCELLED, TransactionStatus.PENDING, TransactionStatus.CANCELLED, 'Cancelled by user');
  
  console.log(`🚫 Transaction 6: Carlos → João (R$ 100,00) - CANCELLED`);

  // ========================================
  // Transação 7: João → Pedro (PROCESSING)
  // ========================================
  const tx7 = await prisma.transaction.create({
    data: {
      senderUserId: USERS.joao,
      receiverUserId: USERS.pedro,
      amount: 300.00,
      fee: 0.00,
      totalAmount: 300.00,
      description: 'Jantar de equipe',
      type: TransactionType.PIX,
      status: TransactionStatus.PROCESSING,
      ipAddress: '177.10.20.36',
    },
  });

  await createEvent(tx7.id, TransactionEventType.CREATED, null, TransactionStatus.PENDING);
  await createEvent(tx7.id, TransactionEventType.PROCESSING_STARTED, TransactionStatus.PENDING, TransactionStatus.PROCESSING);
  
  console.log(`⚙️  Transaction 7: João → Pedro (R$ 300,00) - PROCESSING`);

  console.log('');
  console.log('✨ Seeding completed successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log('   • Total transactions: 7');
  console.log('   • Completed: 3');
  console.log('   • Pending: 1');
  console.log('   • Processing: 1');
  console.log('   • Failed: 1');
  console.log('   • Cancelled: 1');
  console.log('');
  console.log('💡 Test scenarios available:');
  console.log('   • Successful transactions (completed)');
  console.log('   • Failed transaction (insufficient funds)');
  console.log('   • Pending transaction (awaiting processing)');
  console.log('   • Processing transaction (in progress)');
  console.log('   • Cancelled transaction (user cancellation)');
  console.log('   • Transactions with fees (TED)');
  console.log('   • Different transaction types (TRANSFER, PIX, TED)');
}

async function createEvent(
  transactionId: string,
  eventType: TransactionEventType,
  oldStatus: TransactionStatus | null,
  newStatus: TransactionStatus,
  description?: string,
) {
  await prisma.transactionEvent.create({
    data: {
      transactionId,
      eventType,
      oldStatus,
      newStatus,
      description,
    },
  });
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });