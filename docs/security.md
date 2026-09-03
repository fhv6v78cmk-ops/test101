# Security

The application processes sensitive financial and identifying information.

## Data Handling

- Real customer PDFs and generated customer calculators must not be committed.
- Automated tests must use synthetic or redacted fixtures only.
- PDF bytes are uploaded directly from the browser to Supabase private Storage.
- Application routes issue signed upload URLs and record metadata only.
- Document contents and extracted customer values must not be written to logs.
- Audit logs store IDs, hashes, status changes, validation results, corrections and approvals.

## Secrets

Server-only:

- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- retention configuration

Browser-exposed:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

No other secret should use the `NEXT_PUBLIC_` prefix.

## Supabase

- Buckets are private: `source-documents`, `calculator-templates`, `generated-calculators`.
- Storage paths are prefixed with organisation ID.
- Row Level Security uses organisation membership to isolate records.
- Template changes require organisation admin role.

## OpenAI

- Extraction requests must use `store: false`.
- Model name is configurable with `OPENAI_EXTRACTION_MODEL`.
- The model output is validated with Zod and then checked deterministically.

## Retention

Retention settings are configurable:

- `SOURCE_DOCUMENT_RETENTION_DAYS`
- `GENERATED_OUTPUT_RETENTION_DAYS`

Deletion jobs should remove expired storage objects and write audit events.
