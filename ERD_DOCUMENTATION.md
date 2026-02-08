# 📊 ERD Documentation - Cafe Gonku

## Project Overview
**Nama Project:** Cafe Gonku  
**Folder Name:** `cafe-gonku`  
**Brand Name:** Cafe Gonku  
**Tipe:** QR-Based Restaurant Ordering System  
**Database:** PostgreSQL (Neon)  
**ORM:** Prisma  

---

# 🗄️ Database Schema Overview

## Tabel-tabel yang Ada:

1. **users** - Data admin & kitchen staff
2. **tables** - Data meja & QR code
3. **menus** - Data menu makanan/minuman
4. **menu_options** - Opsi customization per menu
5. **menu_option_values** - Pilihan dalam setiap option
6. **orders** - Data pesanan customer
7. **order_items** - Item-item dalam pesanan
8. **order_item_options** - Options yang dipilih customer
9. **daily_sales** - Summary penjualan per hari
10. **order_logs** - Audit trail perubahan order

**Total: 10 tabel**

---

# 🔗 Entity Relationship Diagram (ERD)

## Visual Relationship:

```
┌─────────────┐
│    users    │
│ (Admin/     │
│  Kitchen)   │
└─────────────┘

┌─────────────┐           ┌─────────────┐
│   tables    │ 1     N   │   orders    │
│             ├───────────┤             │
│ - qrCode    │           │ - orderCode │
└─────────────┘           │ - paidAt ⭐ │
                          └──────┬──────┘
                                 │ 1
                                 │
                                 │ N
                          ┌──────┴──────┐
                          │ order_items │
                          │             │
                          └──────┬──────┘
                                 │ N
                                 │
                   ┌─────────────┼─────────────┐
                   │ 1                         │ 1
            ┌──────┴──────┐           ┌────────┴────────┐
            │    menus    │           │ order_item_     │
            │             │           │   options       │
            └──────┬──────┘           └────────┬────────┘
                   │ 1                         │ 1
                   │                           │
                   │ N                         │
            ┌──────┴──────┐           ┌────────┴────────┐
            │menu_options │           │menu_option_     │
            │             │           │    values       │
            └──────┬──────┘           └─────────────────┘
                   │ 1
                   │
                   │ N
            ┌──────┴──────┐
            │menu_option_ │
            │   values    │
            └─────────────┘

┌─────────────┐
│daily_sales  │
│ (Analytics) │
└─────────────┘

┌─────────────┐
│ order_logs  │
│(Audit Trail)│
└─────────────┘
```

---

# 📋 Detailed Table Explanation

## 1️⃣ **users** (Admin & Kitchen Staff)

| Field     | Type      | Description                |
|-----------|-----------|----------------------------|
| id        | String    | Primary Key (cuid)         |
| email     | String    | Email unik untuk login     |
| password  | String    | Password (hashed)          |
| name      | String    | Nama lengkap               |
| role      | UserRole  | ADMIN atau KITCHEN         |
| isActive  | Boolean   | Status aktif/nonaktif      |
| createdAt | DateTime  | Waktu dibuat               |
| updatedAt | DateTime  | Waktu terakhir diupdate    |

**Relasi:** None (standalone)

---

## 2️⃣ **tables** (Meja & QR Code)

| Field       | Type     | Description                         |
|-------------|----------|-------------------------------------|
| id          | String   | Primary Key (cuid)                  |
| tableNumber | Int      | Nomor meja fisik (1, 2, 3, ...)     |
| qrCode      | String   | String unik untuk QR (GONKU_TABLE_1)|
| isActive    | Boolean  | Meja aktif atau maintenance         |
| capacity    | Int      | Kapasitas orang per meja            |
| createdAt   | DateTime | Waktu dibuat                        |
| updatedAt   | DateTime | Waktu terakhir diupdate             |

**Relasi:**
- 1 Table → Many Orders (1:N)

**QR Code Format:** `GONKU_TABLE_1_ABC123`  
**URL Redirect:** `https://cafe-gonku.com/order?table=GONKU_TABLE_1_ABC123`

---

## 3️⃣ **menus** (Menu Makanan/Minuman)

| Field       | Type         | Description                    |
|-------------|--------------|--------------------------------|
| id          | String       | Primary Key (cuid)             |
| name        | String       | Nama menu                      |
| description | String?      | Deskripsi menu                 |
| price       | Int          | Harga BASE (Rupiah)            |
| category    | MenuCategory | FOOD/DRINK/SNACK/DESSERT       |
| imageUrl    | String?      | URL gambar (Supabase Storage)  |
| isAvailable | Boolean      | Tersedia atau habis (Kitchen)  |
| isActive    | Boolean      | Soft delete untuk admin        |
| createdAt   | DateTime     | Waktu dibuat                   |
| updatedAt   | DateTime     | Waktu terakhir diupdate        |

**Relasi:**
- 1 Menu → Many MenuOptions (1:N)
- 1 Menu → Many OrderItems (1:N)

**Contoh Data:**
```javascript
{
  name: "Mie Nyemek",
  price: 15000,
  category: "FOOD",
  imageUrl: "https://xxxxx.supabase.co/storage/v1/object/public/menus/mie-nyemek.jpg"
}
```

---

## 4️⃣ **menu_options** (Opsi Customization)

| Field      | Type     | Description                      |
|------------|----------|----------------------------------|
| id         | String   | Primary Key (cuid)               |
| menuId     | String   | Foreign Key → menus              |
| name       | String   | Nama option (Rasa, Level Pedas)  |
| isRequired | Boolean  | Wajib dipilih atau optional?     |
| createdAt  | DateTime | Waktu dibuat                     |
| updatedAt  | DateTime | Waktu terakhir diupdate          |

**Relasi:**
- N MenuOptions → 1 Menu (N:1)
- 1 MenuOption → Many MenuOptionValues (1:N)

**Contoh Data:**
```javascript
{
  menuId: "mie_nyemek_id",
  name: "Rasa",
  isRequired: true
}
```

---

## 5️⃣ **menu_option_values** (Pilihan dalam Option)

| Field        | Type     | Description                           |
|--------------|----------|---------------------------------------|
| id           | String   | Primary Key (cuid)                    |
| menuOptionId | String   | Foreign Key → menu_options            |
| label        | String   | Label pilihan (Pedas Jeruk, Level 5)  |
| priceAdjust  | Int      | Tambahan harga (Large +10000)         |
| createdAt    | DateTime | Waktu dibuat                          |

**Relasi:**
- N MenuOptionValues → 1 MenuOption (N:1)
- 1 MenuOptionValue → Many OrderItemOptions (1:N)

**Contoh Data:**
```javascript
{
  menuOptionId: "rasa_option_id",
  label: "Pedas Jeruk",
  priceAdjust: 0
}
```

---

## 6️⃣ **orders** (Pesanan Customer)

| Field           | Type          | Description                          |
|-----------------|---------------|--------------------------------------|
| id              | String        | Primary Key (cuid)                   |
| orderCode       | String        | Kode unik (GONKU-001)                |
| tableId         | String        | Foreign Key → tables                 |
| customerName    | String?       | Nama customer (optional)             |
| customerPhone   | String?       | No HP customer (optional)            |
| totalAmount     | Int           | Total harga keseluruhan              |
| status          | OrderStatus   | PENDING/PAID/PREPARING/READY/SERVED  |
| paymentStatus   | PaymentStatus | PENDING/PAID/FAILED/EXPIRED          |
| paymentMethod   | String?       | midtrans/qris/cash                   |
| midtransToken   | String?       | Snap token                           |
| midtransOrderId | String?       | Order ID Midtrans                    |
| **paidAt**      | **DateTime?** | **⭐ Timestamp payment (Priority Queue!)** |
| createdAt       | DateTime      | Waktu dibuat                         |
| updatedAt       | DateTime      | Waktu terakhir diupdate              |

**Relasi:**
- N Orders → 1 Table (N:1)
- 1 Order → Many OrderItems (1:N)
- 1 Order → Many OrderLogs (1:N)

**Priority Queue Index:** `@@index([paymentStatus, paidAt])`  
→ Yang bayar duluan tampil duluan di kitchen dashboard!

**Contoh Data:**
```javascript
{
  orderCode: "GONKU-001",
  tableId: "table_5_id",
  totalAmount: 50000,
  status: "PAID",
  paymentStatus: "PAID",
  paidAt: "2024-01-15T14:25:00Z" // ⭐ Penting!
}
```

---

## 7️⃣ **order_items** (Item dalam Pesanan)

| Field     | Type     | Description                              |
|-----------|----------|------------------------------------------|
| id        | String   | Primary Key (cuid)                       |
| orderId   | String   | Foreign Key → orders                     |
| menuId    | String   | Foreign Key → menus                      |
| quantity  | Int      | Jumlah item                              |
| price     | Int      | Total harga (base + options) × quantity  |
| notes     | String?  | Catatan tambahan customer                |
| createdAt | DateTime | Waktu dibuat                             |

**Relasi:**
- N OrderItems → 1 Order (N:1)
- N OrderItems → 1 Menu (N:1)
- 1 OrderItem → Many OrderItemOptions (1:N)

**Contoh Data:**
```javascript
{
  orderId: "order_001",
  menuId: "mie_nyemek_id",
  quantity: 2,
  price: 30000, // (15000 base) × 2
  notes: "matang banget ya mas"
}
```

---

## 8️⃣ **order_item_options** (Options yang Dipilih)

| Field             | Type     | Description                        |
|-------------------|----------|------------------------------------|
| id                | String   | Primary Key (cuid)                 |
| orderItemId       | String   | Foreign Key → order_items          |
| menuOptionValueId | String   | Foreign Key → menu_option_values   |
| optionName        | String   | Snapshot: "Rasa", "Level Pedas"    |
| optionValue       | String   | Snapshot: "Pedas Jeruk", "Large"   |
| priceAdjust       | Int      | Snapshot: Tambahan harga           |
| createdAt         | DateTime | Waktu dibuat                       |

**Relasi:**
- N OrderItemOptions → 1 OrderItem (N:1)
- N OrderItemOptions → 1 MenuOptionValue (N:1)

**Kenapa Snapshot?**  
Agar pilihan customer tidak berubah walau admin update option!

**Contoh Data:**
```javascript
{
  orderItemId: "item_001",
  menuOptionValueId: "value_pedas_jeruk",
  optionName: "Rasa",
  optionValue: "Pedas Jeruk",
  priceAdjust: 0
}
```

---

## 9️⃣ **daily_sales** (Analytics)

| Field        | Type     | Description                    |
|--------------|----------|--------------------------------|
| id           | String   | Primary Key (cuid)             |
| date         | DateTime | Tanggal (YYYY-MM-DD)           |
| totalOrders  | Int      | Jumlah order yang PAID         |
| totalRevenue | Int      | Total pendapatan hari itu      |
| createdAt    | DateTime | Waktu dibuat                   |
| updatedAt    | DateTime | Waktu terakhir diupdate        |

**Relasi:** None (standalone aggregation)

**Contoh Data:**
```javascript
{
  date: "2024-01-15",
  totalOrders: 45,
  totalRevenue: 2250000
}
```

---

## 🔟 **order_logs** (Audit Trail)

| Field     | Type     | Description                        |
|-----------|----------|------------------------------------|
| id        | String   | Primary Key (cuid)                 |
| orderId   | String   | Foreign Key → orders               |
| status    | String   | Status yang diupdate               |
| message   | String   | Deskripsi perubahan                |
| createdBy | String?  | User ID yang melakukan update      |
| createdAt | DateTime | Waktu perubahan                    |

**Relasi:**
- N OrderLogs → 1 Order (N:1)

**Contoh Data:**
```javascript
{
  orderId: "order_001",
  status: "PREPARING",
  message: "Kitchen mulai memasak pesanan",
  createdBy: "kitchen_user_id",
  createdAt: "2024-01-15T14:30:00Z"
}
```

---

# 🔄 Complete Data Flow

## Flow 1: User Order

```
1. User scan QR di Meja 5
   → QR Code: "GONKU_TABLE_5_ABC123"
   
2. Redirect ke: /order?table=GONKU_TABLE_5_ABC123
   → Frontend fetch table data

3. User browse menu
   → Fetch menus WHERE isAvailable = true

4. User pilih "Mie Nyemek"
   → Fetch menu WITH options & values

5. User pilih option "Rasa: Pedas Jeruk"
   → Frontend calculate total price

6. User add to cart (Zustand)
   → State management di browser

7. User checkout
   → POST /api/orders
   → Create Order (status: PENDING)
   → Create OrderItems
   → Create OrderItemOptions

8. Redirect ke Midtrans Snap
   → User bayar dengan QRIS/Transfer/Card

9. Payment success
   → Midtrans webhook: POST /api/webhooks/midtrans
   → Update order: paymentStatus = PAID, paidAt = now()

10. Socket.io emit
    → Real-time ke Kitchen Dashboard
```

## Flow 2: Kitchen Dashboard

```
1. Kitchen login
   → Better Auth session

2. Kitchen dashboard load
   → Query orders WHERE paymentStatus = PAID
   → ORDER BY paidAt ASC (Priority Queue!)
   → Include: table, orderItems, selectedOptions

3. Kitchen lihat order baru (real-time via Socket.io)
   → Notifikasi: "Order baru dari Meja 5"

4. Kitchen mulai masak
   → Update order status: PREPARING
   → Socket.io emit ke user (optional)

5. Kitchen selesai masak
   → Update order status: READY

6. Kitchen antar ke meja
   → Update order status: SERVED
```

## Flow 3: Admin Dashboard

```
1. Admin login
   → Better Auth session

2. Admin kelola menu
   → CRUD menus
   → Upload image ke Supabase Storage
   → Create/update options & values

3. Admin kelola meja
   → CRUD tables
   → Generate QR code dengan library "qrcode"

4. Admin lihat analytics
   → Query daily_sales
   → Show chart dengan Recharts
```

---

# 🎯 Key Features Implementation

## 1. Priority Queue Algorithm

```prisma
@@index([paymentStatus, paidAt])
```

```javascript
// Kitchen Dashboard Query
const orders = await prisma.order.findMany({
  where: {
    paymentStatus: 'PAID',
    status: { in: ['PAID', 'PREPARING', 'READY'] }
  },
  orderBy: {
    paidAt: 'asc' // Yang bayar duluan tampil duluan!
  },
  include: {
    table: true,
    orderItems: {
      include: {
        menu: true,
        selectedOptions: true
      }
    }
  }
})
```

## 2. Menu dengan/tanpa Options

```javascript
// Menu DENGAN option
const mieNyemek = await prisma.menu.create({
  data: {
    name: "Mie Nyemek",
    price: 15000,
    category: "FOOD",
    menuOptions: {
      create: [{
        name: "Rasa",
        isRequired: true,
        values: {
          create: [
            { label: "Pedas Jeruk", priceAdjust: 0 },
            { label: "Asin Jeruk", priceAdjust: 0 }
          ]
        }
      }]
    }
  }
})

// Menu TANPA option
const esTeh = await prisma.menu.create({
  data: {
    name: "Es Teh Manis",
    price: 5000,
    category: "DRINK"
    // Tidak ada menuOptions!
  }
})
```

## 3. QR Code Generation

```javascript
import QRCode from 'qrcode'

const qrCodeString = `GONKU_TABLE_${tableNumber}_${randomString()}`
const qrDataURL = await QRCode.toDataURL(
  `${process.env.NEXT_PUBLIC_APP_URL}/order?table=${qrCodeString}`
)

// Save to database
await prisma.table.create({
  data: {
    tableNumber,
    qrCode: qrCodeString
  }
})
```

---

# 📊 Database Indexes

Indexes yang penting untuk performa:

```prisma
// tables
@@index([qrCode])

// menus
@@index([category])
@@index([isAvailable])

// orders
@@index([paymentStatus, paidAt]) // ⭐ Priority Queue!
@@index([tableId])
@@index([status])
@@index([createdAt])

// order_items
@@index([orderId])
@@index([menuId])

// daily_sales
@@index([date])

// order_logs
@@index([orderId])
@@index([createdAt])
```

---

# 🚀 Next Steps

1. ✅ Copy `schema.prisma` ke folder project `cafe-gonku/prisma/`
2. ✅ Setup `.env.local` dengan DATABASE_URL dari Neon
3. ✅ Run `npx prisma generate`
4. ✅ Run `npx prisma db push`
5. ✅ (Optional) Seed database dengan dummy data
6. ✅ Start building!

---

**Database siap digunakan untuk Cafe Gonku! 🎉**
