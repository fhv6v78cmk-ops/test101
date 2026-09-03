import "server-only";

import { extractActivityStatementsFromPdf } from "@/lib/extraction/openai";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { validateActivityStatements } from "@/lib/validation/activity-statements";
import type { StatementWithSource } from "@/lib/validation/types";

export async function processBasJob(jobId: string) {
  const supabase = createSupabaseServiceClient();
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id,organisation_id,status")
    .eq("id", jobId)
    .single();

  if (jobError) throw jobError;
  if (!job) throw new Error("Job not found.");
  if (job.status === "completed" || job.status === "approved") return;

  const { data: documents, error: documentsError } = await supabase
    .from("documents")
    .select("id,file_name,storage_bucket,storage_path")
    .eq("job_id", jobId)
    .eq("organisation_id", job.organisation_id);

  if (documentsError) throw documentsError;

  const statements: StatementWithSource[] = [];

  for (const document of documents ?? []) {
    const { data: bytes, error: downloadError } = await supabase.storage
      .from(document.storage_bucket)
      .download(document.storage_path);
    if (downloadError) throw downloadError;

    const arrayBuffer = await bytes.arrayBuffer();
    const pdfBase64 = Buffer.from(arrayBuffer).toString("base64");
    const extraction = await extractActivityStatementsFromPdf({
      fileName: document.file_name,
      pdfBase64,
    });

    for (const statement of extraction.statements) {
      statements.push({
        ...statement,
        sourceDocumentId: document.id,
      });
    }
  }

  const validation = validateActivityStatements(statements);

  for (const statement of statements) {
    await supabase.from("statements").upsert(
      {
        organisation_id: job.organisation_id,
        job_id: jobId,
        source_document_id: statement.sourceDocumentId,
        source_page: statement.sourcePage,
        original_extraction: statement,
        validation_results: validation.checks.filter((check) =>
          check.statementKey?.endsWith(statement.periodEnd),
        ),
        review_status: validation.status === "ready_for_approval" ? "accepted" : "pending",
      },
      { onConflict: "job_id,source_document_id,source_page" },
    );
  }

  const { error: updateError } = await supabase
    .from("jobs")
    .update({
      status: validation.status,
      validation_summary: validation,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (updateError) throw updateError;
}
