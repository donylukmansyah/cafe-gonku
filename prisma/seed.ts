import { PrismaClient, UserRole, MenuCategory, MenuHighlightType } from '@prisma/client'
import { hashPassword } from 'better-auth/crypto'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding database...')
    console.log('📡 Connecting via default Prisma driver (local/tcp)...')

    // CLEANUP
    try {
        await prisma.account.deleteMany({})
        await prisma.session.deleteMany({})
        await prisma.user.deleteMany({
            where: {
                email: { in: ['owner@cafegonku.com', 'admin@cafegonku.com', 'kitchen@cafegonku.com'] }
            }
        })
        console.log('🧹 Cleaned up existing auth data')
    } catch (e) {
        console.log('⚠️ Cleanup minor error (tables might be empty):', e)
    }

    // 1. Create Owner
    const hashedPasswordOwner = await hashPassword('owner123')

    const owner = await prisma.user.create({
        data: {
            email: 'owner@cafegonku.com',
            password: hashedPasswordOwner,
            name: 'Owner Cafe Gonku',
            role: UserRole.OWNER,
            accounts: {
                create: {
                    accountId: 'owner@cafegonku.com',
                    providerId: 'credential',
                    password: hashedPasswordOwner,
                    accessToken: null,
                    refreshToken: null,
                    expiresAt: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
            }
        },
    })
    console.log('✅ Owner user & account created:', owner.email)

    // 2. Create Kitchen
    const hashedPasswordKitchen = await hashPassword('kitchen123')

    const kitchen = await prisma.user.create({
        data: {
            email: 'kitchen@cafegonku.com',
            password: hashedPasswordKitchen,
            name: 'Kitchen Staff',
            role: UserRole.KITCHEN,
            accounts: {
                create: {
                    accountId: 'kitchen@cafegonku.com',
                    providerId: 'credential',
                    password: hashedPasswordKitchen,
                    accessToken: null,
                    refreshToken: null,
                    expiresAt: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }
            }
        },
    })
    console.log('✅ Kitchen user & account created:', kitchen.email)


    // 3. Create Tables with QR Codes
    for (let i = 1; i <= 10; i++) {
        await prisma.table.upsert({
            where: { tableNumber: i },
            update: {},
            create: {
                tableNumber: i,
                qrCode: `GONKU_TABLE_${i}_${Math.random().toString(36).substring(7).toUpperCase()}`,
                capacity: i <= 2 ? 2 : i <= 6 ? 4 : 6,
            },
        })
    }
    console.log('✅ Created 10 tables')

    // 4. Create Sample Menus
    const menuData = [
        { name: 'Nasi Goreng Spesial', description: 'Nasi goreng dengan telur, ayam, dan sayuran', price: 25000, category: MenuCategory.FOOD, highlightType: MenuHighlightType.BEST_SELLER },
        { name: 'Mie Goreng', description: 'Mie goreng dengan sayuran dan telur', price: 20000, category: MenuCategory.FOOD, highlightType: MenuHighlightType.NONE },
        { name: 'Ayam Geprek', description: 'Ayam goreng crispy dengan sambal', price: 22000, category: MenuCategory.FOOD, highlightType: MenuHighlightType.RECOMMENDED },
        { name: 'Es Teh Manis', description: 'Es teh manis segar', price: 5000, category: MenuCategory.DRINK, highlightType: MenuHighlightType.NONE },
        { name: 'Jus Jeruk', description: 'Jus jeruk segar tanpa gula', price: 12000, category: MenuCategory.DRINK, highlightType: MenuHighlightType.NONE },
        { name: 'Kopi Susu', description: 'Kopi robusta dengan susu', price: 15000, category: MenuCategory.DRINK, highlightType: MenuHighlightType.DELICIOUS },
        { name: 'Pisang Goreng', description: 'Pisang goreng crispy dengan keju', price: 10000, category: MenuCategory.SNACK, highlightType: MenuHighlightType.NONE },
        { name: 'French Fries', description: 'Kentang goreng dengan saus', price: 15000, category: MenuCategory.SNACK, highlightType: MenuHighlightType.NONE },
    ]

    for (const menu of menuData) {
        const existingMenu = await prisma.menu.findFirst({
            where: { name: menu.name },
            select: { id: true }
        })

        if (existingMenu) {
            await prisma.menu.update({
                where: { id: existingMenu.id },
                data: menu
            })
            continue
        }

        await prisma.menu.create({ data: menu })
    }
    console.log(`✅ Created ${menuData.length} menus`)

    // 5. Create Menu with Options (Mie Nyemek)
    const existingMieNyemek = await prisma.menu.findFirst({ where: { name: 'Mie Nyemek' } })
    if (!existingMieNyemek) {
        const mieNyemek = await prisma.menu.create({
            data: {
                name: 'Mie Nyemek',
                description: 'Mie instan dengan bumbu spesial',
                price: 15000,
                category: MenuCategory.FOOD,
                highlightType: MenuHighlightType.BEST_SELLER,
                menuOptions: {
                    create: [
                        {
                            name: 'Rasa',
                            isRequired: true,
                            values: {
                                create: [
                                    { label: 'Pedas Jeruk', priceAdjust: 0 },
                                    { label: 'Asin Jeruk', priceAdjust: 0 },
                                    { label: 'Pedas Biasa', priceAdjust: 0 },
                                ],
                            },
                        },
                        {
                            name: 'Level Pedas',
                            isRequired: false,
                            values: {
                                create: [
                                    { label: 'Level 1', priceAdjust: 0 },
                                    { label: 'Level 3', priceAdjust: 0 },
                                    { label: 'Level 5', priceAdjust: 0 },
                                    { label: 'Level 10', priceAdjust: 0 },
                                ],
                            },
                        },
                    ],
                },
            },
        })
        console.log('✅ Created menu with options:', mieNyemek.name)
    } else {
        console.log('✅ Mie Nyemek already exists')
    }

    console.log('🎉 Seeding completed!')
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
