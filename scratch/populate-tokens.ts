// @ts-nocheck
import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      accessToken: null
    }
  });
  
  console.log(`Found ${orders.length} orders without accessToken.`);
  
  for (const order of orders) {
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.order.update({
      where: { id: order.id },
      data: { accessToken: token }
    });
    console.log(`Updated order ${order.orderCode} with token.`);
  }
  console.log('Successfully populated all access tokens!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
