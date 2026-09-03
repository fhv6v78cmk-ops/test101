import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/auth";

export async function POST(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const { user, organisationId } = await requireUser();
    const { jobId } = await context.params;
    const supabase = createSupabaseServiceClient();

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id,status,validation_summary")
      .eq("id", jobId)
      .eq("organisation_id", organisationId)
      .single();

    if (jobError) throw jobError;

    const validationSummary = job.validation_summary as
      | { checks?: Array<{ severity?: string }> }
      | null;
    const hasBlocking = validationSummary?.checks?.some(
      (check) => check.severity === "blocking",
    );

    if (hasBlocking) {
      return NextResponse.json(
        { error: "Blocking validation errors must be resolved before approval." },
        { status: 409 },
      );
    }

    const approvedAt = new Date().toISOString();
    const { error } = await supabase
      .from("jobs")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_at: approvedAt,
        updated_at: approvedAt,
      })
      .eq("id", jobId)
      .eq("organisation_id", organisationId);

    if (error) throw error;

    await supabase.from("audit_events").insert({
      organisation_id: organisationId,
      job_id: jobId,
      actor_id: user.id,
      event_type: "job.approved",
      metadata: { approvedAt },
    });

    return NextResponse.json({ jobId, status: "approved", approvedAt });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not approve job." },
      { status: 400 },
    );
  }
}
