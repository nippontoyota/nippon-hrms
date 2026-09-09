# Maintenance Production Checklist

## Required environment

Configure these values in the deployment platform and in the non-production environment. Never commit their values:

- `DATABASE_URL`: Prisma runtime connection string, normally the Supabase pooler URL.
- `DIRECT_URL`: direct PostgreSQL connection string used by Prisma tooling and migrations.
- `MAINTENANCE_SESSION_SECRET`: long random secret used to sign maintenance sessions and branch login keys.
- `MAINTENANCE_CODE_SECRET`: long random secret used to encrypt branch-code recovery values.

`DATABASE_URL` and `DIRECT_URL` must both be present. The application can generate Prisma client code without them, but schema validation and runtime database operations cannot.

## Pre-deploy checks

Run from the repository root:

```text
npm.cmd test --prefix apps\maintenance
npm.cmd run lint --prefix apps\maintenance
npm.cmd run typecheck --prefix apps\maintenance
npm.cmd run build --prefix apps\maintenance
go test ./internal/maintenance
go test ./internal/whatsapp -run Maintenance -count=1
go build ./...
```

Run from `apps/maintenance` with safe environment values:

```text
npx.cmd prisma validate --schema prisma\schema.prisma
npx.cmd prisma generate --schema prisma\schema.prisma
```

Apply the API/Supabase maintenance migrations in timestamp/order sequence before using new branch, transfer, or media fields. Confirm the deployed Prisma client matches the checked-in schema.

## Read-only post-deploy smoke

Against the deployed maintenance URL:

1. Open `/branch/login` and `/admin/login`; both must return the login UI over HTTPS.
2. Open `/tickets` without a session; it must redirect to `/login` and then the branch login page.
3. Sign in with an approved non-production or production test account; the queue and branch scope must match the account.
4. Open `/tickets`, `/transfers`, and `/admin/branches` according to the account role.
5. Confirm `/nippon-logo.png` and at least one generated static asset return successfully.
6. Check browser console and server logs for errors.

Do not submit ticket, assignment, cost, close/reopen, transfer, branch-account, or code-rotation mutations against production. Exercise those paths only against an isolated database.

## Local standalone smoke

The maintenance package starts the built standalone server with `npm.cmd run start`. The wrapper loads the app/workspace environment, copies `public` and `.next/static` into the standalone directory, and starts `.next/standalone/server.js`. Docker deployments copy these assets in the image and continue to start `server.js` directly.
