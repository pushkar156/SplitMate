# SplitMate — Group Expense Sharing & Settlement Platform

> **One group. Every expense. No confusion.**

SplitMate is a modern, production-conscious fintech web application designed to simplify shared expenses and debt settlement among friends, travellers, roommates, families and event groups. Inspired by the best of Google Pay and Splitwise, it provides mathematical debt simplification, multi-payer support, exact minor-unit financial precision, Supabase persistence with Row Level Security, and comprehensive export capabilities.

---

## 🚀 Key Features

- **Multi-Payer Support**: Split bills paid by one member or contributed by multiple members with varying amounts.
- **4 Flexible Split Methods**:
  1. **Equal Split**: Even division with deterministic paise/minor unit remainder allocation.
  2. **Exact Amount**: Custom rupee shares with exact sum validation.
  3. **Percentage Split**: Custom percentages totaling 100% with fractional reconciliation.
  4. **Share-based / Ratio Split**: Proportional distribution based on integer shares (e.g. 2:1:1).
- **Smart Debt Simplification**: Greedy min-transaction algorithm that reduces complex circular group debts to the absolute minimum peer-to-peer transfers.
- **External Settlement Tracking**: Record UPI, cash or bank payments made outside the app. Includes pending status with receiver confirmation workflow to prevent double-counting.
- **Group Invitations & Sharing**: Secure invitation tokens, shareable URLs, and 1-click WhatsApp invite integration.
- **Zero-Sum Mathematical Conservation**: All group balances are guaranteed to reconcile to ₹0.00 at all times down to the single paise.
- **Interactive Financial Analytics**: Category distribution donut charts, member contribution bar charts, highest/average expense metrics.
- **Exports**: 1-click CSV export and professional client-ready PDF financial settlement reports.
- **Dual Runtime Support**: Operates connected to live Supabase cloud or with local demo sandbox fallback (pre-loaded with a full 13-person Goa trip seed).

---

## 🛠 Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React icons, React Router v6, TanStack Query, date-fns, Recharts, Sonner toasts, jsPDF.
- **Backend & Database**: Supabase, PostgreSQL 15, Row Level Security (RLS) policies, Stored Procedures for atomic ACID transactions.
- **Testing**: Vitest, @testing-library/react, jsdom.

---

## 📂 Project Structure

```
├── public/                 # Static assets and icons
├── src/
│   ├── components/
│   │   ├── group/          # Group workspace modals and tab panels
│   │   │   ├── tabs/       # Overview, Expenses, Balances, Settlements, Members, Activity, Analytics
│   │   │   ├── AddExpenseModal.tsx
│   │   │   ├── RecordSettlementModal.tsx
│   │   │   └── InviteMemberModal.tsx
│   │   ├── layout/         # AppLayout, Navbar, Sidebar, DemoNoticeBanner
│   │   └── ui/             # Core design system components (Button, Card, Badge, Modal, Tabs, Avatar)
│   ├── context/            # AuthContext (Supabase + demo persona switcher) & ThemeContext (dark/light)
│   ├── engine/             # Pure TypeScript financial calculation & debt simplification engine
│   │   ├── balanceEngine.ts
│   │   ├── splitCalculator.ts
│   │   └── __tests__/      # Vitest test suite including 13-person trip scenario
│   ├── lib/                # Supabase client and styling utilities
│   ├── pages/              # Auth, Dashboard, Groups, and Group Workspace views
│   ├── services/           # Unified DataService and seed data
│   └── types/              # Strict TypeScript definitions
├── supabase/
│   ├── migrations/         # PostgreSQL schema & atomic functions
│   └── seed.sql            # 13-person demo seed SQL script
├── .env.example            # Environment variables template
└── vite.config.ts
```

---

## ⚙️ Setup & Installation

### 1. Prerequisites
- Node.js v18+ (tested on v22.14.0)
- npm or pnpm

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

If connecting to your Supabase project:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_ENABLE_DEV_MOCK_FALLBACK=true
```

> **Note**: If Supabase credentials are left empty or set to placeholder values, SplitMate automatically runs in **Demo Sandbox Mode**, powered by local storage and seeded with the realistic 13-person Goa vacation trip scenario.

### 4. Supabase Database Setup (Optional for cloud backend)
To apply migrations and seed data in your Supabase project:
1. Log in to [database.new](https://database.new) to create a project.
2. Open the **SQL Editor**.
3. Run `supabase/migrations/20261106000001_initial_schema.sql` (Creates tables and RLS).
4. Run `supabase/migrations/20261106000002_functions_and_triggers.sql` (Creates atomic functions).
5. Optionally run `supabase/seed.sql` to populate initial demo accounts.

### 5. Run the Local Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🧪 Testing

SplitMate includes a comprehensive unit test suite covering:
- Equal, exact, percentage and share-based splits.
- Remainder paise deterministic allocation.
- Balance conservation.
- Greedy debt simplification.
- **The mandatory 13-person trip scenario**:
  - Transport (1 payer, 13 participants)
  - Accommodation (1 payer, 13 participants)
  - Breakfast meal (all 13)
  - Dinner (split among 8 only)
  - Supermarket groceries (paid by two members)
  - Scuba diving (custom percentage split)
  - Souvenirs (exact manual shares)
  - Pending settlement (does not affect balance)
  - Confirmed settlement (updates authoritative balance)
  - Edited expense (recalculates group balances dynamically)

To execute the tests:
```bash
npm test
```

---

## 🌐 Deployment to Vercel

1. Push this repository to GitHub or GitLab.
2. Import the project into [Vercel](https://vercel.com).
3. Set the Framework Preset to **Vite**.
4. Configure the environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy**.
