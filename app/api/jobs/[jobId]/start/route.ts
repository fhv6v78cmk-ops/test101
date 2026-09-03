import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const { user, organisationId } = await requireUser();
    const { jobId } = await context.params;
    const supabase = createSupabaseServiceClient();

    const { error } = await supabase
      .from("jobs")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", jobId)
      .eq("organisation_id", organisationId);

    if (error) throw error;

    await supabase.from("audit_events").insert({
      organisation_id: organisationId,
      job_id: jobId,
      actor_id: user.id,
      event_type: "job.processing_requested",
      metadata: { workflow: "vercel_workflow_pending_configuration" },
    });

    return NextResponse.json({
      jobId,
      status: "processing",
      note: "Vercel Workflow trigger is stubbed until project credentials are configured.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start processing." },
      { status: 400 },
    );
  }
}
