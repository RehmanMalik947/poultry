# Salon Pro Management System

A full-stack salon and spa management application with appointments, POS/sales, inventory, expenses, finance reporting, staff, clients, and payroll.

---

## Tech Stack

- **Frontend:** React 18, Vite, React Router 7, Tailwind CSS 4, Radix UI, Recharts, Lucide icons
- **Backend:** Node.js, Express 5, Sequelize 6, MySQL
- **Auth:** JWT, bcrypt

---

## Project Structure

- `src/` – React app (pages, components, contexts)
- `backend/` – Express API, models, routes, migrations

---

## Modules

### Authentication

- **Login** (`/login`) – Sign in with username/email and password; JWT stored; last-used login pre-filled. Redirects to dashboard or super-admin based on role.
- **Signup** (`/signup`) – Organization/store registration (when enabled).

---

### Dashboard (Executive)

- **Route:** `/` (home)
- **Purpose:** High-level KPIs and at-a-glance business health.
- **Features:**
  - **KPI cards:** Monthly Sales, Monthly Revenue, Total Expenses, Net Profit – each clickable; opens a right-side **Sheet** with breakdown (revenue by sale, expenses by category, net profit, link to Finance).
  - **Charts:** Sales trend (line), payment distribution (pie), top staff, top services.
  - **Low stock alert** and **Booked Appointments** (today’s appointments; “View All” → Appointments).
- **Data:** Fetched from POS, finance, inventory, staff, and appointments APIs.

---

### POS (Point of Sale)

- **Route:** `/pos`
- **Purpose:** Create sales, add services, apply discounts, record payments.
- **Features:**
  - Service list by category; add to cart with quantity.
  - Client selection (optional); staff assignment.
  - Cart summary; discount; multiple payment methods (Cash, Card, etc.) with optional bank and transaction ID.
  - Complete sale → receipt; optional print.
  - Sale and payment data sent to backend; integration with Finance and Inventory (COGS).

---

### Sales

- **Route:** `/sales`
- **Purpose:** View and manage sales history and KPIs.
- **Features:**
  - **Stat cards:** Month’s Sales, Month’s Transactions, Month’s Unpaid Sales, Total Paid Sales, Cost of Goods Sold – dashboard style (icon on top, title, value, sub-value); **clickable** → Sheet from the right.
  - Month’s Sales sheet: breakdown table (Sale #, items, totals) and “Finance report” link.
  - Sales list with filters/pagination; branch-scoped.

---

### Appointments

- **Route:** `/appointments`
- **Purpose:** Schedule and manage client appointments; check-in/out; status tracking.
- **Features:**
  - **Calendar view:** Day timeline 12:00 PM–11:00 PM; only appointment cards (no empty rows).
  - **Columns:** Time, Client, Service, Status, Check-in/Check-out (vertical), Actions.
  - **Time column:** Booked = time slot; Arrived = live elapsed from check-in; Completed = total duration (e.g. “2 min 30 sec”) with Timer icon.
  - **Status:** Booked → Arrived → Completed (or No-show/Cancelled); “Status logs” dialog.
  - **Booking:** New/reschedule; client & service select; date (min = today) and time; validation uses **local** date so next-day and future dates work in all timezones; form reads time/date from inputs and refs on submit to avoid stale state.
  - List/calendar toggle; branch-scoped.

---

### Clients

- **Route:** `/clients`
- **Purpose:** Client database, visits, loyalty, ratings.
- **Features:**
  - **Stat cards:** Total Clients (from API total), Avg Rating, Highest Loyalty Points – dashboard style; **clickable** → Sheet with explanation and total bar; “View all clients” in sheet.
  - Client list: search, add/edit/delete; detail view (visits, spent, loyalty, rating, last visit).
  - Branch/organization scoped.

---

### Staff

- **Route:** `/staff`
- **Purpose:** Manage staff (employees), roles, branches, and permissions.
- **Features:**
  - Staff list with avatar, name, role, branch, status; pagination.
  - Add/edit staff: name, email, role, branch, permissions (via permission matrix).
  - Role-based access; “Manage” permission for edit/delete.
  - Links to Payroll; optional bank details.

---

### Payroll

- **Route:** `/payroll`
- **Purpose:** Salaries, pay runs, attendance, and pay items (bonuses/deductions).
- **Features:**
  - **Tabs:** Current (active month payroll), History (past pay runs), Attendance, Pay Items (salaries, bonuses, deductions).
  - Staff salaries by type (fixed/variable); bonuses and deductions; monthly pay run with totals.
  - Attendance records; filters by month/branch; export/download.
  - Permission-aware (view vs manage).

---

### Inventory

- **Route:** `/inventory`
- **Purpose:** Stock levels, low-stock alerts, valuation, wastage.
- **Features:**
  - **Stat cards:** Total Items, Low Stock, Inventory Value, Wastage (Month) – dashboard style; **clickable** → Sheet (items list, low stock table, value by item, wastage this month) with colored total bar; “Finance report” link in header.
  - Item list: name, category, quantity, min stock, cost/selling price, value; add/edit; status (OK / Low / Critical).
  - Wastage log: date, item, quantity, reason.
  - Branch-scoped; used for COGS in Finance.

---

### Expense

- **Route:** `/expense`
- **Purpose:** Expense categories and expense entries.
- **Features:**
  - **Stat cards:** Total Categories, Total Expenses, Total Amount – dashboard style; **clickable** → Sheet (categories list or expenses table with Date, Category, Description, Amount and total bar); “Finance report” in header.
  - Categories: CRUD.
  - Expenses: date, category, amount, description; list with filters.
  - Feeds into Finance P&L and Total Expenses.

---

### Finance (Financial Dashboard)

- **Route:** `/finance`
- **Purpose:** P&L, cash flow, receivables, and amount breakdowns.
- **Features:**
  - **Tabs:** Overview, Profit & Loss, Cash Flow, Receivables.
  - **Overview:** KPI cards (Revenue, COGS, Gross Profit, Total Expenses, Net Profit, Unpaid/Partial receivables, Cash flow); period selector (month or custom range). **Total Expenses** card styled like others (orange, CreditCard icon); click → Sheet “Total Expenses – by category” with table and orange total bar; other amount cards also open Sheets (revenue, COGS, etc.) or dialogs.
  - **Profit & Loss:** Revenue, COGS, gross profit, expenses by category, net profit; breakdowns by sale or category.
  - **Cash Flow:** Inflows/outflows; net cash flow; breakdown sheets.
  - **Receivables:** Unpaid/partial sales; client contact; totals and list.
  - All amounts can open detailed breakdowns (right Sheet or dialog); “Finance report” link where relevant.

---

### Reports

- **Route:** `/reports`
- **Purpose:** Exportable reports for sales, inventory, and finance.
- **Features:**
  - **Tabs:** Sales, Inventory, Finance.
  - **Sales:** Date range; total revenue, transactions, avg bill, unique customers; daily breakdown (chart/table); download.
  - **Inventory:** Stock levels, value, low stock; export.
  - **Finance:** Summary by period; link to Finance module for full detail.

---

### WhatsApp Center

- **Route:** `/whatsapp`
- **Purpose:** WhatsApp templates and campaigns (UI only; integration depends on backend).
- **Features:**
  - Message templates (e.g. Appointment Reminder, Birthday, Feedback) with placeholders; categories; status.
  - Campaigns: select template, recipients, send; status and stats (sent, delivered, read).
  - Sidebar nav item “WhatsApp”; top-bar WhatsApp icon removed in MainLayout.

---

### Settings

- **Route:** `/settings`
- **Purpose:** Profile, branch, notifications, payments, users, security, and roles/permissions.
- **Features:**
  - **Tabs:** Profile, Branch, Notifications, Payments, User Management, Security.
  - **Profile:** Name, email, phone, etc.
  - **Branch:** Branch details, address.
  - **Notifications:** Preferences.
  - **Payments:** Payment methods / banks.
  - **User Management:** Users and roles; invite/disable.
  - **Security:** Password, 2FA (if implemented).
  - **Roles & Permissions:** Matrix per module (POS, Appointments, Clients, Staff, Inventory, Finance, Reports, WhatsApp) – View / Create / Edit / Delete / Other (e.g. apply discount, print invoice, own vs all branch sales).

---

### Super Admin (Multi-tenant)

- **Base route:** `/super-admin`
- **Purpose:** Platform admin for multiple stores/tenants, plans, and billing.
- **Modules:**
  - **Dashboard** (`/super-admin`) – Total stores, active, pending, suspended; monthly revenue; tenant list; quick links to Plans, Pending, Active, Billing.
  - **Stores / Tenants** (`/super-admin/stores`) – CRUD for tenant organizations.
  - **Subscription Plans** (`/super-admin/plans`) – Plan names, limits, pricing.
  - **Pending Requests** (`/super-admin/pending`) – New signups awaiting approval.
  - **Active Stores** (`/super-admin/active`) – Active tenants and status.
  - **Billing & Payments** (`/super-admin/billing`) – Invoices and payments for tenants.
  - **Settings** (`/super-admin/settings`) – Platform-wide settings.
- **Access:** Super-admin role only; login redirects here when applicable.

---

## Setup

### Backend

1. Copy `.env.example` to `.env` in `backend/` and set:
   - `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
   - `JWT_SECRET`, etc.
2. Create the MySQL database.
3. Install and run:
   ```bash
   cd backend && npm install && npm start
   ```
4. (Optional) Add DB indexes: `npm run migrate`
5. (Optional) Seed super admin: `npm run seed:superadmin`

### Frontend

```bash
npm install && npm run dev
```

---

## What’s Been Done

### Appointments

- **Calendar view:** Hours 12:00 PM–11:00 PM; day timeline by hour; only appointment cards (no empty “No appointment” rows).
- **Columns:** Single horizontal row: Time, Client, Service, Status, Check-in/Check-out (vertical label + value), Actions.
- **Time column:**
  - Booked: time slot.
  - Arrived: live elapsed counter from check-in.
  - Completed: total duration with Timer icon; duration in words (e.g. “2 min 30 sec”).
- **Status cards:** Open “Status logs” dialog.
- **Booking:**
  - Book for today or any future date (next day and beyond).
  - Date picker: `min` = today (no past dates).
  - Time and date read from form inputs on submit (avoids stale state); refs used for client/service.
  - “Today” for validation uses **local** date (not UTC) so next-day booking works in all timezones.
- **Validation:** Clear messages; API errors and request/response logged to console for debugging.

### Executive Dashboard

- **Data:** KPIs, sales trend, payment distribution, top staff, top services, low stock, and booked appointments loaded from APIs (POS, finance, inventory, staff, appointments).
- **KPI cards:** Today Sales, Monthly Revenue, Total Expenses, Net Profit – **clickable**; open a **sheet from the right** with breakdown (revenue, expenses, net profit, “Revenue - services and prices”, link to Finance report).
- **First KPI:** “Monthly Sales” shows monthly total; breakdown shows month’s sales list and total.
- **Booked Appointments:** Replaces “Pending Approvals”; shows today’s booked appointments; “View All” links to `/appointments`.

### Main Layout

- WhatsApp/chat icon (MessageSquare + badge) removed from the top bar. Sidebar “WhatsApp” nav item unchanged.

### Sales Dashboard

- **Stat cards:** Month’s Sales, Month’s Transactions, Month’s Unpaid Sales, Total Paid Sales, Cost of Goods Sold – same style as Executive Dashboard (icon on top, title, value, sub-value).
- **Clickable:** Each card opens a **sheet from the right** with explanation and, for Month’s Sales, a **breakdown table** (Sale #, service/price/qty/total) and green total bar; “Finance report” link in header.

### Clients

- **Stat cards:** Total Clients, Avg Rating, Highest Loyalty Points – dashboard style (icon on top, title, value, sub-value); **clickable**.
- **Total Clients** uses `clientTotal` from API (not only current page).
- **Sheet from the right:** Card with icon, short explanation, and colored total bar; “View all clients” button.

### Finance (Financial Dashboard)

- **Total Expenses card:** Styled like other stats (orange, CreditCard icon).
- **Total Expenses click:** Opens **sheet from the right** (like Revenue): header with title, date range, “Finance report” link; card “Total Expenses – by category” with table (Category, Amount) and orange total bar.
- **Duplicate import:** Removed duplicate `CreditCard` from lucide-react import.

### Expense Page

- **Stat cards:** Total Categories, Total Expenses, Total Amount – same layout as Sales/Inventory (icon on top, title, value, sub-value); **clickable**.
- **Sheet from the right:** Same pattern as Revenue report – header (title, “All time”, “Finance report” button); for Total Categories: table of categories + purple total bar; for Total Expenses / Total Amount: table (Date, Category, Description, Amount) + orange total bar.

### Inventory Page

- **Stat cards:** Total Items, Low Stock, Inventory Value, Wastage (Month) – dashboard style, **clickable**.
- **Sheet from the right:** Header with “Finance report” link; for each stat, a card with table (e.g. items list, low stock list, value by item, wastage this month) and colored total bar.

### Backend – Database Indexes

- **Indexes added** on all main models (appointments, sales, clients, branches, organizations, services, expenses, expense_categories, staff, payments, sale_items, inventory, wastages, banks, categories, attendances, payrolls, user_salaries, payroll_bonus_deductions, service_items) for common filters: e.g. `organization_id`, `branch_id`, `date`, `status`, composite `(branch_id, date)` where useful.
- **Users table:** No extra indexes in the User model or in the migration (MySQL max 64 keys per table; `users` already has many from FKs and unique constraints).
- **Migration:** `backend/migrations/20250305000000-add-indexes-to-all-models.js` adds all indexes except `users`. Run with: `cd backend && npm run migrate`.
- **Role model:** Already had a unique index on `(organization_id, name)`; left as is.

---

## Scripts

### Frontend (root)

- `npm run dev` – start Vite dev server  
- `npm run build` – production build  

### Backend

- `npm start` – run API (nodemon)
- `npm run migrate` – run index migration
- `npm run seed:superadmin` – seed super admin user
- `npm run fix:superadmin-password` – fix super admin password

---

## Notes

- **Finance report** links from Sales, Expense, Inventory, and Finance sheets go to `/finance`.
- **Today** in appointment validation uses local date so “next day” booking works correctly in every timezone.
- If the app fails with “Too many keys” on a table, remove indexes from that model (and from the migration) so the table stays under MySQL’s 64-index limit.
  