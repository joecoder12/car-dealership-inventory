# Test report

**Run:** 2026-10-24 20:18 UTC on macOS (Apple Silicon), Node.js 25.8.1, npm 11.11,
PostgreSQL 17.11 (local cluster from `scripts/db.sh`), Playwright Chromium.
**Commit under test:** `094149f` (plus documentation-only changes).
**Raw, unedited output of every command:** [`docs/test-report/`](test-report/).

## Summary

| Gate             | Command                                      | Result                                             |
| ---------------- | -------------------------------------------- | -------------------------------------------------- |
| Formatting       | `npm run format:check`                       | ✅ all files formatted                             |
| Lint             | `npm run lint`                               | ✅ 0 errors, 0 warnings                            |
| Type-check       | `npm run typecheck` (backend, frontend, e2e) | ✅ no errors                                       |
| Backend tests    | `cd backend && npx vitest run --coverage`    | ✅ **174 / 174** passed, 13 files                  |
| Frontend tests   | `cd frontend && npx vitest run --coverage`   | ✅ **62 / 62** passed, 10 files                    |
| Production build | `npm run build`                              | ✅ backend `tsc`, frontend Vite build, no warnings |
| End-to-end       | `npx playwright test`                        | ✅ **11 / 11** passed                              |

Each test suite exited with code 0 and reported no unhandled errors. (One
earlier run did report unhandled rejections from a test stub; that was fixed
in `e192a63`, see the README's _Development process_.)

## GitHub Actions (CI)

The same gates ran on GitHub after the first push: [run 40184006297](https://github.com/joecoder12/car-dealership-inventory/actions/runs/40184006297)
(2026-10-25 10:15 UTC, `ubuntu-latest`, Node 22.23.3 from `.nvmrc`,
`postgres:17-alpine` service). All 18 steps succeeded: formatting, lint,
type-check, **174 / 174** backend and **62 / 62** frontend tests with coverage,
production builds and **11 / 11** Playwright tests. This also confirms the
project installs and passes from a clean checkout on Linux and Node 22.

## Coverage

|                                                                            | Statements | Branches | Functions | Lines       |
| -------------------------------------------------------------------------- | ---------- | -------- | --------- | ----------- |
| **Backend** (`backend/src`, excl. generated Prisma client and `server.ts`) | 98.91 %    | 91.24 %  | 97.95 %   | **99.12 %** |
| **Frontend** (`frontend/src`, excl. tests and `main.tsx`)                  | 95.31 %    | 84.46 %  | 94.18 %   | **96.70 %** |

The target was ≥ 80 % for critical backend logic; it is exceeded. The
inventory service (purchase, restock, summary), auth service, token service and
middleware all have 100 % line coverage.

**Known gaps** (from the coverage tables in the raw logs):

- Backend: `logger.ts` (the console logger; tests inject a recording logger);
  re-throw branches for _unexpected_ Prisma errors in `vehicle.service.ts` and
  `inventory.service.ts`; a defensive `row ?? 0` fallback in the summary query.
- Frontend: `App.tsx` (only wires `BrowserRouter`; tests use the same routes
  with a `MemoryRouter`); toast auto-dismiss timer; account-menu outside-click
  and Escape handling; the _Previous page_ handler; admin-table error/retry
  state; the generic (non-404) error view on the detail page.

None of these is business logic; they are listed so the numbers are not read as
"everything is tested".

## What the suites cover

### Backend — Vitest + Supertest against a real PostgreSQL `_test` database

| File                                         | Focus                                                                                                                                                                                                                |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unit/config.test.ts`                        | env defaults, coercion, secret strength/placeholder, CORS list, `TRUST_PROXY`, no secret echo                                                                                                                        |
| `unit/password.test.ts`                      | Argon2id format, salting, verify, corrupt hash fails closed                                                                                                                                                          |
| `unit/token-service.test.ts`                 | round-trip, expiry, wrong secret, tampering, algorithm pinning, issuer/audience, claim shape                                                                                                                         |
| `integration/database-constraints.test.ts`   | CHECK constraints: stock ≥ 0, decrement below zero, price > 0, year range, lower-case email, purchase quantity                                                                                                       |
| `integration/app.test.ts`                    | health (200/503), JSON 404, malformed JSON 400, 413 body limit, helmet headers, CORS allow/deny                                                                                                                      |
| `integration/auth.test.ts`                   | register/login/me/logout, cookies (HttpOnly, SameSite=Strict), generic 401, duplicate + concurrent registration, role cannot be self-assigned, expired/malformed/orphaned tokens, rate limiting incl. behind a proxy |
| `integration/vehicles-create.test.ts`        | admin-only create, every validation rule, CSRF for cookie sessions, get by id/404/400                                                                                                                                |
| `integration/vehicles-catalogue.test.ts`     | listing, pagination, every filter and sort, blank params, invalid filters, SQL/LIKE-wildcard input treated literally                                                                                                 |
| `integration/vehicles-update-delete.test.ts` | full-replacement PUT, stock not editable, 404/400/401/403, delete keeps purchase history                                                                                                                             |
| `integration/inventory-purchase.test.ts`     | purchase rules, **20 concurrent buyers for 5 units**, competing multi-unit buys, idempotent replay (sequential and concurrent), key reuse 422, **rollback when a real DB trigger fails the audit insert**            |
| `integration/inventory-restock.test.ts`      | admin-only restock, validation, 10,000 ceiling, 10 concurrent restocks, stock summary                                                                                                                                |
| `integration/bootstrap.test.ts`              | repeatable seed, no users seeded, admin create/promote with validation                                                                                                                                               |
| `integration/database-failures.test.ts`      | generic 500 without leaking driver errors, cause logged                                                                                                                                                              |

### Frontend — Vitest + React Testing Library + MSW (real routes and providers)

| File                                      | Focus                                                                                                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `services/api-client.test.ts`             | credentials, CSRF header only on mutations, error envelope → `ApiError`, non-JSON and network failures                                                             |
| `pages/LoginPage.test.tsx`                | validation, redirect after sign-in (incl. the guard race regression), open-redirect protection, generic error                                                      |
| `pages/RegisterPage.test.tsx`             | password rules, 409 and server details on fields, welcome toast                                                                                                    |
| `app/access-control.test.tsx`             | admin link only for admins, `/admin` guard for anonymous and customers, sign-out, 404 page                                                                         |
| `pages/CataloguePage.test.tsx`            | cards, loading/empty/no-match/error states, search, filters, price-range validation, sort, pagination, URL restore                                                 |
| `components/purchase/purchase.test.tsx`   | Purchase disabled at zero stock, sign-in redirect, confirm dialog, quantity limits and totals, 409 handling, Idempotency-Key reuse on retry, modal focus behaviour |
| `pages/VehicleDetailPage.test.tsx`        | specifications, purchase updates stock, not found                                                                                                                  |
| `pages/admin/AdminInventoryPage.test.tsx` | summary stats, rows, restock (and its validation), delete with confirmation                                                                                        |
| `pages/admin/VehicleFormPage.test.tsx`    | add (validation, typed payload, server errors), edit without stock                                                                                                 |
| `app/session-expiry.test.tsx`             | 401 returns the UI to signed-out state; Tab focus trap                                                                                                             |

### End-to-end — Playwright, Chromium, real stack

Production build → Vite preview → `/api` proxy → Express → `car_dealership_e2e`
(schema rebuilt from migrations on every run). Assertions check PostgreSQL
directly where it matters.

| #   | Workflow from the brief                                         | Spec               |
| --- | --------------------------------------------------------------- | ------------------ |
| 1   | Register a normal user and log in                               | `auth.spec.ts`     |
| 2   | Browse the vehicle catalogue                                    | `shopping.spec.ts` |
| 3   | Search for a vehicle                                            | `shopping.spec.ts` |
| 4   | Purchase a vehicle when stock is available                      | `shopping.spec.ts` |
| 5   | Confirm stock decreases (UI, API and database)                  | `shopping.spec.ts` |
| 6   | Attempt to purchase when stock is zero (UI disabled, API 409)   | `shopping.spec.ts` |
| 7   | A normal user cannot access admin operations (page and API 403) | `admin.spec.ts`    |
| 8   | Admin logs in and adds a vehicle                                | `admin.spec.ts`    |
| 9   | Update and restock a vehicle                                    | `admin.spec.ts`    |
| 10  | Delete a vehicle                                                | `admin.spec.ts`    |

Plus: wrong credentials show the generic message.

## Reproducing

```bash
npm run db:start
```

```bash
npm run test:coverage
```

```bash
npm run test:e2e
```

HTML coverage: `backend/coverage/index.html`, `frontend/coverage/index.html`;
Playwright report: `npx playwright show-report`.

## Not yet verified

- `docker-compose.yml` has not been exercised (Docker is not installed on the
  development machine); the local cluster script was used instead.
