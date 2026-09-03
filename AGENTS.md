# Codex Operating Notes

This project handles sensitive Australian BAS, IAS/PAYG, financial and identifying information.

## Critical Security Rules

- Never commit real customer PDFs, extracted customer data or completed customer calculators.
- Keep private fixtures under ignored private fixture paths only.
- Browser uploads must go directly to Supabase private Storage.
- Do not proxy PDF bytes through a standard app upload route.
- Keep `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` server-side only.
- Do not log document text, extracted customer values or PDF contents.
- Audit IDs, hashes, status transitions, validation outcomes, corrections and approvals.
- Use short-lived signed URLs for downloads.
- Use `store: false` for all OpenAI extraction requests.

## Extraction Rules

- Return one statement object per BAS or IAS found.
- Preserve the exact ABN.
- Identify the reporting period, not lodgement or payment date.
- Return numeric values as numbers without currency formatting.
- Return `null` for absent or unreadable values.
- Never invent values.
- Every statement must have a valid source document and source page.

## Validation Rules

Deterministic validation is authoritative. Do not rely on model confidence.

- Require exactly four quarterly BAS statements.
- Require twelve contiguous W1 months.
- Treat monthly IAS W1 as months one and two of each quarter.
- Treat quarterly BAS W1 as month three.
- Require matching ABN and consistent entity name.
- Reject duplicate reporting periods.
- Require G1, 1A, 1B and W1 for each BAS.
- Financial values must be non-negative.
- Check BAS amount owing where sufficient fields exist: `1A - 1B + W2 + PAYG instalment`.
- Check IAS W2 equals income tax withheld amount where both exist.

## XLSM Rules

- Never rebuild the workbook with a spreadsheet writer.
- Treat `.xlsm` files as OOXML ZIP packages.
- Preserve `xl/vbaProject.bin` exactly.
- Update only mapped input cells.
- Keep template mappings versioned in `lib/excel/template-map.ts`.
- Force full recalculation on open.
- Never overwrite the original template.
