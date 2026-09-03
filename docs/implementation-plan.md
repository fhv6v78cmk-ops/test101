# Implementation Plan

## Phase 1 - Foundation

Status: partially implemented.

- Next.js App Router project configured.
- Supabase browser and server clients added.
- Auth sign-in page added.
- Organisation-scoped migrations, RLS and private storage policies added.
- Job creation endpoint added.
- Direct signed PDF upload endpoint added.
- Basic job dashboard and job status page added.

Remaining:

- Apply Supabase migrations to a real project.
- Confirm organisation provisioning/onboarding flow.
- Wire Vercel Workflow trigger.
- Run lint, typecheck, tests and build once Node/npm are available.

## Phase 2 - Extraction

Status: service boundary implemented.

- Strict Zod schema added.
- OpenAI Responses API adapter added with `store: false`.
- Workflow module added for secure Supabase download, extraction, validation and persistence.

Remaining:

- Configure actual Vercel Workflow runtime.
- Test with synthetic searchable and scanned PDFs.
- Add retry/backoff policy around extraction failures.

## Phase 3 - Validation and Review

Status: core validation implemented.

- BAS count, ABN, entity name, duplicate period, required field, W1 coverage and reconciliation checks added.
- Correction endpoint preserves original extraction and writes audit events.
- Approval endpoint blocks when validation has blocking errors.

Remaining:

- Build full quarter-column review UI with editable corrected values and correction reasons.
- Add RLS integration tests for organisation isolation.

## Phase 4 - XLSM Generation

Status: service boundary implemented.

- Versioned template mapping added.
- OOXML ZIP patcher added.
- VBA hash verification added.
- Full recalculation flag added.

Remaining:

- Add the real `.xlsm` template.
- Add workbook fixture tests for formulas, drawings, controls and macro preservation.
- Upload generated output to private storage and create signed download URL.

## Phase 5 - Production Readiness

Status: not complete.

- Add synthetic fixtures.
- Add Playwright critical flow tests.
- Add retention/deletion workflow.
- Complete deployment documentation.
