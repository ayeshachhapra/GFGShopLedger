# ShopLedger

## Stack

Node.js 22+ and npm (Node.js 24 is the workshop reference). CommonJS, Express 4, body-parser, vanilla HTML/CSS/JS, and a JSON data store.
`server.js` serves `public/`, mounts API routers, and renders the printable invoice route. `config.js` holds shop, tax, and coupon settings.

## Module map

- `routes/products.js` lists catalog products and active coupons.
- `routes/orders.js` lists, fetches, places, and cancels orders.
- `routes/customers.js` lists Khata accounts and records settlements.
- `routes/reports.js` serves dashboard, GST reconciliation, pricing preview, and admin export.
- `lib/coupons.js` normalizes and validates codes and calculates discounts.
- `lib/dates.js` formats dates and exposes date and fiscal-year helpers.
- `lib/inventory.js` checks sellable stock and applies inventory updates.
- `lib/invoice.js` computes invoice figures and renders printable HTML.
- `lib/ledger.js` manages Khata balances, debits, reversals, and settlements.
- `lib/orders.js` creates, retrieves, filters, and cancels order records.
- `lib/pricing.js` calculates checkout totals and per-line taxable amounts and GST.
- `lib/reports.js` builds dashboard summaries and reconciles invoice and ledger figures.
- `lib/store.js` reads and writes `data/db.json` and keeps audit entries.
- `lib/tax.js` resolves GST rates and splits CGST and SGST.

## Commands

- Check the active runtime with `node --version` and `npm --version`.
- For workshop reproduction, install existing dependencies with `npm install` and run `npm start` in a temporary copy. Set `PORT=3100` (PowerShell: `$env:PORT = '3100'`).
- Run tests with `node --test`.

## Workshop rules

1. Write characterization tests before changing behavior.
2. Keep production changes within the selected ticket's modules.
3. Use in-memory test data. Tests must never read or write `data/db.json`.
4. Add no dependencies.
5. Make the smallest fix that works.

## Current ticket

Invoice total and GST breakdown do not match what the customer was billed.
Production scope is `lib/invoice.js`, with `lib/tax.js` allowed only if needed.
Use `test/invoice.test.js` for checkout and invoice characterization and regression tests.
