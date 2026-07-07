import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, UserRole, MenuCategory, MenuHighlightType } from '@prisma/client'
import { hashPassword } from 'better-auth/crypto'

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL

if (!connectionString) {
    throw new Error('DIRECT_URL or DATABASE_URL is required to run Prisma seed')
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const shouldSeedTables = process.env.SEED_TABLES === 'true'
const shouldSeedSampleData = process.env.SEED_SAMPLE_DATA === 'true'

type SeedUserConfig = {
    email?: string
    password?: string
    name: string
    // Role user dibatasi enum Prisma: OWNER atau KITCHEN.
    role: UserRole
}

type SeedUser = {
    email: string
    password: string
    name: string
    role: UserRole
}

function getOptionalSeedUser(config: SeedUserConfig): SeedUser | null {
    const { email, password, name, role } = config

    if (!email && !password) return null

    if (!email || !password) {
        throw new Error(`Both email and password are required for seed user role ${role}`)
    }

    if (password.length < 8) {
        throw new Error(`Seed password for ${email} must be at least 8 characters`)
    }

    return {
        email: email.trim().toLowerCase(),
        password,
        name,
        role,
    }
}

async function upsertCredentialUser(config: SeedUser) {
    const hashedPassword = await hashPassword(config.password)

    const user = await prisma.user.upsert({
        where: { email: config.email },
        update: {
            name: config.name,
            role: config.role,
            isActive: true,
            password: hashedPassword,
        },
        create: {
            email: config.email,
            password: hashedPassword,
            name: config.name,
            // Nilai role dari UserRole, jadi tidak bisa selain OWNER/KITCHEN.
            role: config.role,
            isActive: true,
        },
    })

    const existingAccount = await prisma.account.findFirst({
        where: {
            userId: user.id,
            providerId: 'credential',
        },
        select: { id: true },
    })

    if (existingAccount) {
        await prisma.account.update({
            where: { id: existingAccount.id },
            data: {
                accountId: config.email,
                password: hashedPassword,
                updatedAt: new Date(),
            },
        })
    } else {
        await prisma.account.create({
            data: {
                userId: user.id,
                accountId: config.email,
                providerId: 'credential',
                password: hashedPassword,
                accessToken: null,
                refreshToken: null,
                expiresAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        })
    }

    // Invalidate only this seed user's sessions after password/account changes.
    await prisma.session.deleteMany({ where: { userId: user.id } })

    return user
}

async function seedBootstrapUsers() {
    const seedUsers = [
        getOptionalSeedUser({
            email: process.env.SEED_OWNER_EMAIL,
            password: process.env.SEED_OWNER_PASSWORD,
            name: process.env.SEED_OWNER_NAME ?? 'Owner Cafe Gonku',
            role: UserRole.OWNER, // akses dashboard owner
        }),
        getOptionalSeedUser({
            email: process.env.SEED_KITCHEN_EMAIL,
            password: process.env.SEED_KITCHEN_PASSWORD,
            name: process.env.SEED_KITCHEN_NAME ?? 'Kitchen Staff',
            role: UserRole.KITCHEN, // akses halaman kitchen
        }),
    ].filter((user): user is SeedUser => Boolean(user))

    if (seedUsers.length === 0) {
        console.log('ℹ️ No seed users configured. Skipping auth user seed.')
        return
    }

    for (const seedUser of seedUsers) {
        const user = await upsertCredentialUser(seedUser)
        console.log(`✅ ${seedUser.role} user upserted:`, user.email)
    }
}

async function seedDemoTables() {
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

    console.log('✅ Seeded 10 demo tables')
}

async function seedSampleMenus() {
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
            select: { id: true },
        })

        if (existingMenu) {
            await prisma.menu.update({
                where: { id: existingMenu.id },
                data: menu,
            })
            continue
        }

        await prisma.menu.create({ data: menu })
    }

    console.log(`✅ Seeded ${menuData.length} sample menus`)

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
        console.log('✅ Created sample menu with options:', mieNyemek.name)
    } else {
        console.log('✅ Sample menu with options already exists')
    }
}

async function main() {
    console.log('🌱 Seeding database...')
    console.log('📡 Connecting via default Prisma driver (local/tcp)...')

    await seedBootstrapUsers()

    if (shouldSeedTables) {
        await seedDemoTables()
    } else {
        console.log('ℹ️ SEED_TABLES is not true. Skipping demo table seed.')
    }

    if (shouldSeedSampleData) {
        await seedSampleMenus()
    } else {
        console.log('ℹ️ SEED_SAMPLE_DATA is not true. Skipping sample menu seed.')
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
