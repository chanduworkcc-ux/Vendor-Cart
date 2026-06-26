# XyloCart

A single-vendor e-commerce platform with an admin console, customer storefront, and mobile app — backed by Stripe for payments.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 3000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed-admin` — create default admin account (idempotent)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned by Replit)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 3000)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)
- Frontend: React 19, Vite 7, Tailwind CSS 4, Shadcn UI, TanStack Query
- Mobile: Expo 54, React Native 0.81
- Payments: Stripe (via Replit Stripe integration)
- Email: Brevo transactional API (OTP verification)

## Where things live

- `artifacts/api-server/src/` — Express API routes, auth, middleware
- `artifacts/admin-app/src/` — Admin dashboard (React + Vite, port 5174, base `/admin-app/`)
- `artifacts/user-app/src/` — Customer storefront (React + Vite, port 5173, base `/user-app/`)
- `artifacts/mobile/` — Expo mobile app
- `lib/db/src/schema/` — Source of truth for DB schema (Drizzle ORM)
- `lib/api-spec/openapi.yaml` — Source of truth for API contract
- `lib/api-client-react/` — Generated React Query hooks (run codegen to update)
- `scripts/src/seed-admin.ts` — Admin account seeder

## Architecture decisions

- **Spec-first API:** OpenAPI YAML → Orval codegen → typed React Query hooks + Zod schemas. Always update the spec before adding routes.
- **Base-path Vite apps:** Admin and User apps run under `/admin-app/` and `/user-app/` respectively. Public assets must use `import.meta.env.BASE_URL` prefix (not `/`).
- **Custom JWT auth:** 7-day tokens signed with `JWT_SECRET`. No external auth provider. Email verification via 6-digit OTP (Brevo).
- **Stripe via Replit integration:** Secret key fetched at runtime from Replit Connectors — not stored as a plain env var. Connect via the Integrations tab.
- **Zero-Demo Data Policy:** No fake seed data. Only the admin account seeder is permitted.

## Product

- **Admin Console** (`/admin-app/`): manage products, orders, users, payments, settings, activity logs
- **Customer Storefront** (`/user-app/`): browse products, place orders, manage profile, earn coins
- **Mobile App**: Expo-based companion app for customers

## Default Admin Credentials

- **Email:** `admin@xylocart.com`
- **Password:** `Admin@1234`
- ⚠️ Change after first login.

## Gotchas

- Run `pnpm --filter @workspace/db run push` before `seed-admin` on a fresh database.
- Stripe requires the Replit Stripe integration to be connected — not a raw `STRIPE_SECRET_KEY` env var.
- `JWT_SECRET` must be set in Replit Secrets before deploying; the server warns and uses an insecure default in dev.
- `BREVO_API_KEY` + `BREVO_FROM_EMAIL` are optional in dev — OTPs fall back to console logs.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
