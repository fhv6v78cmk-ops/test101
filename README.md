# BAS/PAYG Calculator Automation MVP

This is a Next.js App Router MVP for processing Australian BAS and monthly PAYG/IAS PDF bundles, validating extracted figures, and generating a completed macro-enabled BAS calculator.

## Current Implementation

- Supabase Auth magic-link sign-in.
- Organisation-scoped Supabase schema with RLS.
- Private storage bucket policies for:
  - `source-documents`
  - `calculator-templates`
  - `generated-calculators`
- Job creation.
- Signed direct browser upload flow for four PDF bundles.
- Browser-side SHA-256 hashing before document registration.
- Audit events for job creation, document registration, correction, and approval.
- Strict Zod extraction schema.
- OpenAI Responses API extraction adapter using `store: false`.
- Deterministic validation for BAS/IAS completeness, consistency, W1 grouping, and reconciliation.
- Versioned XLSM template mapping.
- OOXML ZIP patcher that updates mapped input cells and verifies VBA hash preservation.
- Architecture, security, and template mapping docs.

## Not Yet Operational Without Configuration

The app needs real external configuration before it can run end to end:

- Supabase project URL and anon key.
- Supabase service-role key.
- Supabase migrations applied.
- OpenAI API key.
- Vercel Workflow project wiring.
- A clean `.xlsm` BAS calculator template uploaded to private storage.
- Node.js/npm available locally to install dependencies and run checks.

No real PDFs or customer outputs should be committed.

## Environment

Create `.env.local` from `.env.example` and fill in real values:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_EXTRACTION_MODEL=gpt-5-mini
SOURCE_DOCUMENT_RETENTION_DAYS=90
GENERATED_OUTPUT_RETENTION_DAYS=30
```

## Local Development

Install Node.js 22.13 or later, then run:

```bash
npm install
npm run dev
```

After dependencies are installed, regenerate and commit the lockfile:

```bash
npm install
```

## Validation

Once Node/npm are available:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Supabase

Apply migrations from:

```text
supabase/migrations/
```

The RLS model assumes each authenticated user has an `organisation_users` row before using the app.

## Documentation

- `docs/architecture.md`
- `docs/security.md`
- `docs/template-mapping.md`
- `AGENTS.md`
