# Vercel Deployment Runbook

## Project Settings

Create a Vercel project connected to the `YinzBreaks/Geodis2` repository.

Recommended settings:

- Framework preset: Next.js.
- Root directory: repository root.
- Build command: `npm run build`.
- Install command: `npm install`.
- Output directory: leave blank; Next.js manages it.
- Node.js version: 20.x or later.

The build command runs `prisma generate` and `next build --webpack`.

## Required Environment Variables

Add these variables in Vercel for Preview and Production as appropriate:

- `DATABASE_URL`
  - Supabase PostgreSQL connection string.
  - Use the pooled/runtime-safe connection string for the deployed application where required by the Supabase plan.
- `NEXT_PUBLIC_SUPABASE_URL`
  - Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Supabase public anonymous key.

Do not add `SUPABASE_SERVICE_ROLE_KEY` to client-exposed environments. It is only required for local/admin seed operations and must never be included in browser code.

## Database Migration Order

Vercel's build generates Prisma Client but does not apply database migrations automatically.

Before the first Production deployment:

1. Confirm the Supabase staging or production database backup exists.
2. Set `DATABASE_URL` locally or in a controlled deployment environment.
3. Run:

```powershell
npm run db:migrate:deploy
```

4. Confirm both production migrations are applied:
   - `20260816131500_unique_floor_ready_signoff`
   - `20260816132500_add_coaching_flags`
   - `20260816143000_unique_open_coaching_flag`
5. Verify signoff uniqueness and open CoachingFlag uniqueness.
6. Deploy the Vercel project.

Do not run database migrations from a browser request or from the Next.js build process.

## Preview Deployment Checklist

Before promoting Preview to Production:

1. `npm install` completes without audit findings in production dependencies.
2. `npm run lint` passes.
3. `npx tsc --noEmit` passes.
4. `npm test` passes.
5. `npm run build` passes.
6. `npm audit --omit=dev` reports zero vulnerabilities.
7. `npm run content:validate` passes after approved GEODIS content is added.
8. Authentication works with a staging Supabase project.
9. Supervisor, Pick Lead, Manager, and Trainee role redirects behave correctly.
10. Session persistence succeeds against staging PostgreSQL.
11. Supervisor signoff and CoachingFlag operations work.
12. CSV export downloads correctly for an authenticated Supervisor.
13. Tablet UAT passes on the approved pilot device.

## Vercel Environment Separation

Use separate Supabase projects or databases for:

- Local development.
- Preview/staging.
- Production.

Never point Preview at the Production database during normal development.

## Deployment Protection

Recommended Vercel settings:

- Protect Preview deployments with Vercel Authentication or an approved access policy.
- Keep Production deployments restricted to the deployment branch.
- Require review before Production promotion.
- Keep deployment logs and database migration logs available to the support team.

## Rollback

If an application deployment fails:

1. Roll back the Vercel deployment to the previous known-good build.
2. Do not automatically roll back database migrations.
3. Assess whether the migration is backward-compatible with the previous application build.
4. Restore the database only through the approved backup/restore procedure.
5. Record the incident, affected deployment, migration state, and recovery action.
