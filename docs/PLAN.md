# Phase 1 — Requirements, Design and Plan

This document was written before any implementation code. It is the baseline
the implementation is checked against; deviations discovered later are noted in
the README's "Known limitations" section rather than silently changed here.

## 1. Environment inspection (2026-10-25)

| Item              | Finding                                                  | Consequence                                                                                                            |
| ----------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Working directory | `/Users/joe/Claude` held unrelated projects, no Git repo | New repo created in `car-dealership-inventory/`                                                                        |
| Node.js / npm     | v25.8.1 / 11.11.0                                        | npm workspaces; CI pinned to Node 22 LTS                                                                               |
| Docker            | not installed                                            | `docker-compose.yml` provided but local DB uses Homebrew PostgreSQL 17 with a project-local data dir (`scripts/db.sh`) |
| PostgreSQL        | not installed → `brew install postgresql@17`             |                                                                                                                        |
| Git identity      | no global identity                                       | repo-local identity set; AI co-author trailer on every commit                                                          |

Dependency versions were pinned to the newest **stable** release of majors with
a known-compatible set (e.g. TypeScript 5.9 because `typescript-eslint`
supports `<6.1`; Prisma 7.10 because the `latest` dist-tag currently points at
an 8.0 release candidate).

## 2. Requirements checklist

Source: the Incubyte "AI Kata: Car Dealership Inventory System" brief plus the
master prompt. ✱ marks items that go beyond the brief.

### Backend API

- [ ] RESTful API, Node.js + TypeScript + Express
- [ ] PostgreSQL persistence (no in-memory store), Prisma migrations, repeatable seed
- [ ] Token-based auth (JWT): `POST /api/auth/register`, `POST /api/auth/login`
- [ ] Vehicle has unique ID, make, model, category, price, quantity in stock
- [ ] `POST /api/vehicles` — add vehicle (admin)
- [ ] `GET /api/vehicles` — list vehicles (paginated)
- [ ] `GET /api/vehicles/:id` — one vehicle ✱
- [ ] `GET /api/vehicles/search` — by make, model, category, price range (+ sort, pagination)
- [ ] `PUT /api/vehicles/:id` — update details (admin — see §5 decision)
- [ ] `DELETE /api/vehicles/:id` — delete (admin only)
- [ ] `POST /api/vehicles/:id/purchase` — decrease quantity (authenticated)
- [ ] `POST /api/vehicles/:id/restock` — increase quantity (admin only)
- [ ] Purchases are atomic, never oversell, never go negative, fail without partial writes
- [ ] Consistent JSON errors and status codes (400/401/403/404/409/413/429/500)
- [ ] Security: hashing, generic login failure, rate limiting, helmet, body limits, env-driven CORS, validated secrets

### Frontend SPA

- [ ] React + TypeScript + HTML5 + CSS3 + Tailwind
- [ ] Registration and login forms with validation
- [ ] Dashboard/home showing all vehicles from the real API
- [ ] Search and filter (make, model, category, price range), sorting, pagination
- [ ] Purchase button per vehicle, disabled when quantity is 0
- [ ] Admin UI to add, update, delete (with confirmation) and restock vehicles
- [ ] Vehicle detail view ✱, loading / empty / error / success states
- [ ] Responsive, accessible, original visual identity

### Process & deliverables

- [ ] TDD with visible Red → Green → Refactor commits
- [ ] Unit, integration (real DB), component and E2E tests; coverage report
- [ ] Lint, type-check, production builds; GitHub Actions CI
- [ ] AI co-author trailer on AI-assisted commits
- [ ] README with setup, API docs, screenshots, test report, **My AI Usage**
- [ ] `PROMPTS.md` with raw logs (no AI-written summaries)

## 3. Architecture

A modular monolith in an npm-workspaces repo.

```
backend/   Express API  ──Prisma (driver adapter: pg)──►  PostgreSQL
frontend/  React SPA (Vite) ──fetch /api (dev proxy)──►  backend
e2e/       Playwright: real browser → real frontend → real API → test DB
```

Backend layering (dependencies point inwards only):

| Layer        | Responsibility                                                    | Knows about                             |
| ------------ | ----------------------------------------------------------------- | --------------------------------------- |
| `routes`     | HTTP: parse/validate input with Zod, call service, shape response | Express, schemas, services              |
| `services`   | Business rules (auth, catalogue, inventory)                       | Prisma client (injected), domain errors |
| `prisma`     | Schema, migrations, DB constraints                                | —                                       |
| `middleware` | auth, roles, CSRF, errors, rate limits                            | token service                           |

`createApp({ db, config })` builds the app from injected dependencies, so tests
can run against the real test database or a stub that simulates DB failure.

## 4. Data model

```
User      id uuid PK · name · email UNIQUE (lower-cased) · passwordHash · role ADMIN|USER · timestamps
Vehicle   id uuid PK · make · model · category enum · price numeric(10,2) CHECK > 0
          · quantity int CHECK >= 0 · year int? CHECK range · fuelType enum? · description? · imageUrl? · timestamps
          indexes: category, price, (make, model), createdAt
Purchase  id uuid PK · userId FK → User (cascade) · vehicleId FK → Vehicle (SET NULL on delete)
          · vehicleMake/vehicleModel snapshot · quantity CHECK > 0 · unitPrice · totalPrice
          · idempotencyKey? · UNIQUE (userId, idempotencyKey) · createdAt
```

Decisions:

- **Make / model are validated, trimmed text** rather than lookup tables. The set
  of makes and models is open-ended and the brief has no requirement to manage
  them; normalising would add joins and admin screens with no user value.
  **Category is a database enum** — a small closed set that drives filters and
  the UI, so the DB should reject anything else.
- **Price is `numeric(10,2)`**, never a float; serialised to JSON as a number.
- **Invariants live in the database too** (`CHECK quantity >= 0`, `price > 0`),
  so even a buggy code path cannot persist negative stock.
- **Purchase audit table** — proportionate: it records who bought what at what
  price (snapshot survives vehicle deletion) and enables idempotent retries.

## 5. API contract (summary — full examples in the README)

Envelope: success `{ "data": ... , "meta"?: {...} }`; error
`{ "error": { "code", "message", "details"? } }`.

| Method & path                                                                                 | Auth                 | Success                                           | Notable errors                          |
| --------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------- | --------------------------------------- |
| `POST /api/auth/register` `{name,email,password}`                                             | public, rate-limited | 201 user + token, sets cookies                    | 400, 409 `EMAIL_ALREADY_REGISTERED`     |
| `POST /api/auth/login` `{email,password}`                                                     | public, rate-limited | 200 user + token, sets cookies                    | 400, 401 `INVALID_CREDENTIALS`          |
| `GET /api/auth/me`                                                                            | user                 | 200 user                                          | 401                                     |
| `POST /api/auth/logout`                                                                       | public               | 204 clears cookies                                | —                                       |
| `GET /api/vehicles?page&pageSize&sort`                                                        | public               | 200 list + meta                                   | 400                                     |
| `GET /api/vehicles/search?q&make&model&category&minPrice&maxPrice&inStock&sort&page&pageSize` | public               | 200 list + meta                                   | 400                                     |
| `GET /api/vehicles/:id`                                                                       | public               | 200                                               | 400, 404                                |
| `POST /api/vehicles`                                                                          | admin                | 201                                               | 400, 401, 403                           |
| `PUT /api/vehicles/:id`                                                                       | admin                | 200                                               | 400, 401, 403, 404                      |
| `DELETE /api/vehicles/:id`                                                                    | admin                | 204                                               | 401, 403, 404                           |
| `POST /api/vehicles/:id/purchase` `{quantity?=1}` + optional `Idempotency-Key`                | user                 | 201 purchase + vehicle (200 on idempotent replay) | 400, 401, 404, 409 `INSUFFICIENT_STOCK` |
| `POST /api/vehicles/:id/restock` `{quantity}`                                                 | admin                | 200 vehicle                                       | 400, 401, 403, 404                      |
| `GET /api/inventory/summary` ✱                                                                | admin                | 200 stock statistics                              | 401, 403                                |
| `GET /api/health`                                                                             | public               | 200 incl. DB check                                | 503                                     |

Decisions:

- **Catalogue reads are public** (it is a storefront); purchasing requires a
  user; mutations of the catalogue require ADMIN.
- **`PUT` replaces descriptive details but not `quantity`.** Stock changes go
  only through `purchase` (atomic decrement) and `restock` (atomic increment).
  Letting an edit form write an absolute quantity would cause lost updates: an
  admin editing a stale form would silently undo purchases made meanwhile.
  Initial stock is set on create.
- **Purchases are idempotent per `Idempotency-Key`** so a retried request (double
  click, flaky network) never buys twice.
- **Registration always creates `USER`.** Admins are created by a CLI script
  (`npm run admin:create`) that reads credentials from the environment.

### Concurrency strategy for purchase

Inside one transaction:

1. `UPDATE vehicle SET quantity = quantity - n WHERE id = $1 AND quantity >= n`
   (Prisma `updateMany` with a `gte` guard). Postgres row-locks the row, and a
   concurrent update re-checks the `WHERE` after the lock is released, so two
   buyers cannot both take the last unit.
2. 0 rows updated → look up the vehicle → 404 or 409, nothing written.
3. Insert the purchase record; if it fails (e.g. duplicate idempotency key)
   the decrement rolls back with it.

## 6. Authentication design

- Passwords: **Argon2id** (library defaults: 64 MiB, t=3). Login runs a dummy
  verify when the email is unknown so timing does not reveal account existence.
- Tokens: HS256 JWT, 60 min expiry, `iss`/`aud`/`sub`/`role` claims verified with
  a pinned algorithm. The user is re-loaded from the DB on every authenticated
  request, so deleted users and role changes take effect immediately.
- Browser: token in an **HttpOnly, SameSite=Lax, Secure-in-production cookie**
  (not localStorage → not readable by XSS). CSRF defence for cookie-authenticated
  mutations: a random CSRF value is embedded in the signed JWT and also sent in a
  readable cookie; the SPA echoes it in `X-CSRF-Token` and the server compares it
  to the JWT claim (signed double-submit). `Authorization: Bearer` is also
  accepted for API clients; CSRF does not apply to it.
- Rate limiting on auth routes, `helmet` headers, 10 kB JSON body limit, CORS
  allow-list from `CORS_ORIGINS`, startup validation of all env vars with Zod.

## 7. Test strategy

| Level               | Tooling                                          | Scope                                                                         |
| ------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------- |
| Backend unit        | Vitest                                           | env parsing, password hashing, token service, query parsing                   |
| Backend integration | Vitest + Supertest + **real PostgreSQL test DB** | every endpoint, auth/roles, validation, DB constraints, concurrency, failures |
| Frontend component  | Vitest + React Testing Library + MSW             | forms, catalogue states, purchase/zero-stock, admin-only controls, mutations  |
| End-to-end          | Playwright                                       | the 10 workflows from the brief against real servers + e2e DB                 |

Rules: tests run against `*_test` databases only (guarded in code); tables are
truncated between tests; integration tests run serially. Coverage target ≥ 80 %
lines for backend business logic; the report decides, not the plan.

## 8. Implementation plan (each step = failing test → code → refactor → commit)

1. Scaffold workspaces, tooling, DB script, CI skeleton.
2. Backend: health + error envelope → env validation → Prisma schema & constraints.
3. Auth: register → login → `me`/logout → auth & role middleware → CSRF → rate limit/CORS/headers.
4. Vehicles: create → get/list/pagination → search/filter/sort → update → delete.
5. Inventory: purchase (+ concurrency, idempotency, failure rollback) → restock → summary.
6. Seed data and admin CLI.
7. Frontend: API client → auth pages → catalogue → detail/purchase → admin screens → visual polish.
8. Playwright E2E, coverage, lint/type-check/build, CI.
9. README, screenshots, test report, AI usage, PROMPTS.md.
