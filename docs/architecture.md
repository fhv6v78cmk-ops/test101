# Architecture

The MVP is a single Next.js App Router TypeScript application.

## Flow

1. User signs in with Supabase Auth.
2. User creates a BAS processing job.
3. Browser asks the app for signed Supabase Storage upload URLs.
4. Browser uploads four PDF bundles directly to the private `source-documents` bucket.
5. Browser computes SHA-256 hashes and registers document metadata.
6. The app marks the job as `processing` and hands off to the Vercel Workflow.
7. The workflow downloads source PDFs server-side from Supabase Storage.
8. Each PDF is sent to the OpenAI Responses API with `store: false`.
9. Zod validates the extraction payload.
10. Deterministic validation groups statements and sets review status.
11. User reviews and corrects values without overwriting original extraction.
12. Approved values are written into a clean `.xlsm` template.
13. The generated calculator is verified, uploaded to private storage, and exposed through a short-lived signed URL.

## Main Directories

- `app/`: routes, pages and server endpoints.
- `components/`: reusable React components.
- `lib/extraction/`: OpenAI extraction schemas and adapters.
- `lib/validation/`: deterministic BAS/PAYG validation.
- `lib/excel/`: XLSM OOXML patching and versioned template maps.
- `lib/supabase/`: browser/server Supabase clients and auth helpers.
- `workflows/`: background processing entrypoints.
- `supabase/migrations/`: database, RLS and storage policies.
- `docs/`: operating documentation.

## External Services

Credentials are required before the service can run end to end:

- Supabase project URL and anon key.
- Supabase service-role key for server-side storage/database operations.
- OpenAI API key.
- Vercel project with Workflow configuration.
- A clean macro-enabled BAS calculator template.
