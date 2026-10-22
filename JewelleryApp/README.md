# JewelleryApp

A working prototype of a shop-management app for an Indian jewellery store moving from manual registers to a digital system. It covers:

- Customers (CRM)
- Sales and POS billing
- GST invoices
- Daily metal rates
- Stock
- Purchases from vendors
- Master data
- Reports
- A login page with the shop's own branding

## Run it

There's no install or build step. Open `index.html` in Chrome, Edge or Firefox. You can also serve the folder:

```bash
cd JewelleryApp
python3 -m http.server 8080   # then open http://localhost:8080
```

Demo logins (change them under **Settings → Users**):

| Role    | Username | Password     | Access |
|---------|----------|--------------|--------|
| Admin   | admin    | admin123     | Everything, including settings, branding and users |
| Manager | manager  | manager123   | Everything except settings and users |
| Sales   | sales    | sales123     | Dashboard, rates (view only), billing, invoices, customers, stock (view only) |

## Screens

| Screen | What it does |
|--------|--------------|
| **Login** | Branded with the shop's logo, name, tagline, colours, background image and welcome message (set in Settings). |
| **Dashboard** | Today's and this month's sales, stock in hand and its value at today's rate, customer dues, vendor payables, today's rates, a 7-day sales chart, recent bills, upcoming birthdays and anniversaries, and low-stock alerts. |
| **Today's Rates** | Enter the gold, silver and platinum rates per gram for every purity. "Auto-fill" works out 22K, 18K and 14K from 24K, and 925 silver from 999. Every rate change is kept in a history with a trend chart. Billing uses the latest saved rate, and it shows in the top bar on every screen. |
| **New Sale / Billing (POS)** | Scan or type a tag number or HUID, or browse stock. Each line is priced as net weight × rate + wastage/VA + making charge (percent, per gram or flat) + stone value + hallmark charge. Rate, making and VA can be edited per line. Customer-group making discounts apply automatically. The bill also handles discounts, old-gold exchange (deducted after GST), CGST/SGST or IGST, split payments and balance due. On save the invoice prints. |
| **Sales & Invoices** | Search and filter bills, then view or print the branded GST tax invoice (with HUIDs and the amount in words), take payment against a due, or cancel a bill (its stock returns to inventory). |
| **Customers** | Customer list and profile: contact details, group, PAN/GSTIN, birthday, anniversary, ring size, notes, purchase history, payments and outstanding. Payments received are set against the oldest open bills first. |
| **Stock** | Every tagged piece with item, purity, gross/stone/net weight, stone details and value, HUID, vendor, location and value at today's rate. You can filter, add or edit pieces, and print tag labels. |
| **Purchases** | Stock inward from a vendor: one row per piece, with tags generated automatically and GST on the purchase. Also records vendor payments. |
| **Vendors** | Supplier list with a ledger for each (purchases, payments and amount payable). |
| **Master Data** | One screen for every master list: Item Master, Categories, Metals, Purity/Karat, HSN & GST, Stone Types, Payment Modes, Customer Groups, Customers, Vendors, and Users & Roles. Every list has search, add, edit, delete (blocked while a record is in use), and CSV export and import. |
| **Reports** | Any date range, with quick presets (today, this month, this financial year, …). Every report exports to CSV and prints or saves as PDF. |
| **Settings & Branding** | Logo, colours (with ready-made themes) and a live login-page preview. Also shop details (GSTIN, BIS licence, state), invoice/purchase/tag prefixes, the hallmark charge, invoice terms, an optional live rate feed URL, users, backup/restore and an activity log. |

### Reports

- **Sales:** Sales register, item/category/purity-wise sales, GST summary by HSN (B2B/B2C, for GSTR-1), collections by payment mode, old gold received, day book.
- **Stock:** Stock summary and valuation (gross, net and fine weight), tag-wise stock detail with age in days, re-order list.
- **Purchases:** Purchase register, vendor payables.
- **Customers:** Outstanding dues, top customers, upcoming birthdays and anniversaries.
- **Rates:** Rate history.

## Pre-loaded Item Master (113 items)

| Category | Items |
|----------|-------|
| **Gold (22K)** | Ladies, gents and navratna rings; couple bands; chains (plain, rope, box); necklace, choker, haar, rani haar; mangalsutra and mangalsutra chain; thali; pendants, lockets, god pendants; bangles, kada, bracelet, bajuband; kids' nazariya; jhumka, studs/tops, bali, chandbali, sui dhaga, danglers, kaan chain; nose pin, nath; maang tikka; passa/jhoomar; kamarbandh; haathphool; gold payal; bichhiya; cufflinks, tie pin, brooch, hair pin |
| **Temple** | Necklace, kasu mala / Lakshmi haar, jhumka, oddiyanam, vanki, nethi chutti |
| **Kundan & Polki** | Necklace sets, Polki necklace, Jadau earrings, maang tikka, bangles, nath |
| **Diamond (18K)** | Rings, solitaire, eternity band, earrings, pendant, necklace, bangle, bracelet, nose pin, mangalsutra |
| **Platinum (950)** | Ring, couple bands, chain, bracelet, pendant, earrings |
| **Silver jewellery** | Payal/pajeb, bichhiya, kada, chain, ring, bracelet, earrings, kamarbandh, oxidised necklace, nazariya |
| **Silver articles** | Glass, thali, katori, spoon, baby set, pooja thali, diya, kalash, idols, photo frame, kumkum dabbi, tray |
| **Bullion & coins** | Gold coins (1, 2, 5, 8 and 10 g), gold bars (50 and 100 g), silver coins (10, 20 and 50 g), silver bar (1 kg) |
| **Gemstones (Navratna)** | Manik, Panna, Pukhraj, Neelam, Moti, Moonga, Gomed, Lehsunia, Opal, Navratna set, certified loose diamond |

Each item carries HSN code and GST, default purity, pricing method (by weight or fixed MRP), making-charge type and value, wastage %, unit and re-order level.

Other master data also comes pre-loaded:

- **Purities:** 24K/999, 22K/916, 20K/833, 18K/750, 14K/585, Silver 999/925, Platinum 950.
- **HSN codes:** 7113, 7114, 7118, 7108, 7106, 7110, 7102 (0.25%), 7103, 7117.
- **Stone types,** payment modes and customer groups.

Demo vendors, customers, stock pieces and bills are included so every screen has data to show.

## India-specific rules built in

- GST at the HSN rate per line: CGST + SGST within the state, IGST between states. IGST switches on automatically when the customer's state differs from the shop's.
- **Section 269ST:** a bill is blocked if it takes ₹2 lakh or more in cash.
- **Rule 114B:** customer PAN is required on bills of ₹2 lakh or more.
- 6-character BIS HUID per piece, shown on the invoice and on tag labels.
- Old gold (URD) is valued at net weight after the melting deduction and taken off after GST.
- Document numbers run per financial year, e.g. `INV/2026-27/0001`.
- Amounts use Indian formatting (lakh/crore), and the amount in words follows the same system.

## Project layout

```
JewelleryApp/
├── index.html
├── css/styles.css         # theme comes from Settings via CSS variables
└── js/
    ├── utils.js           # formatting, dates, SHA-256, CSV, amount in words
    ├── pricing.js         # jewellery line pricing and invoice/GST maths
    ├── seed.js            # Indian item master and demo data
    ├── db.js              # data layer: the only file that touches storage
    ├── ui.js              # modal, toast, forms, tables, generic master CRUD
    ├── auth.js            # login, roles, branded login page
    ├── biz.js             # shared business helpers
    ├── schemas.js         # field and column definitions for every master
    ├── app.js             # app shell, navigation, router
    └── pages/             # dashboard, rates, pos, sales, customers, stock,
                           # purchases, vendors, reports, masters, settings
```

## Prototype limits and next steps

- **Storage:** data is kept in the browser (`localStorage`) on the computer where the app is used. Take regular backups (Settings → Download backup). To share data across counters or branches, replace `js/db.js` with calls to a backend API and database (for example Node or Django with PostgreSQL). All screens go through `DB`, so nothing else needs to change.
- **Security:** sign-in is checked inside the browser with salted SHA-256 hashes, which is fine for a demo. A production version needs server-side authentication.
- **Live rates:** set **Settings → Live rate feed URL** to an endpoint that returns JSON such as `{"G24K": 12850, "G22K": 11780, "S999": 165}`.
- **Possible additions:** barcode printer integration, WhatsApp/SMS bills and greetings, e-invoicing/IRN, gold saving schemes, repair and custom orders, karigar job work and multi-branch support.
