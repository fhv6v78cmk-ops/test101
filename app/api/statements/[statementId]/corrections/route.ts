import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/auth";

const correctionSchema = z.object({
  reviewedExtraction: z.record(z.string(), z.unknown()),
  reason: z.string().min(3),
});

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ statementId: string }> },
) {
  try {
    const { user, organisationId } = await requireUser();
    const { statementId } = await context.params;
    const body = correctionSchema.parse(await request.json());
    const supabase = createSupabaseServiceClient();

    const { data: statement, error: statementError } = await supabase
      .from("statements")
      .select("id,job_id,original_extraction")
      .eq("id", statementId)
      .eq("organisation_id", organisationId)
      .single();

    if (statementError) throw statementError;

    const { error } = await supabase
      .from("statements")
      .update({
        reviewed_extraction: body.reviewedExtraction,
        review_status: "corrected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", statementId)
      .eq("organisation_id", organisationId);

    if (error) throw error;

    await supabase.from("audit_events").insert({
      organisation_id: organisationId,
      job_id: statement.job_id,
      actor_id: user.id,
      event_type: "statement.corrected",
      target_table: "statements",
      target_id: statementId,
      metadata: {
        reason: body.reason,
        changedKeys: Object.keys(body.reviewedExtraction),
      },
    });

    return NextResponse.json({ statementId, status: "corrected" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save correction." },
      { status: 400 },
    );
  }
}
