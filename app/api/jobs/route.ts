import { NextResponse } from "next/server";
import { createJob } from "@/lib/jobs/service";
import { requireUser } from "@/lib/supabase/auth";

export async function POST() {
  try {
    const { user, organisationId } = await requireUser();
    const job = await createJob({ organisationId, userId: user.id });
    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create job." },
      { status: 401 },
    );
  }
}
