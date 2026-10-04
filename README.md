# WalletX

WalletX is a Digital Wallet Management System inspired by popular digital payment platforms like Google Pay and PhonePe. It provides common digital wallet features such as transaction management, balance tracking, transaction history, and secure payment management.
Along with these standard features, WalletX introduces additional and unique features that are not commonly available in GPay and PhonePe, making the system more flexible for personal and shared expense management. These include separate Credit and Debit transaction views, monthly Credit and Debit summaries, Group Expense Division for splitting expenses among multiple users, transaction categorization, detailed financial activity tracking, and other personalized wallet-management features.
The project aims to provide an organized, user-friendly, and feature-rich digital wallet experience while extending the functionality of traditional digital payment applications.

## Run locally

Requires Node.js 20 or newer. No npm packages need to be installed.

```powershell
npm start
```

Open [http://localhost:3000](http://localhost:3000). For automatic restart while editing, use `npm run dev`.

Choose **Continue with demo account** on the login screen to open an account with sample transactions, monthly budgets, and a recurring bill reminder. New accounts and changes are stored in `data/walletx.json` on this machine. That data file is created on first use and is excluded from Git.

## Included features

User Registration and Login
Digital Wallet and Balance Management
Credit and Debit Transaction Management
Separate Credit and Debit Transaction Lists
Monthly Total Credit and Total Debit Summary
Complete Transaction History
Transaction Categorization
Add, Edit and Delete Transactions
Group Expense Division – split expenses among multiple users
Shared Expense Tracking
Monthly Financial Activity Tracking
Income and Expense Monitoring
Recent Transactions Dashboard
Personalized Wallet Management
Secure and User-Friendly Interface
Additional features beyond the commonly available functionality of traditional digital payment applications.

## API overview

The frontend and API are served from the same origin. Authenticated API requests use a bearer token.

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/demo`, `POST /api/auth/logout`
- `GET /api/dashboard?month=YYYY-MM`
- `GET|POST /api/transactions`, `DELETE /api/transactions/:id`, `POST /api/transfers`
- `GET|POST /api/budgets`, `DELETE /api/budgets/:id`
- `GET|POST /api/recurring`, `DELETE /api/recurring/:id`
- `GET|POST /api/groups`, `DELETE /api/groups/:id`
- `GET|PUT /api/profile`, `GET|POST /api/banks`, `DELETE /api/banks/:id`

This is a local prototype: wallet entries and peer transfers are recorded in the app; bank linking and QR/payment network processing are not connected to external financial services. You can link multiple masked bank accounts. Transactions show the selected account, appear together in **All accounts** history, and include monthly credit/debit totals for each account on **My wallet**. Account selection is for record-keeping; no bank balance or real payment is accessed.

## Frontend files

The browser loads small, separate JavaScript files in order from `public/index.html`:

- `public/js/core.js` — shared state, API client, formatting, notifications
- `public/js/auth.js` — landing page, login, and registration
- `public/js/layout.js` — sidebar, application shell, and shared layout helpers
- `public/js/shared.js` — shared table, chart, and budget-alert components
- `public/js/components/footer.js` — WalletX feature, payment, and project footer used at the end of the site
- `public/js/pages/` — dashboard information and separate screens for the wallet, transactions, payments, insights, budgets, reminders, group expenses, and profile
- `public/app.js` — page routing, form actions, and application startup
- `public/styles.css` — site-wide styling and responsive layout

The dashboard is an informational overview of WalletX. Use the sidebar to open and work with each wallet feature. The visual theme uses a custom teal, violet, and lime palette.
