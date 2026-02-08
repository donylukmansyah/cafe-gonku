# 🚀 Phase 1: Setup & Core - Cafe Gonku

## Checklist Progress:
- [x] Initialize Next.js project
- [x] Setup Tailwind CSS
- [ ] Setup shadcn/ui
- [ ] Setup Prisma + Neon
- [ ] Setup Better Auth
- [ ] Setup Supabase Storage
- [ ] Create database schema
- [ ] Seed initial data

---

# 📦 Step 1: Install All Dependencies

## Single Command untuk Install Semua:

```bash
# Masuk ke folder project dulu
cd cafe-gonku

# Install dependencies
pnpm add next@14.2.0 react@18.3.0 react-dom@18.3.0 @prisma/client@5.20.0 better-auth bcryptjs@2.4.3 socket.io@4.7.0 socket.io-client@4.7.0 zustand@4.5.0 zod@3.23.0 react-hook-form@7.53.0 @hookform/resolvers@3.9.0 @radix-ui/react-dialog@1.1.0 @radix-ui/react-dropdown-menu@2.1.0 @radix-ui/react-toast@1.2.0 @radix-ui/react-select@2.1.0 @radix-ui/react-tabs@1.1.0 lucide-react@0.400.0 sonner@1.5.0 tailwindcss@3.4.0 class-variance-authority@0.7.0 clsx@2.1.0 tailwind-merge@2.5.0 date-fns@3.6.0 qrcode@1.5.3 recharts@2.12.0 midtrans-client@1.3.1 @supabase/supabase-js@2.45.0

# Install devDependencies
pnpm add -D typescript@5.5.0 @types/node@20.14.0 @types/react@18.3.0 @types/react-dom@18.3.0 @types/bcryptjs@2.4.6 eslint@8.57.0 eslint-config-next@14.2.0 prettier@3.3.0 prettier-plugin-tailwindcss@0.6.0 prisma@5.20.0 postcss@8.4.0 autoprefixer@10.4.0 @types/qrcode
```

**ATAU bisa install per kategori:**

### Core Dependencies:
```bash
pnpm add next@14.2.0 react@18.3.0 react-dom@18.3.0
```

### Database & ORM:
```bash
pnpm add @prisma/client@5.20.0
pnpm add -D prisma@5.20.0
```

### Authentication:
```bash
pnpm add better-auth bcryptjs@2.4.3
pnpm add -D @types/bcryptjs@2.4.6
```

### Real-time:
```bash
pnpm add socket.io@4.7.0 socket.io-client@4.7.0
```

### State Management & Validation:
```bash
pnpm add zustand@4.5.0 zod@3.23.0
```

### Forms:
```bash
pnpm add react-hook-form@7.53.0 @hookform/resolvers@3.9.0
```

### UI Components (Radix):
```bash
pnpm add @radix-ui/react-dialog@1.1.0 @radix-ui/react-dropdown-menu@2.1.0 @radix-ui/react-toast@1.2.0 @radix-ui/react-select@2.1.0 @radix-ui/react-tabs@1.1.0
```

### Icons & Toast:
```bash
pnpm add lucide-react@0.400.0 sonner@1.5.0
```

### Styling Utilities:
```bash
pnpm add tailwindcss@3.4.0 class-variance-authority@0.7.0 clsx@2.1.0 tailwind-merge@2.5.0
pnpm add -D postcss@8.4.0 autoprefixer@10.4.0
```

### Utilities:
```bash
pnpm add date-fns@3.6.0 qrcode@1.5.3 recharts@2.12.0
pnpm add -D @types/qrcode
```

### Payment & Storage:
```bash
pnpm add midtrans-client@1.3.1 @supabase/supabase-js@2.45.0
```

### TypeScript & Linting:
```bash
pnpm add -D typescript@5.5.0 @types/node@20.14.0 @types/react@18.3.0 @types/react-dom@18.3.0 eslint@8.57.0 eslint-config-next@14.2.0 prettier@3.3.0 prettier-plugin-tailwindcss@0.6.0
```

---

# 🎨 Step 2: Setup shadcn/ui

```bash
# Initialize shadcn/ui
pnpm dlx shadcn@latest init
```

**Pilih options:**
- Would you like to use TypeScript? → **Yes**
- Which style would you like to use? → **New York** (atau Default)
- Which color would you like to use as base color? → **Slate** (atau pilihan lain)
- Where is your global CSS file? → **src/app/globals.css**
- Would you like to use CSS variables for colors? → **Yes**
- Where is your tailwind.config.js located? → **tailwind.config.ts**
- Configure the import alias for components? → **@/components**
- Configure the import alias for utils? → **@/lib/utils**

**Install komponen yang sering dipake:**
```bash
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add card
pnpm dlx shadcn@latest add input
pnpm dlx shadcn@latest add label
pnpm dlx shadcn@latest add select
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add dropdown-menu
pnpm dlx shadcn@latest add table
pnpm dlx shadcn@latest add badge
pnpm dlx shadcn@latest add toast
pnpm dlx shadcn@latest add form
pnpm dlx shadcn@latest add tabs
pnpm dlx shadcn@latest add avatar
pnpm dlx shadcn@latest add separator
```

---

# 🗄️ Step 3: Setup Prisma + Neon

## 3.1 Initialize Prisma:
```bash
pnpm prisma init
```

Ini akan bikin:
- `prisma/` folder
- `prisma/schema.prisma` file
- `.env` file

## 3.2 Setup Neon Database:

1. **Buka Neon Console:** https://neon.tech
2. **Create New Project:** "db-gonku"
3. **Copy Connection String**

## 3.3 Update `.env`:
```bash
# Database URL dari Neon
DATABASE_URL="postgresql://user:password@hostname/dbname?sslmode=require"


# Better Auth
BETTER_AUTH_SECRET="your-secret-here"
BETTER_AUTH_URL="http://localhost:3000"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Midtrans (nanti setup pas payment)
MIDTRANS_SERVER_KEY=""
MIDTRANS_CLIENT_KEY=""
MIDTRANS_IS_PRODUCTION=false

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Generate BETTER_AUTH_SECRET:**
```bash
# Pake command ini untuk generate secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3.4 Copy Schema Prisma:

Copy file `schema.prisma` yang udah gua bikinin ke `prisma/schema.prisma`

## 3.5 Generate Prisma Client & Push Database:
```bash
# Generate Prisma Client
pnpm prisma generate

# Push schema ke database (development)
pnpm prisma db push

# Atau pakai migration (production-ready)
pnpm prisma migrate dev --name init
```

## 3.6 Bikin Prisma Client Instance:

Bikin file `src/lib/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

# 🔐 Step 4: Setup Better Auth

## 4.1 Bikin Better Auth Config:

Bikin file `src/lib/auth.ts`:
```typescript
import { betterAuth } from "better-auth"
import { prisma } from "./prisma"

export const auth = betterAuth({
  database: {
    provider: "postgresql",
    url: process.env.DATABASE_URL!,
  },
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
})

export type Session = typeof auth.$Infer.Session
```

## 4.2 Bikin API Route untuk Auth:

Bikin file `src/app/api/auth/[...all]/route.ts`:
```typescript
import { auth } from "@/lib/auth"

export const { GET, POST } = auth.handler
```

---

# 📦 Step 5: Setup Supabase Storage

## 5.1 Buka Supabase Console: https://supabase.com

1. **Create New Project:** "cafe-gonku"
2. **Set Region:** Singapore (terdekat dengan Indonesia)
3. **Copy API Keys** dari Settings → API

## 5.2 Create Storage Bucket:

1. Buka **Storage** di sidebar
2. **Create Bucket:** `menu-images`
3. **Set Public:** True (agar bisa diakses langsung)
4. **Set allowed MIME types:** `image/png, image/jpeg, image/jpg, image/webp`

## 5.3 Bikin Supabase Client:

Bikin file `src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function untuk upload image
export async function uploadMenuImage(file: File, menuId: string) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${menuId}-${Date.now()}.${fileExt}`
  const filePath = `menus/${fileName}`

  const { data, error } = await supabase.storage
    .from('menu-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    throw error
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('menu-images')
    .getPublicUrl(filePath)

  return publicUrl
}

// Helper function untuk delete image
export async function deleteMenuImage(imageUrl: string) {
  // Extract file path from URL
  const filePath = imageUrl.split('/menu-images/')[1]
  
  const { error } = await supabase.storage
    .from('menu-images')
    .remove([`menus/${filePath}`])

  if (error) {
    throw error
  }
}
```

---

# 📝 Step 6: Update package.json Scripts

Pastikan `package.json` punya scripts ini:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "prisma:generate": "prisma generate",
    "prisma:studio": "prisma studio",
    "prisma:push": "prisma db push",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "tsx prisma/seed.ts"
  }
}
```

---

# 🌱 Step 7: Seed Initial Data

## 7.1 Install tsx untuk running TypeScript:
```bash
pnpm add -D tsx
```

## 7.2 Bikin Seed File:

Bikin file `prisma/seed.ts`:
```typescript
import { PrismaClient, UserRole, MenuCategory } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // 1. Create Admin User
  const hashedPasswordAdmin = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@cafegonku.com',
      password: hashedPasswordAdmin,
      name: 'Admin Cafe Gonku',
      role: UserRole.ADMIN,
    },
  })
  console.log('✅ Admin user created:', admin.email)

  // 2. Create Kitchen User
  const hashedPasswordKitchen = await bcrypt.hash('kitchen123', 10)
  const kitchen = await prisma.user.create({
    data: {
      email: 'kitchen@cafegonku.com',
      password: hashedPasswordKitchen,
      name: 'Kitchen Staff',
      role: UserRole.KITCHEN,
    },
  })
  console.log('✅ Kitchen user created:', kitchen.email)

  // 3. Create Tables with QR Codes
  const tables = []
  for (let i = 1; i <= 10; i++) {
    const table = await prisma.table.create({
      data: {
        tableNumber: i,
        qrCode: `GONKU_TABLE_${i}_${Math.random().toString(36).substring(7).toUpperCase()}`,
        capacity: i <= 2 ? 2 : i <= 6 ? 4 : 6,
      },
    })
    tables.push(table)
  }
  console.log(`✅ Created ${tables.length} tables`)

  // 4. Create Sample Menus
  const menus = [
    // FOOD
    {
      name: 'Nasi Goreng Spesial',
      description: 'Nasi goreng dengan telur, ayam, dan sayuran',
      price: 25000,
      category: MenuCategory.FOOD,
    },
    {
      name: 'Mie Goreng',
      description: 'Mie goreng dengan sayuran dan telur',
      price: 20000,
      category: MenuCategory.FOOD,
    },
    {
      name: 'Ayam Geprek',
      description: 'Ayam goreng crispy dengan sambal',
      price: 22000,
      category: MenuCategory.FOOD,
    },
    // DRINK
    {
      name: 'Es Teh Manis',
      description: 'Es teh manis segar',
      price: 5000,
      category: MenuCategory.DRINK,
    },
    {
      name: 'Jus Jeruk',
      description: 'Jus jeruk segar tanpa gula',
      price: 12000,
      category: MenuCategory.DRINK,
    },
    {
      name: 'Kopi Susu',
      description: 'Kopi robusta dengan susu',
      price: 15000,
      category: MenuCategory.DRINK,
    },
    // SNACK
    {
      name: 'Pisang Goreng',
      description: 'Pisang goreng crispy dengan keju',
      price: 10000,
      category: MenuCategory.SNACK,
    },
    {
      name: 'French Fries',
      description: 'Kentang goreng dengan saus',
      price: 15000,
      category: MenuCategory.SNACK,
    },
  ]

  for (const menuData of menus) {
    await prisma.menu.create({
      data: menuData,
    })
  }
  console.log(`✅ Created ${menus.length} menus`)

  // 5. Create Menu with Options (Example: Nasi Goreng)
  const nasgor = await prisma.menu.create({
    data: {
      name: 'Mie Nyemek',
      description: 'Mie instan dengan bumbu spesial',
      price: 15000,
      category: MenuCategory.FOOD,
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
  console.log('✅ Created menu with options:', nasgor.name)

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
```

## 7.3 Update prisma/schema.prisma:

Tambahkan di bagian bawah:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ... rest of schema ...

// Seed script
// Run with: pnpm prisma:seed
```

## 7.4 Run Seed:
```bash
pnpm prisma:seed
```

---

# ✅ Verification Checklist

Setelah semua setup, verify:

```bash
# 1. Check Prisma Studio
pnpm prisma:studio
# Buka http://localhost:5555 dan cek apakah data seed sudah ada

# 2. Check TypeScript
pnpm tsc --noEmit

# 3. Check Linting
pnpm lint

# 4. Run Development Server
pnpm dev
# Buka http://localhost:3000
```

---

# 📂 Folder Structure Setelah Setup:

```
cafe-gonku/
├── prisma/
│   ├── schema.prisma    ✅
│   └── seed.ts          ✅
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...all]/
│   │   │           └── route.ts  ✅
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   └── ui/          ✅ (shadcn components)
│   └── lib/
│       ├── prisma.ts    ✅
│       ├── auth.ts      ✅
│       ├── supabase.ts  ✅
│       └── utils.ts     ✅ (dari shadcn)
├── .env                 ✅
├── .env.local           ✅
├── package.json         ✅
├── tsconfig.json        ✅
├── tailwind.config.ts   ✅
└── next.config.js
```

---

# 🎯 Next Steps (Phase 2)

Setelah Phase 1 selesai, lanjut ke:
- [ ] Build Admin Dashboard
- [ ] CRUD Menu
- [ ] QR Code Generator
- [ ] Analytics Dashboard

---

**Phase 1 DONE! 🚀**

Login credentials untuk testing:
- Admin: `admin@cafegonku.com` / `admin123`
- Kitchen: `kitchen@cafegonku.com` / `kitchen123`
