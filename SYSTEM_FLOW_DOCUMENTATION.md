# BOKI Food Ordering System - Complete System Flow Documentation

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           BOKI FOOD ORDERING SYSTEM                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │   CUSTOMER WEB  │    │   KIOSK SYSTEM  │    │  ADMIN PORTAL   │             │
│  │    INTERFACE    │    │   (TERMINAL)    │    │   (MANAGEMENT)  │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
│           │                       │                       │                     │
│           └───────────────────────┼───────────────────────┘                     │
│                                   │                                             │
│  ┌─────────────────────────────────┼─────────────────────────────────────────┐   │
│  │                    REACT FRONTEND APPLICATION                             │   │
│  │                                 │                                         │   │
│  │  ┌─────────────┐  ┌─────────────┼─────────────┐  ┌─────────────────────┐ │   │
│  │  │   ROUTING   │  │    HOOKS    │   CONTEXT   │  │    COMPONENTS       │ │   │
│  │  │   SYSTEM    │  │  (useAuth,  │ (AuthContext│  │  (UI, Features,     │ │   │
│  │  │             │  │   useCart,  │  CartContext│  │   Navigation)       │ │   │
│  │  │             │  │   useOrders)│             │  │                     │ │   │
│  │  └─────────────┘  └─────────────┼─────────────┘  └─────────────────────┘ │   │
│  └─────────────────────────────────┼─────────────────────────────────────────┘   │
│                                   │                                             │
│  ┌─────────────────────────────────┼─────────────────────────────────────────┐   │
│  │                      SUPABASE BACKEND                                    │   │
│  │                                 │                                         │   │
│  │  ┌─────────────┐  ┌─────────────┼─────────────┐  ┌─────────────────────┐ │   │
│  │  │ AUTHENTICATION│ │  DATABASE   │   STORAGE   │  │    REAL-TIME        │ │   │
│  │  │   (Auth)      │ │ (PostgreSQL)│   (Files)   │  │   SUBSCRIPTIONS     │ │   │
│  │  │               │ │             │             │  │                     │ │   │
│  │  │ - JWT Tokens  │ │ - RLS       │ - Images    │  │ - Order Updates     │ │   │
│  │  │ - Role-based  │ │ - Triggers  │ - Assets    │  │ - Status Changes    │ │   │
│  │  │   Access      │ │ - Functions │             │  │                     │ │   │
│  │  └─────────────┘  └─────────────┼─────────────┘  └─────────────────────┘ │   │
│  └─────────────────────────────────┼─────────────────────────────────────────┘   │
│                                   │                                             │
└─────────────────────────────────────┼─────────────────────────────────────────────┘
                                    │
                    ┌─────────────────┼─────────────────┐
                    │        DATABASE SCHEMA           │
                    │                                  │
                    │  ┌─────────────────────────────┐ │
                    │  │        CORE TABLES          │ │
                    │  │                             │ │
                    │  │ • users                     │ │
                    │  │ • categories                │ │
                    │  │ • food_items                │ │
                    │  │ • orders                    │ │
                    │  │ • kiosk_orders              │ │
                    │  │ • order_items               │ │
                    │  │ • cart_items                │ │
                    │  │ • order_status_history      │ │
                    │  │ • user_addresses            │ │
                    │  │ • size_options              │ │
                    │  └─────────────────────────────┘ │
                    └──────────────────────────────────┘
```

## 🔄 Complete User Journey Flows

### 1. 👤 Customer Online Ordering Flow

```
START: Customer visits website (/)
│
├─ 🏠 HOME PAGE
│  ├─ Browse featured items
│  ├─ View categories
│  └─ Navigate to menu
│
├─ 📋 MENU PAGE (/menu)
│  ├─ Filter by categories
│  ├─ Search food items
│  ├─ View item details (/food/:id)
│  │  ├─ Select size options
│  │  ├─ Add special instructions
│  │  └─ Add to cart
│  └─ Continue shopping
│
├─ 🛒 CART PAGE (/cart)
│  ├─ Review items
│  ├─ Modify quantities
│  ├─ Remove items
│  └─ Proceed to checkout
│
├─ 🔐 AUTHENTICATION (if not logged in)
│  ├─ LOGIN (/login)
│  │  ├─ Email/Password
│  │  └─ Role-based redirect
│  └─ SIGNUP (/signup)
│     ├─ Create account
│     └─ Auto-login
│
├─ 💳 CHECKOUT (/checkout)
│  ├─ Select delivery address
│  ├─ Choose order type (delivery/pickup)
│  ├─ Select payment method
│  ├─ Add order notes
│  └─ Place order
│
├─ ✅ ORDER CONFIRMATION (/order-confirmation/:id)
│  ├─ Display order details
│  ├─ Show order number
│  └─ Estimated delivery time
│
├─ 📦 ORDER TRACKING (/orders)
│  ├─ View all orders
│  ├─ Track order status
│  └─ View order details (/orders/:id)
│
└─ 👤 PROFILE MANAGEMENT (/profile)
   ├─ Update personal info
   ├─ Manage addresses
   └─ View order history
```

### 2. 🖥️ Kiosk Ordering Flow

```
START: Kiosk Terminal (/kiosk)
│
├─ 🔐 KIOSK AUTHENTICATION
│  ├─ Auto-login with kiosk credentials
│  └─ Kiosk-specific interface
│
├─ 📋 MENU BROWSING
│  ├─ Touch-friendly interface
│  ├─ Category navigation
│  ├─ Item selection with images
│  └─ Size and customization options
│
├─ 🛒 ORDER BUILDING
│  ├─ Add items to cart
│  ├─ Modify quantities
│  ├─ Special instructions
│  └─ Review order summary
│
├─ 📝 CUSTOMER INFORMATION
│  ├─ Enter customer name
│  ├─ Phone number (optional)
│  ├─ Order type selection:
│  │  ├─ Take-Out (pickup)
│  │  └─ Dine-In (delivery in kiosk context)
│  └─ Special requests
│
├─ 💰 ORDER PLACEMENT
│  ├─ Generate order number (K001, K002...)
│  ├─ Status: pending_payment
│  ├─ Print order receipt
│  └─ Display "Please pay at cashier"
│
├─ 💳 CASHIER PROCESSING (/admin/cashier)
│  ├─ View pending kiosk orders
│  ├─ Process payment
│  ├─ Update status: payment_received
│  └─ Send to kitchen
│
├─ 👨‍🍳 KITCHEN WORKFLOW
│  ├─ Status: preparing
│  ├─ Order preparation
│  └─ Status: ready
│
└─ ✅ ORDER COMPLETION
   ├─ Customer pickup
   ├─ Status: completed
   └─ Order archived
```

### 3. 👨‍💼 Admin Management Flow

```
START: Admin Login (/login) → Role-based redirect to /admin
│
├─ 📊 DASHBOARD (/admin)
│  ├─ Business metrics overview
│  ├─ Recent orders summary
│  ├─ Revenue analytics
│  ├─ Quick action buttons
│  └─ Real-time notifications
│
├─ 📦 ORDER MANAGEMENT
│  ├─ 🌐 ONLINE ORDERS (/admin/orders)
│  │  ├─ View all online orders
│  │  ├─ Filter by status/date
│  │  ├─ Update order status
│  │  ├─ View order details
│  │  └─ Customer communication
│  │
│  └─ 🖥️ KIOSK ORDERS (/admin/cashier)
│     ├─ Process pending payments
│     ├─ Update payment status
│     ├─ Kitchen order management
│     └─ Order completion tracking
│
├─ 🍽️ MENU MANAGEMENT
│  ├─ 📋 FOOD ITEMS (/admin/menu)
│  │  ├─ Add new menu items
│  │  ├─ Edit existing items
│  │  ├─ Manage availability
│  │  ├─ Set featured items
│  │  ├─ Upload images
│  │  └─ Assign size options
│  │
│  ├─ 📁 CATEGORIES (/admin/categories)
│  │  ├─ Create categories
│  │  ├─ Edit category details
│  │  ├─ Manage category status
│  │  └─ Organize menu structure
│  │
│  └─ 📏 SIZE OPTIONS (/admin/sizes)
│     ├─ Create size variants
│     ├─ Set size pricing
│     ├─ Assign to food items
│     └─ Manage size availability
│
├─ 👥 CUSTOMER MANAGEMENT (/admin/customers)
│  ├─ View customer list
│  ├─ Customer order history
│  ├─ Ban/unban customers
│  ├─ Customer analytics
│  └─ Communication tools
│
├─ 📈 REPORTS & ANALYTICS (/admin/reports)
│  ├─ 📊 BUSINESS OVERVIEW
│  │  ├─ Combined metrics (Online + Kiosk)
│  │  ├─ Channel performance comparison
│  │  └─ Market share analysis
│  │
│  ├─ 🌐 ONLINE ORDERS ANALYTICS
│  │  ├─ Total orders & sales
│  │  ├─ Average order value
│  │  ├─ Top-selling items
│  │  ├─ Daily sales trends
│  │  └─ Order status breakdown
│  │
│  ├─ 🖥️ KIOSK ANALYTICS
│  │  ├─ Kiosk-specific metrics
│  │  ├─ Order type analysis (Take-Out/Dine-In)
│  │  ├─ Payment processing stats
│  │  ├─ Peak hours analysis
│  │  └─ Kiosk performance trends
│  │
│  └─ 📊 COMPARATIVE ANALYSIS
│     ├─ Online vs Kiosk performance
│     ├─ Revenue distribution
│     ├─ Customer preferences
│     └─ Growth trends
│
└─ 🔔 NOTIFICATIONS (/admin/notifications)
   ├─ System notification settings
   ├─ Order alert preferences
   ├─ Push notification management
   └─ Communication templates
```

## 🗄️ Database Schema & Relationships

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE SCHEMA                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │    USERS    │    │ CATEGORIES  │    │ FOOD_ITEMS  │    │SIZE_OPTIONS │      │
│  │             │    │             │    │             │    │             │      │
│  │ • id (PK)   │    │ • id (PK)   │    │ • id (PK)   │    │ • id (PK)   │      │
│  │ • email     │    │ • name      │    │ • name      │    │ • name      │      │
│  │ • password  │    │ • description│   │ • description│   │ • price_mod │      │
│  │ • full_name │    │ • image_url │    │ • price     │    │ • is_active │      │
│  │ • contact   │    │ • is_active │    │ • image_url │    └─────────────┘      │
│  │ • address   │    │ • created_at│    │ • category_id│           │            │
│  │ • role      │    └─────────────┘    │ • is_available│          │            │
│  │ • created_at│           │           │ • is_featured│           │            │
│  └─────────────┘           │           │ • prep_time │           │            │
│         │                  │           │ • created_at│           │            │
│         │                  │           └─────────────┘           │            │
│         │                  │                  │                 │            │
│         │                  └──────────────────┘                 │            │
│         │                                     │                 │            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │USER_ADDRESSES│   │   ORDERS    │    │ORDER_ITEMS  │    │FOOD_ITEM_   │      │
│  │             │    │             │    │             │    │   SIZES     │      │
│  │ • id (PK)   │    │ • id (PK)   │    │ • id (PK)   │    │             │      │
│  │ • user_id   │────│ • user_id   │    │ • order_id  │────│ • food_item_│      │
│  │ • address   │    │ • customer_*│    │ • food_item │    │   id        │      │
│  │ • is_default│    │ • order_type│    │ • quantity  │    │ • size_id   │──────┘
│  └─────────────┘    │ • payment_* │    │ • unit_price│    └─────────────┘
│         │            │ • status    │    │ • total_price│
│         │            │ • total_amt │    └─────────────┘
│         │            │ • notes     │           │
│         │            │ • created_at│           │
│         │            └─────────────┘           │
│         │                   │                 │
│  ┌─────────────┐           │                 │
│  │ CART_ITEMS  │           │                 │
│  │             │           │                 │
│  │ • user_id   │───────────┘                 │
│  │ • food_item │─────────────────────────────┘
│  │ • quantity  │
│  │ • created_at│
│  └─────────────┘
│
│  ┌─────────────────────────────────────────────────────────────────────────────┐
│  │                           KIOSK SYSTEM TABLES                              │
│  ├─────────────────────────────────────────────────────────────────────────────┤
│  │                                                                             │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│  │  │KIOSK_ORDERS │    │KIOSK_ORDER_ │    │KIOSK_ORDER_ │                     │
│  │  │             │    │   ITEMS     │    │STATUS_HISTORY│                    │
│  │  │ • id (PK)   │    │             │    │             │                     │
│  │  │ • order_num │    │ • id (PK)   │    │ • id (PK)   │                     │
│  │  │ • customer_*│    │ • kiosk_ord │────│ • kiosk_ord │                     │
│  │  │ • status    │    │ • food_item │    │ • old_status│                     │
│  │  │ • total_amt │    │ • size_id   │    │ • new_status│                     │
│  │  │ • payment_* │    │ • quantity  │    │ • changed_by│                     │
│  │  │ • order_type│    │ • unit_price│    │ • changed_at│                     │
│  │  │ • notes     │    │ • total_price│   │ • notes     │                     │
│  │  │ • created_at│    │ • special_* │    └─────────────┘                     │
│  │  └─────────────┘    └─────────────┘                                        │
│  └─────────────────────────────────────────────────────────────────────────────┘
│
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🔐 Authentication & Authorization Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION & AUTHORIZATION                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │   CUSTOMER      │    │     ADMIN       │    │     KIOSK       │             │
│  │  AUTHENTICATION │    │ AUTHENTICATION  │    │ AUTHENTICATION  │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
│           │                       │                       │                     │
│           ▼                       ▼                       ▼                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │ LOGIN/SIGNUP    │    │ ADMIN LOGIN     │    │ AUTO-LOGIN      │             │
│  │                 │    │                 │    │                 │             │
│  │ • Email/Pass    │    │ • Admin Email   │    │ • kiosk@boki    │             │
│  │ • Registration  │    │ • Admin Pass    │    │ • Auto-auth     │             │
│  │ • Profile Mgmt  │    │ • Role Check    │    │ • Terminal Mode │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
│           │                       │                       │                     │
│           ▼                       ▼                       ▼                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │   JWT TOKEN     │    │   JWT TOKEN     │    │   JWT TOKEN     │             │
│  │                 │    │                 │    │                 │             │
│  │ • role: customer│    │ • role: admin   │    │ • role: kiosk   │             │
│  │ • user_id       │    │ • user_id       │    │ • user_id       │             │
│  │ • permissions   │    │ • full_access   │    │ • limited_access│             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
│           │                       │                       │                     │
│           ▼                       ▼                       ▼                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │  ROUTE ACCESS   │    │  ROUTE ACCESS   │    │  ROUTE ACCESS   │             │
│  │                 │    │                 │    │                 │             │
│  │ • /             │    │ • /admin/*      │    │ • /kiosk        │             │
│  │ • /menu         │    │ • /admin/orders │    │ • Limited UI    │             │
│  │ • /cart         │    │ • /admin/menu   │    │ • Order Creation│             │
│  │ • /checkout     │    │ • /admin/reports│    │                 │             │
│  │ • /orders       │    │ • /admin/users  │    │                 │             │
│  │ • /profile      │    │ • Full System   │    │                 │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Patterns

### Order Processing Flow

```
ONLINE ORDER FLOW:
Customer → Cart → Checkout → Order Creation → Payment → Kitchen → Delivery → Completion

KIOSK ORDER FLOW:
Kiosk → Order Creation → Cashier Payment → Kitchen → Pickup → Completion

ADMIN MONITORING:
Real-time Order Updates → Dashboard → Status Management → Analytics
```

### State Management Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              STATE MANAGEMENT                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │  AUTHENTICATION │    │      CART       │    │     ORDERS      │             │
│  │     CONTEXT     │    │    CONTEXT      │    │    CONTEXT      │             │
│  │                 │    │                 │    │                 │             │
│  │ • useAuth()     │    │ • useCart()     │    │ • useOrders()   │             │
│  │ • login/logout  │    │ • addItem()     │    │ • fetchOrders() │             │
│  │ • user state    │    │ • removeItem()  │    │ • updateStatus()│             │
│  │ • role checking │    │ • updateQty()   │    │ • trackOrder()  │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
│           │                       │                       │                     │
│           ▼                       ▼                       ▼                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                        SUPABASE INTEGRATION                                │ │
│  │                                                                             │ │
│  │ • Real-time subscriptions                                                  │ │
│  │ • Automatic state synchronization                                          │ │
│  │ • Optimistic updates                                                       │ │
│  │ • Error handling & rollback                                                │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 💻 Hardware Requirements

### 🖥️ Kiosk Terminal Specifications

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            KIOSK HARDWARE REQUIREMENTS                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │   TOUCHSCREEN   │    │    COMPUTER     │    │   PERIPHERALS   │             │
│  │    DISPLAY      │    │      UNIT       │    │                 │             │
│  │                 │    │                 │    │                 │             │
│  │ • 21-24" Touch  │    │ • Intel i5/AMD │    │ • Thermal       │             │
│  │ • 1920x1080 FHD │    │   Ryzen 5+     │    │   Printer       │             │
│  │ • Capacitive    │    │ • 8GB RAM min   │    │ • Receipt Paper │             │
│  │ • Multi-touch   │    │ • 256GB SSD     │    │ • Card Reader   │             │
│  │ • Anti-glare    │    │ • Windows 10/11│    │   (Optional)    │             │
│  │ • Vandal-proof  │    │ • WiFi/Ethernet │    │ • Cash Drawer   │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                           RECOMMENDED MODELS                               │ │
│  │                                                                             │ │
│  │ • All-in-One Kiosk: Elo TouchSystems 2294L or similar                     │ │
│  │ • Industrial PC: Advantech ARK-1123 or equivalent                         │ │
│  │ • Thermal Printer: Epson TM-T20III or Star TSP143III                      │ │
│  │ • Enclosure: Secure, tamper-resistant with cable management                │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 🏢 Server Infrastructure (Cloud-Based)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          CLOUD INFRASTRUCTURE SPECS                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │    NETLIFY      │    │    SUPABASE     │    │      CDN        │             │
│  │   (FRONTEND)    │    │   (BACKEND)     │    │   (GLOBAL)      │             │
│  │                 │    │                 │    │                 │             │
│  │ • Global CDN    │    │ • PostgreSQL    │    │ • Edge Caching  │             │
│  │ • Auto-scaling  │    │ • 2GB RAM min   │    │ • Image Opt.    │             │
│  │ • SSL/TLS       │    │ • 20GB Storage  │    │ • Compression   │             │
│  │ • 99.9% Uptime  │    │ • Auto-backup   │    │ • DDoS Protect  │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 📱 Admin/Staff Device Requirements

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ADMIN DEVICE SPECIFICATIONS                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │    DESKTOP      │    │     TABLET      │    │   SMARTPHONE    │             │
│  │   (CASHIER)     │    │   (MANAGER)     │    │    (STAFF)      │             │
│  │                 │    │                 │    │                 │             │
│  │ • Intel i3+     │    │ • iPad/Android  │    │ • iOS/Android   │             │
│  │ • 4GB RAM       │    │ • 10" screen    │    │ • 4GB RAM       │             │
│  │ • Windows 10+   │    │ • WiFi enabled  │    │ • Modern browser│             │
│  │ • Modern browser│    │ • Modern browser│    │ • 4G/WiFi       │             │
│  │ • Receipt printer│   │ • Portable      │    │ • Push notifs   │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🛠️ Software Requirements & Technology Stack

### 🌐 Frontend Technology Stack

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND STACK                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │      CORE       │    │      UI/UX      │    │     BUILD       │             │
│  │   FRAMEWORK     │    │   LIBRARIES     │    │     TOOLS       │             │
│  │                 │    │                 │    │                 │             │
│  │ • React 18.3+   │    │ • Tailwind CSS  │    │ • Vite 5.4+     │             │
│  │ • TypeScript    │    │ • Headless UI   │    │ • PostCSS       │             │
│  │ • React Router  │    │ • Heroicons     │    │ • ESLint        │             │
│  │ • Context API   │    │ • Framer Motion │    │ • Prettier      │             │
│  │ • Custom Hooks  │    │ • React Hot     │    │ • TypeScript    │             │
│  │                 │    │   Toast         │    │   Compiler      │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                           PACKAGE VERSIONS                                 │ │
│  │                                                                             │ │
│  │ • react: ^18.3.1                    • @headlessui/react: ^2.1.10          │ │
│  │ • react-dom: ^18.3.1                • @heroicons/react: ^2.1.5            │ │
│  │ • react-router-dom: ^6.28.0         • tailwindcss: ^3.4.14               │ │
│  │ • typescript: ~5.6.2                • vite: ^5.4.10                       │ │
│  │ • @supabase/supabase-js: ^2.46.1    • autoprefixer: ^10.4.20             │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 🔧 Backend Technology Stack

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND STACK                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │    DATABASE     │    │  AUTHENTICATION │    │   REAL-TIME     │             │
│  │   (SUPABASE)    │    │    & STORAGE    │    │   FEATURES      │             │
│  │                 │    │                 │    │                 │             │
│  │ • PostgreSQL    │    │ • JWT Tokens    │    │ • WebSockets    │             │
│  │   15.0+         │    │ • Row Level     │    │ • Live Queries  │             │
│  │ • SQL Functions │    │   Security      │    │ • Subscriptions │             │
│  │ • Triggers      │    │ • File Storage  │    │ • Presence      │             │
│  │ • Extensions    │    │ • Email Auth    │    │ • Broadcast     │             │
│  │ • Indexes       │    │ • Social Auth   │    │ • Real-time DB  │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                           API FEATURES                                     │ │
│  │                                                                             │ │
│  │ • RESTful API endpoints              • Auto-generated OpenAPI docs         │ │
│  │ • GraphQL support (optional)         • Rate limiting & throttling          │ │
│  │ • Real-time subscriptions            • Request/response logging            │ │
│  │ • Webhook integrations               • Error tracking & monitoring         │ │
│  │ • Edge Functions (Deno runtime)      • Performance analytics               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 🔒 Security & Compliance

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SECURITY REQUIREMENTS                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │  AUTHENTICATION │    │   DATA SECURITY │    │   COMPLIANCE    │             │
│  │   & AUTHORIZATION│   │   & ENCRYPTION  │    │  & STANDARDS    │             │
│  │                 │    │                 │    │                 │             │
│  │ • JWT Tokens    │    │ • AES-256       │    │ • GDPR Ready    │             │
│  │ • Role-based    │    │ • TLS 1.3       │    │ • PCI DSS       │             │
│  │   Access (RBAC) │    │ • Data at Rest  │    │   Compliant     │             │
│  │ • Session Mgmt  │    │ • Data in       │    │ • SOC 2 Type II │             │
│  │ • Password      │    │   Transit       │    │ • ISO 27001     │             │
│  │   Policies      │    │ • Key Rotation  │    │ • HIPAA Ready   │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                         SECURITY FEATURES                                  │ │
│  │                                                                             │ │
│  │ • Input validation & sanitization    • SQL injection prevention            │ │
│  │ • XSS protection headers             • CSRF token validation               │ │
│  │ • Rate limiting & DDoS protection    • Audit logging & monitoring          │ │
│  │ • Secure cookie handling             • Regular security updates            │ │
│  │ • Content Security Policy (CSP)      • Vulnerability scanning              │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🚀 Deployment & Infrastructure

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DEPLOYMENT ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │    FRONTEND     │    │    BACKEND      │    │    DATABASE     │             │
│  │   (NETLIFY)     │    │   (SUPABASE)    │    │  (POSTGRESQL)   │             │
│  │                 │    │                 │    │                 │             │
│  │ • React App     │    │ • Authentication│    │ • Tables        │             │
│  │ • Static Build  │    │ • API Gateway   │    │ • Functions     │             │
│  │ • CDN Delivery  │    │ • Real-time     │    │ • Triggers      │             │
│  │ • Auto Deploy   │    │ • File Storage  │    │ • RLS Policies  │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
│           │                       │                       │                     │
│           └───────────────────────┼───────────────────────┘                     │
│                                   │                                             │
│  ┌─────────────────────────────────┼─────────────────────────────────────────┐   │
│  │                      ENVIRONMENT VARIABLES                                │   │
│  │                                 │                                         │   │
│  │ • VITE_SUPABASE_URL            │                                         │   │
│  │ • VITE_SUPABASE_ANON_KEY       │                                         │   │
│  │ • NODE_VERSION                  │                                         │   │
│  │ • BUILD_COMMAND                 │                                         │   │
│  └─────────────────────────────────┼─────────────────────────────────────────┘   │
│                                   │                                             │
└─────────────────────────────────────┼─────────────────────────────────────────────┘
                                    │
                    ┌─────────────────┼─────────────────┐
                    │         SECURITY FEATURES        │
                    │                                  │
                    │ • JWT Authentication             │
                    │ • Row Level Security (RLS)       │
                    │ • Role-based Access Control      │
                    │ • HTTPS/SSL Encryption           │
                    │ • Input Validation               │
                    │ • SQL Injection Prevention       │
                    │ • XSS Protection                 │
                    └──────────────────────────────────┘
```

## ⚙️ Development Environment Setup

### 🛠️ Required Software for Development

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        DEVELOPMENT ENVIRONMENT                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │   RUNTIME &     │    │      TOOLS      │    │      IDE        │             │
│  │   PACKAGE MGR   │    │   & UTILITIES   │    │   & EXTENSIONS  │             │
│  │                 │    │                 │    │                 │             │
│  │ • Node.js 18+   │    │ • Git 2.40+     │    │ • VS Code       │             │
│  │ • npm 9.0+      │    │ • Supabase CLI  │    │ • TypeScript    │             │
│  │ • pnpm (opt.)   │    │ • Netlify CLI   │    │ • Tailwind CSS  │             │
│  │ • yarn (opt.)   │    │ • Postman/      │    │ • ESLint        │             │
│  │                 │    │   Insomnia      │    │ • Prettier      │             │
│  │                 │    │ • Docker (opt.) │    │ • GitLens       │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                           SETUP COMMANDS                                   │ │
│  │                                                                             │ │
│  │ 1. Clone repository: git clone <repo-url>                                  │ │
│  │ 2. Install dependencies: npm install                                       │ │
│  │ 3. Setup environment: cp .env.example .env                                 │ │
│  │ 4. Configure Supabase: Add URL and keys to .env                            │ │
│  │ 5. Run development: npm run dev                                             │ │
│  │ 6. Run migrations: supabase db push (if using local)                       │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 🌐 Browser Compatibility

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           BROWSER SUPPORT MATRIX                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │     DESKTOP     │    │     MOBILE      │    │     KIOSK       │             │
│  │    BROWSERS     │    │    BROWSERS     │    │    BROWSERS     │             │
│  │                 │    │                 │    │                 │             │
│  │ • Chrome 90+    │    │ • Chrome Mobile │    │ • Chrome 90+    │             │
│  │ • Firefox 88+   │    │   90+           │    │ • Edge 90+      │             │
│  │ • Safari 14+    │    │ • Safari iOS    │    │ • Firefox 88+   │             │
│  │ • Edge 90+      │    │   14+           │    │ • Kiosk Mode    │             │
│  │                 │    │ • Samsung       │    │   Support       │             │
│  │                 │    │   Internet      │    │                 │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                         FEATURE SUPPORT                                    │ │
│  │                                                                             │ │
│  │ • ES2020+ JavaScript features        • CSS Grid & Flexbox                  │ │
│  │ • WebSocket support                   • Touch events (mobile/kiosk)        │ │
│  │ • Local Storage & Session Storage     • Service Workers (PWA ready)        │ │
│  │ • Fetch API & Promises               • Responsive design breakpoints       │ │
│  │ • Modern CSS features (Grid, Flex)    • Print media queries               │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 📊 Performance Requirements

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PERFORMANCE BENCHMARKS                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │   LOAD TIMES    │    │   RESPONSIVENESS│    │   SCALABILITY   │             │
│  │                 │    │                 │    │                 │             │
│  │ • First Paint   │    │ • Click Response│    │ • Concurrent    │             │
│  │   < 1.5s        │    │   < 100ms       │    │   Users: 1000+  │             │
│  │ • Interactive   │    │ • Form Submit   │    │ • Orders/hour   │             │
│  │   < 3s          │    │   < 200ms       │    │   500+          │             │
│  │ • Full Load     │    │ • Page Navigate │    │ • Database      │             │
│  │   < 5s          │    │   < 300ms       │    │   Connections   │             │
│  │                 │    │                 │    │   100+          │             │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘             │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                         OPTIMIZATION FEATURES                              │ │
│  │                                                                             │ │
│  │ • Code splitting & lazy loading       • Image optimization & compression   │ │
│  │ • Bundle size optimization            • Database query optimization        │ │
│  │ • CDN caching strategies              • Real-time connection pooling       │ │
│  │ • Service worker caching              • Memory usage optimization          │ │
│  │ • Progressive Web App features        • Network request batching           │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 📊 Key Features Summary

### 🌐 Online Ordering System
- **Customer Registration & Authentication**
- **Menu Browsing with Categories & Search**
- **Shopping Cart Management**
- **Multiple Address Management**
- **Order Tracking & History**
- **Real-time Order Updates**

### 🖥️ Kiosk Self-Service System
- **Touch-friendly Interface**
- **Self-service Ordering**
- **Order Number Generation**
- **Cashier Integration**
- **Kitchen Display Integration**
- **Receipt Printing**

### 👨‍💼 Admin Management Portal
- **Comprehensive Dashboard**
- **Order Management (Online & Kiosk)**
- **Menu & Category Management**
- **Customer Management & Banning**
- **Size Options Management**
- **Advanced Analytics & Reporting**
- **Real-time Notifications**

### 📈 Analytics & Reporting
- **Business Overview Metrics**
- **Channel Performance Comparison**
- **Sales Trends & Forecasting**
- **Top-selling Items Analysis**
- **Customer Behavior Insights**
- **Revenue Analytics**

### 🔒 Security & Performance
- **JWT-based Authentication**
- **Role-based Access Control**
- **Row Level Security (RLS)**
- **Real-time Data Synchronization**
- **Optimized Database Queries**
- **Responsive Design**

---

*This documentation provides a complete overview of the BOKI Food Ordering System architecture, user flows, and technical implementation details.*