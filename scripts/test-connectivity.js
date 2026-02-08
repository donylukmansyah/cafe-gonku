const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- START SIMULATION ---');

    // 1. Get a random active menu
    const menu = await prisma.menu.findFirst({
        where: { isActive: true, isAvailable: true }
    });

    if (!menu) {
        console.log('No active available menu found to test.');
        return;
    }

    console.log(`[1] Selected Menu: ${menu.name} (ID: ${menu.id})`);
    console.log(`    Current Status: AVAILABLE`);

    // 2. Simulate Customer Fetch (Should find it)
    const customerView1 = await prisma.menu.findMany({
        where: { isActive: true, isAvailable: true, id: menu.id }
    });
    console.log(`[2] Customer sees it? ${customerView1.length > 0 ? 'YES' : 'NO'}`);

    // 3. Simulate Kitchen Toggling to OUT OF STOCK
    console.log(`[3] Kitchen toggles ${menu.name} to OUT OF STOCK...`);
    await prisma.menu.update({
        where: { id: menu.id },
        data: { isAvailable: false }
    });

    // 4. Simulate Customer Fetch (Should NOT find it)
    const customerView2 = await prisma.menu.findMany({
        where: { isActive: true, isAvailable: true, id: menu.id }
    });
    console.log(`[4] Customer sees it? ${customerView2.length > 0 ? 'YES' : 'NO'} (Expected: NO)`);

    // 5. Restore Status
    console.log(`[5] Restoring status...`);
    await prisma.menu.update({
        where: { id: menu.id },
        data: { isAvailable: true }
    });
    console.log('--- SIMULATION COMPLETE ---');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
