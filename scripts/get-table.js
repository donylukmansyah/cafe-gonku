const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const table = await prisma.table.findFirst();
    console.log('TABLE_QR:', table.qrCode);
    await prisma.$disconnect();
}

main().catch(console.error);
