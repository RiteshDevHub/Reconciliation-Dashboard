# ClearMatch

A reconciliation dashboard for Indian finance teams to review Zoho Books invoices, bank statements, received payments, and unmatched receipts.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/reconciliation-app/src/App.tsx` — dashboard routes, sample reconciliation data, and local interactions
- `artifacts/reconciliation-app/src/index.css` — visual tokens, typography, and responsive styling
- `lib/api-spec/openapi.yaml` — source of truth for future backend API contracts

## Architecture decisions

- The first build is frontend-only and uses sample reconciliation data so the product can be evaluated before authorizing Zoho Books access.
- All numbers use Indian currency formatting and the app's language is tailored to Indian finance operations.
- The supplied design analysis is adapted to reconciliation workflows rather than copied as crypto product UI.

## Product

- Public marketing homepage for signed-out visitors with product previews built from the dashboard UI
- Branded Google and email/password sign-in and sign-up through Clerk
- Authenticated users land directly in the protected dashboard workspace
- Signed-in users without a Zoho Books connection are routed through per-user Zoho OAuth onboarding
- Zoho India OAuth tokens are encrypted at rest and scoped to each Clerk user
- Invoices are imported from Zoho Books on connection and can be refreshed from the invoices screen
- Overview of receipts, matching rate, unresolved payments, and open invoices
- Reconciliation, invoices, and bank-statement views
- Interactive Zoho Books connection, statement import, date filtering, sync, and payment review demonstrations

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The Zoho OAuth client is registered in the India data center, so authorization and token requests use `accounts.zoho.in`.
- Register `/api/integrations/zoho/callback` for every development or production app origin in the Zoho API Console.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
