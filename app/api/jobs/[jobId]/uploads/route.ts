import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSignedSourceUpload, registerSourceDocument } from "@/lib/jobs/service";
import { requireUser } from "@/lib/supabase/auth";

const signedUploadRequestSchema = z.object({
  fileName: z.string().min(1),
});

const registerUploadRequestSchema = z.object({
  fileName: z.string().min(1),
  storagePath: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  byteSize: z.number().int().positive(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const { user, organisationId } = await requireUser();
    const { jobId } = await context.params;
    const body = signedUploadRequestSchema.parse(await request.json());
    const upload = await createSignedSourceUpload({
      organisationId,
      jobId,
      fileName: body.fileName,
    });

    return NextResponse.json({ upload, userId: user.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create signed upload URL." },
      { status: 400 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const { user, organisationId } = await requireUser();
    const { jobId } = await context.params;
    const body = registerUploadRequestSchema.parse(await request.json());
    const document = await registerSourceDocument({
      organisationId,
      jobId,
      userId: user.id,
      fileName: body.fileName,
      storagePath: body.storagePath,
      sha256: body.sha256,
      byteSize: body.byteSize,
    });

    return NextResponse.json({ document });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not register uploaded document." },
      { status: 400 },
    );
  }
}
