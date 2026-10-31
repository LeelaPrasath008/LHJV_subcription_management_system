# SubscriptIQ — Subscription Management System

Full-stack SaaS dashboard for managing customers, plans, subscriptions and invoices.

- **Frontend:** React 18, TypeScript, Tailwind CSS, Recharts (Vite)
- **Backend:** Java 21, Spring Boot 3.3, Spring Security (JWT), Spring Data JPA, REST
- **Database:** PostgreSQL 16
- **Deployment:** Docker Compose (db + backend + frontend/nginx)

> **Payments:** this app *tracks* payments (a staff member records that money was received). No payment gateway is integrated and no real money is processed.

## Prerequisites (Windows)

| Tool | Version | Needed for |
|---|---|---|
| Docker Desktop (WSL 2 backend) | recent | Docker run (easiest) |
| Java JDK | 21 | local backend dev |
| Maven | 3.9+ | local backend dev |
| Node.js | 20+ | local frontend dev |
| VS Code | any | editing (Extension Pack for Java, ESLint optional) |

## Option A — Run everything with Docker (recommended)

```powershell
copy .env.example .env      # then edit .env: set DB_PASSWORD and JWT_SECRET (32+ chars)
docker compose up --build
```

Open **http://localhost:3000**. The backend waits for PostgreSQL's health check, creates the schema, and seeds demo data on first start. API: http://localhost:8080/api.

Stop: `docker compose down`. Wipe the database too: `docker compose down -v`.

## Option B — Local development

```powershell
# 1. database only
copy .env.example .env
docker compose up -d db

# 2. backend (new terminal) — PowerShell (run from the backend folder)
cd backend
$env:JWT_SECRET="replace-with-a-random-string-of-32-or-more-chars"
$env:DB_PASSWORD="<same DB_PASSWORD as in .env>"
$env:DB_URL="jdbc:postgresql://localhost:5433/subscriptiq"   # matches DB_PORT=5433 in .env
.\mvnw.cmd spring-boot:run   # wrapper: no Maven install needed

# 3. frontend (new terminal)
cd frontend
npm install
npm run dev          # http://localhost:5173 (proxies /api to :8080)
```

## Demo credentials (created only on an empty database)

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `Admin@123` |
| Staff | `staff` | `Staff@123` |

Override with `ADMIN_PASSWORD` / `STAFF_PASSWORD`; disable seeding with `SEED_DEMO_DATA=false`. **Change these for anything beyond a demo.**

### Role permissions

| Capability | Staff | Admin |
|---|---|---|
| View dashboard, customers, plans, subscriptions, invoices, alerts | ✅ | ✅ |
| Create/edit customers, subscriptions; renew/cancel; record payments; generate invoices | ✅ | ✅ |
| Delete customers / subscriptions | ❌ | ✅ |
| Create/edit/delete plans | ❌ | ✅ |
| Reports page + CSV export | ❌ | ✅ |

Rules are enforced on the server (Spring Security); the UI just hides what you can't use.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT` | subscriptiq / subscriptiq / **required (compose)** / 5432 | PostgreSQL |
| `DB_URL` | `jdbc:postgresql://localhost:5432/subscriptiq` | backend JDBC URL (set by compose) |
| `JWT_SECRET` | **required**, ≥32 chars | token signing key; backend refuses to start without it |
| `JWT_EXPIRY_MINUTES` | 480 | token lifetime |
| `CORS_ORIGINS` | localhost:3000, localhost:5173 | allowed browser origins |
| `SEED_DEMO_DATA`, `ADMIN_PASSWORD`, `STAFF_PASSWORD` | true / Admin@123 / Staff@123 | demo data |
| `INVOICE_DUE_DAYS` | 14 | days until an invoice is due |
| `BACKEND_PORT`, `FRONTEND_PORT` | 8080 / 3000 | host ports |

## How billing works

- Creating a subscription sets `endDate = startDate + plan cycle` (or your custom end date) and **generates the first invoice** (PENDING, due in 14 days).
- **Renew** extends the end date by one cycle and issues a new invoice. Auto-renew subscriptions are renewed by a job at startup and nightly (02:00).
- Non-auto-renew subscriptions past their end date become **EXPIRED**; unpaid invoices past due become **OVERDUE** (refreshed on every list/dashboard load and by the job).
- **MRR** = sum over ACTIVE subscriptions of price ÷ cycle months.
- **Alerts** (bell in the header + dashboard): subscriptions ending within 7 days and overdue invoices. These are in-app notifications; no emails are sent.

## API (all under `/api`, JSON, `Authorization: Bearer <token>` except login)

| Method & path | Notes |
|---|---|
| `POST /auth/login` | `{username,password}` → `{token,username,fullName,role}` |
| `GET /auth/me`, `GET /health` | current user / liveness |
| `GET /customers?q&page&size` · `GET/PUT/DELETE /customers/{id}` · `POST /customers` | DELETE admin; 409 if customer has subscriptions |
| `GET /plans` · `POST /plans` · `PUT/DELETE /plans/{id}` | writes admin only |
| `GET /subscriptions?q&status&page&size` · `GET/PUT/DELETE /subscriptions/{id}` · `POST /subscriptions` | DELETE admin |
| `POST /subscriptions/{id}/renew` · `POST /subscriptions/{id}/cancel` | |
| `GET /invoices?q&status&page&size` · `GET /invoices/{id}` | |
| `POST /invoices/generate/{subscriptionId}` · `POST /invoices/{id}/pay` | pay body: `{method,reference}` |
| `GET /dashboard` · `GET /alerts` | |
| `GET /reports` · `GET /reports/invoices.csv` | admin only |

Paged responses: `{ "content": [...], "page": { "size", "number", "totalElements", "totalPages" } }`. Errors: `{ "status", "message", "fieldErrors": {field: msg} }`.

## Tests

```powershell
cd backend ; .\mvnw.cmd test          # JUnit 5 + MockMvc against in-memory H2 (no Docker needed)
cd frontend ; npm run build    # type-checks and builds the UI
```

Backend tests cover billing-cycle math, login, 401/403 role rules, validation errors, and subscription → invoice creation. Frontend validation (required fields, email/phone format, date order, price > 0) runs in the forms and the server re-validates.

## Troubleshooting

- **`JWT_SECRET must be set and at least 32 characters`** — set it in `.env` (Docker) or `$env:JWT_SECRET` (local).
- **`variable is not set` / `Copy .env.example to .env`** from compose — you haven't created `.env`.
- **Port 5432/8080/3000 already in use** — change `DB_PORT` / `BACKEND_PORT` / `FRONTEND_PORT` in `.env` (stop a local PostgreSQL service if needed).
- **Backend can't connect to the DB locally** — run `docker compose up -d db`, and make sure `DB_PASSWORD` matches `.env`. If you changed the password after the first start, run `docker compose down -v` to recreate the volume.
- **Docker says the daemon isn't running** — start Docker Desktop and wait for the whale icon to settle; enable the WSL 2 engine.
- **Login fails with "Invalid username or password" after changing demo passwords** — seed data only runs on an empty DB; `docker compose down -v` to reseed.
- **Frontend shows "Cannot reach the server"** — backend not up yet (`docker compose logs backend`) or, in dev, not on port 8080.
- **`mvn` not found** — use the bundled wrapper (`.\mvnw.cmd` on Windows, `./mvnw` on macOS/Linux); it downloads Maven automatically (needs internet and `JAVA_HOME` pointing to JDK 21).

## Known limitations / unfinished

- **The Java backend was not compiled or run in the environment where this was generated** (no Maven Central access there). The frontend was type-checked and built, and Java sources were parse-checked only. Run `mvn test` first; expect to fix a small compile/runtime issue or two.
- Schema is managed by Hibernate `ddl-auto: update` (fine for a demo; use Flyway/Liquibase for production).
- No user-management UI (users are seeded), no password change, no refresh tokens; JWT is kept in `localStorage`.
- Alerts are in-app only (no email/SMS). No PDF invoice download (CSV export only). Single currency (USD display).
- Dashboard/report aggregation is done in Java over all rows — fine for demo data, not for large volumes.
