# טיפולוג – מערכת ניהול קליניקה למטפלים פרטיים

Tipulog-style clinic management system for private practitioners (therapists, psychologists,
social workers, coaches). Hebrew, RTL, built with Next.js.

![Hebrew RTL practice management app](docs/screenshot-dashboard.png)

## Features

- **מטופלים (Patients)** – searchable patient registry, full patient file with tabs:
  personal details, appointment history, session notes, and payments/balance.
- **יומן (Calendar)** – weekly RTL calendar grid (Sunday–Saturday), click a slot to book,
  color-coded appointment statuses (scheduled / completed / cancelled / no-show).
- **סיכומי טיפול (Clinical notes)** – session notes per patient/appointment, with reusable
  note templates ("smart form" skeletons) managed in a dedicated screen.
- **תשלומים (Billing lite)** – record payments (cash / transfer / check / card), automatic
  running receipt numbers, per-patient balance (completed sessions − payments), printable receipt.
- **דוחות (Reports)** – sessions log and collections reports with date-range filter and
  CSV export (UTF-8 BOM so Hebrew opens correctly in Excel).
- **לוח בקרה (Dashboard)** – today's schedule, weekly session count, active patients,
  monthly collections and open balances.
- **Auth** – email + password registration/login (bcrypt), signed HTTP-only session cookie (JWT).

## Tech stack

- [Next.js](https://nextjs.org) (App Router, Server Actions) + TypeScript
- Tailwind CSS v4, RTL layout
- SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) +
  [Drizzle ORM](https://orm.drizzle.team) (schema in `src/db/schema.ts`)
- `jose` (session JWT), `bcryptjs` (password hashing)

The SQLite schema is bootstrapped automatically on first run (`src/db/index.ts`),
so no migration step is needed for local development. `drizzle.config.ts` is included
for generating migrations when moving to a managed database later.

## Getting started

```bash
npm install
npm run db:seed     # optional: demo practitioner + 10 patients, appointments, notes, payments
npm run dev
```

Open http://localhost:3000.

Demo login (after seeding):

- **Email:** `demo@tipulog.local`
- **Password:** `demo1234`

Or register a fresh account at `/register`.

## Configuration

| Env var | Default | Purpose |
| --- | --- | --- |
| `SESSION_SECRET` | dev fallback | Secret for signing session JWTs — set in production |
| `DATABASE_FILE` | `./data/tipulog.db` | SQLite database location |

## Project structure

```
src/
├── app/
│   ├── (auth)/          # login, register + auth server actions
│   ├── (app)/           # authenticated shell (sidebar nav)
│   │   ├── dashboard/
│   │   ├── calendar/    # week view, new/edit appointment
│   │   ├── patients/    # list, new, patient file (tabs)
│   │   ├── payments/    # payments list + printable receipt
│   │   ├── reports/     # sessions & collections + CSV export
│   │   └── templates/   # note templates
│   └── api/reports/csv/ # CSV export endpoint
├── components/          # shared UI, patient/appointment forms
├── db/                  # drizzle schema, connection + bootstrap, seed
└── lib/                 # auth, session, formatting, labels, queries
```
