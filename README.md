# SplitWise — Group Expense Splitter 💸

A polished, responsive, frontend-only financial web application for tracking shared group expenses and calculating simplified debt settlements.

Built with **React 19**, **TypeScript**, **Vite**, **Lucide Icons**, and vanilla **CSS with modern Glassmorphism styling**.

---

## 🌟 Key Features

- **Integer Minor Unit Precision**: All currency calculations are handled internally in minor units (paise/cents) to completely prevent floating-point rounding traps.
- **Deterministic Debt Simplification**: Calculates the minimum number of transactions needed so all group debts are settled cleanly.
- **Split Methods**:
  - **Equal Split**: Automatically divides the bill among included members and deterministically allocates remainder minor units so the sum matches the total.
  - **Unequal Shares**: Custom share inputs per person with real-time difference calculation.
  - **Percentage Split**: Assign percentage shares that total 100% with fractional rounding residue handling.
  - **Exact Amounts**: Explicit amounts per participant with live balance validation.
- **Settle Up Tracking**:
  - Suggested payments ("Aarav pays Priya ₹450.00").
  - "Mark as Settled" action that updates participant balances without double-counting or creating false expenses.
  - Undo recorded settlements at any time.
  - Transparent notification: offline tracking only, does not transfer real bank funds.
- **Activity Log**: Chronological ledger of expenses added, edited, deleted, and settlements recorded.
- **Group Management**:
  - Multi-currency support: INR (₹, default), USD ($), EUR (€), GBP (£).
  - Dynamic participant management with a minimum of 2 members, unique name validation, and "You" indicator.
  - Rename groups and update descriptions safely.
  - Clear all data with confirmation.
  - Optional pre-loaded sample group ("Goa Coastal Trip 🏖️") with realistic expenses and instant removal.
- **Privacy & Persistence**: 100% client-side with versioned `localStorage`. No accounts, no backend, no tracking.
- **Responsive Dashboard**: Responsive sidebar navigation on desktop and compact drawer navigation on mobile devices.

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Run Unit Tests
```bash
npm test
```
Runs the Vitest test suite testing balance calculations, debt simplification, unequal/fractional splits, and zero-sum invariants.

### 4. Build for Production
```bash
npm run build
```
Creates a standalone, highly optimized static production build in the `dist/` directory.

---

## 🌐 Deploying as a Static Website

Because this is a pure frontend application with no backend or API keys required, the built `dist/` folder can be hosted anywhere:

### GitHub Pages
1. Install `gh-pages`:
   ```bash
   npm install -D gh-pages
   ```
2. In `vite.config.ts`, set `base: '/<repo-name>/'`.
3. In `package.json`, add `"deploy": "gh-pages -d dist"`.
4. Run:
   ```bash
   npm run build
   npm run deploy
   ```

### Vercel / Netlify / Cloudflare Pages
- **Build command**: `npm run build`
- **Output directory**: `dist`
- **Node version**: 18+

---

## 📐 Balance & Settlement Algorithm

For any expense:
1. Payer's balance increases by `+amountMinor`.
2. Each participant's balance decreases by `-shareMinor`.
3. The sum of all balances across participants is always **0** (Zero-Sum Invariant).
4. Completed settlements offset the payer's balance by `+amount` and the payee's balance by `-amount`.
5. The debt simplification algorithm partitions participants into debtors and creditors, sorts them deterministically by magnitude, and greedily satisfies obligations in minimal transfers.
