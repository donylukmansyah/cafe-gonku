# 🚀 Tech Stack - QR Restaurant Ordering System

## ✅ Stack yang Udah Lu Tentuin:

### 1. **Framework**
- **Next.js 16+** (App Router)
  - Fullstack framework
  - Server Components & Server Actions
  - API Routes
  - File-based routing

### 2. **Database**
- **Neon PostgreSQL**
  - Serverless Postgres
  - Auto-scaling
  - Free tier: 0.5GB storage, 1 compute unit
  - URL: https://neon.tech

### 3. **ORM**
- **Prisma**
  - Type-safe database queries
  - Auto-generated types
  - Migration support
  - Prisma Studio untuk GUI

### 4. **File Storage (Images)**
- **Supabase Storage**
  - Untuk upload gambar menu
  - Public bucket untuk menu images
  - CDN included
  - Free tier: 1GB storage

### 5. **Authentication**
- **Better Auth**
  - Modern auth library
  - Email/Password
  - Session management
  - Role-based access (Admin, Kitchen)
  - URL: https://better-auth.com

### 6. **Real-time**
- **Socket.io**
  - Kitchen dashboard updates real-time
  - Order status changes
  - New orders notification

### 7. **Validation**
- **Zod**
  - Schema validation
  - Type inference
  - Form validation
  - API request validation

### 8. **State Management**
- **Zustand**
  - Simple & lightweight
  - Cart management
  - User session state
  - No boilerplate

---

## 🆕 Tambahin yang Kurang (Recommended):

### 9. **Styling**
- **Tailwind CSS**
  - Utility-first CSS
  - Responsive design
  - Dark mode support
- **shadcn/ui**
  - Component library built on Tailwind
  - Accessible components
  - Customizable

### 10. **UI Components**
- **Radix UI**
  - Unstyled, accessible components
  - Dialog, Dropdown, Toast, dll
- **Lucide Icons**
  - Icon library
  - React components

### 11. **Form Handling**
- **React Hook Form**
  - Form state management
  - Integration dengan Zod
  - Performance optimized

### 12. **Payment Gateway**
- **Midtrans**
  - Payment gateway Indonesia
  - Snap integration (popup)
  - Multiple payment methods (QRIS, VA, Credit Card)
  - Webhook untuk payment confirmation

### 13. **QR Code**
- **qrcode** (npm)
  - Generate QR code
  - Untuk admin generate QR per meja
- **react-qr-scanner** atau **html5-qrcode**
  - Scan QR code (optional, biasa user langsung klik link)

### 14. **Date & Time**
- **date-fns**
  - Manipulasi tanggal
  - Format tanggal Indonesia
  - Lightweight alternative to moment.js

### 15. **Charts/Analytics**
- **Recharts**
  - Chart library untuk admin dashboard
  - Line chart, bar chart untuk sales report

### 16. **Toast/Notifications**
- **Sonner** atau **react-hot-toast**
  - Toast notifications
  - Success/error messages

### 17. **Loading States**
- **React Loading Skeleton**
  - Skeleton loading UI

### 18. **Development Tools**
- **TypeScript**
  - Type safety
  - Better DX
- **ESLint + Prettier**
  - Code formatting
  - Linting
- **Husky + lint-staged**
  - Pre-commit hooks

### 19. **Deployment**
- **Vercel**
  - Deploy Next.js
  - Edge Functions
  - Free tier available
  - Auto SSL

### 20. **Environment Variables**
- **.env.local**
  - Database URL (Neon)
  - Supabase keys
  - Midtrans API keys
  - Better Auth secrets

---

## 📦 Package.json Dependencies

```json
{
  "name": "qr-restaurant-ordering",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "prisma:generate": "prisma generate",
    "prisma:studio": "prisma studio",
    "prisma:push": "prisma db push"
  },
  "dependencies": {
    // Core
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    
    // Database & ORM
    "@prisma/client": "^5.20.0",
    
    // Authentication
    "better-auth": "^1.0.0",
    "bcryptjs": "^2.4.3",
    
    // Real-time
    "socket.io": "^4.7.0",
    "socket.io-client": "^4.7.0",
    
    // State Management
    "zustand": "^4.5.0",
    
    // Validation
    "zod": "^3.23.0",
    
    // Forms
    "react-hook-form": "^7.53.0",
    "@hookform/resolvers": "^3.9.0",
    
    // UI Components
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "@radix-ui/react-toast": "^1.2.0",
    "@radix-ui/react-select": "^2.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "lucide-react": "^0.400.0",
    "sonner": "^1.5.0",
    
    // Styling
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0",
    
    // Utilities
    "date-fns": "^3.6.0",
    "qrcode": "^1.5.3",
    "recharts": "^2.12.0",
    
    // Payment
    "midtrans-client": "^1.3.1",
    
    // File Upload (Supabase)
    "@supabase/supabase-js": "^2.45.0"
  },
  "devDependencies": {
    // TypeScript
    "typescript": "^5.5.0",
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/bcryptjs": "^2.4.6",
    
    // Linting & Formatting
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.0",
    "prettier": "^3.3.0",
    "prettier-plugin-tailwindcss": "^0.6.0",
    
    // Prisma
    "prisma": "^5.20.0",
    
    // PostCSS
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

---

## 🗂️ Project Structure

```
qr-restaurant-ordering/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed data
│
├── public/
│   └── images/                # Static images
│
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/            # Auth routes
│   │   │   ├── login/
│   │   │   └── register/
│   │   │
│   │   ├── (customer)/        # Customer routes
│   │   │   ├── order/         # Scan QR, browse menu
│   │   │   └── payment/       # Payment page
│   │   │
│   │   ├── (kitchen)/         # Kitchen dashboard
│   │   │   └── dashboard/
│   │   │
│   │   ├── (admin)/           # Admin dashboard
│   │   │   ├── dashboard/
│   │   │   ├── menus/
│   │   │   ├── tables/
│   │   │   └── analytics/
│   │   │
│   │   ├── api/               # API Routes
│   │   │   ├── auth/
│   │   │   ├── menus/
│   │   │   ├── orders/
│   │   │   ├── tables/
│   │   │   ├── upload/        # Image upload
│   │   │   └── webhooks/
│   │   │       └── midtrans/  # Payment webhook
│   │   │
│   │   ├── layout.tsx
│   │   └── page.tsx           # Landing page
│   │
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── menu/
│   │   ├── cart/
│   │   ├── order/
│   │   └── layout/
│   │
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client
│   │   ├── auth.ts            # Better Auth config
│   │   ├── supabase.ts        # Supabase client
│   │   ├── socket.ts          # Socket.io setup
│   │   ├── midtrans.ts        # Midtrans config
│   │   └── utils.ts           # Utility functions
│   │
│   ├── hooks/
│   │   ├── use-cart.ts        # Cart hook (Zustand)
│   │   ├── use-socket.ts      # Socket.io hook
│   │   └── use-auth.ts        # Auth hook
│   │
│   ├── store/
│   │   ├── cart.ts            # Cart store (Zustand)
│   │   └── user.ts            # User store (Zustand)
│   │
│   ├── types/
│   │   └── index.ts           # TypeScript types
│   │
│   └── validations/
│       ├── menu.ts            # Menu validation schemas (Zod)
│       ├── order.ts           # Order validation schemas
│       └── auth.ts            # Auth validation schemas
│
├── .env.local                 # Environment variables
├── .eslintrc.json
├── .prettierrc
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 🔐 Environment Variables (.env.local)

```bash
# Database (Neon)
DATABASE_URL="postgresql://user:password@endpoint.neon.tech/dbname?sslmode=require"

# Better Auth
BETTER_AUTH_SECRET="your-secret-key-here"
BETTER_AUTH_URL="http://localhost:3000"

# Supabase (untuk image storage)
NEXT_PUBLIC_SUPABASE_URL="https://yourproject.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Midtrans
MIDTRANS_SERVER_KEY="your-server-key"
MIDTRANS_CLIENT_KEY="your-client-key"
MIDTRANS_IS_PRODUCTION=false

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Socket.io (optional, jika deploy terpisah)
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
```

---

## 🔧 Setup Commands

```bash
# 1. Install dependencies
npm install

# 2. Setup Prisma
npx prisma generate
npx prisma db push

# 3. Seed database (optional)
npx prisma db seed

# 4. Run development server
npm run dev

# 5. Open Prisma Studio (optional)
npm run prisma:studio
```

---

## 📊 Data Flow Architecture

```
User (Mobile/Desktop)
    ↓
  Scan QR Code
    ↓
Next.js Frontend (/order?table=XYZ)
    ↓
Browse Menu (Zustand for Cart)
    ↓
Select Options + Notes
    ↓
Checkout → API Route (/api/orders)
    ↓
Create Order (Prisma → Neon)
    ↓
Redirect to Midtrans Snap
    ↓
User Payment
    ↓
Midtrans Webhook → /api/webhooks/midtrans
    ↓
Update Order Status (PAID) + paidAt timestamp
    ↓
Socket.io Emit → Kitchen Dashboard
    ↓
Kitchen sees new order (real-time)
    ↓
Kitchen updates status (PREPARING → READY → SERVED)
    ↓
Socket.io Emit → User (optional notification)
```

---

## 🎯 Feature Implementation Checklist

### Phase 1: Setup & Core
- [ ] Initialize Next.js project
- [ ] Setup Tailwind CSS + shadcn/ui
- [ ] Setup Prisma + Neon
- [ ] Setup Better Auth
- [ ] Setup Supabase Storage
- [ ] Create database schema
- [ ] Seed initial data

### Phase 2: Admin Dashboard
- [ ] Admin login
- [ ] Menu CRUD (create, read, update, delete)
- [ ] Menu options management
- [ ] Image upload (Supabase)
- [ ] Table management + QR generation
- [ ] Analytics dashboard (Recharts)

### Phase 3: User Ordering
- [ ] QR scan redirect
- [ ] Browse menu
- [ ] Menu detail with options
- [ ] Cart management (Zustand)
- [ ] Checkout page
- [ ] Midtrans integration
- [ ] Payment webhook

### Phase 4: Kitchen Dashboard
- [ ] Kitchen login
- [ ] Order queue (priority by paidAt)
- [ ] Real-time updates (Socket.io)
- [ ] Update order status
- [ ] Mark menu as unavailable

### Phase 5: Real-time & Polish
- [ ] Socket.io server setup
- [ ] Real-time order updates
- [ ] Toast notifications
- [ ] Loading states
- [ ] Error handling
- [ ] Mobile responsive
- [ ] Testing

### Phase 6: Deployment
- [ ] Deploy to Vercel
- [ ] Setup production env vars
- [ ] Test production deployment
- [ ] Monitor errors

---

## 💡 Pro Tips

1. **Prisma Studio** - Gunakan untuk lihat/edit data langsung
2. **Better Auth** - Udah include session management, ga perlu JWT manual
3. **Socket.io** - Setup di Next.js bisa pake custom server atau API route
4. **Zustand** - Persist cart ke localStorage biar ga hilang pas refresh
5. **Zod** - Share schema antara client & server buat consistency
6. **Supabase** - Jangan lupa set bucket jadi public untuk menu images
7. **Midtrans** - Use Snap untuk easier integration (popup)
8. **Vercel** - Environment variables bisa di-set di dashboard

---

## 🚀 Deployment Strategy

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables di Vercel dashboard
# Build command: npm run build
# Output directory: .next
```

### Database (Neon)
- Neon auto-scaling
- Production database sudah di setup
- Connection pooling included

### File Storage (Supabase)
- CDN already included
- Set CORS policy untuk domain production

### Socket.io
- Bisa jalan di Vercel dengan API routes
- Atau deploy Socket.io server terpisah (Railway/Render)

---

Ini stack-nya udah **production-ready** dan **scalable**! 🎉

Ada yang mau ditambahin atau diubah?
