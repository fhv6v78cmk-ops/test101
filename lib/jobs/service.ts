import { createHash, randomUUID } from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type CreateJobInput = {
  organisationId: string;
  userId: string;
  templateId?: string | null;
};

export type RegisterDocumentInput = {
  organisationId: string;
  jobId: string;
  userId: string;
  fileName: string;
  byteSize: number;
  sha256: string;
};

function safeSourceName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function organisationStoragePath(organisationId: string, jobId: string, fileName: string) {
  return `${organisationId}/${jobId}/${randomUUID()}-${safeSourceName(fileName)}`;
}

async function requireUploadJob(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  organisationId: string,
  jobId: string,
) {
  const { data, error } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", jobId)
    .eq("organisation_id", organisationId)
    .in("status", ["created", "uploading"])
    .maybeSingle();
  if (error || !data) throw new Error("This job is unavailable for uploads.");
}

export function sha256Hex(buffer: ArrayBuffer | Uint8Array) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return createHash("sha256").update(bytes).digest("hex");
}

export async function createJob(input: CreateJobInput) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      organisation_id: input.organisationId,
      created_by: input.userId,
      template_id: input.templateId ?? null,
      status: "created",
    })
    .select("id,status,created_at")
    .single();

  if (error) throw error;

  await supabase.from("audit_events").insert({
    organisation_id: input.organisationId,
    job_id: data.id,
    actor_id: input.userId,
    event_type: "job.created",
    metadata: {},
  });

  return data;
}

export async function createSignedSourceUpload(input: {
  organisationId: string;
  jobId: string;
  fileName: string;
}) {
  const supabase = createSupabaseServiceClient();
  await requireUploadJob(supabase, input.organisationId, input.jobId);
  const path = organisationStoragePath(input.organisationId, input.jobId, input.fileName);
  const { data, error } = await supabase.storage
    .from("source-documents")
    .createSignedUploadUrl(path);

  if (error) throw error;

  return { path, token: data.token, signedUrl: data.signedUrl };
}

export async function registerSourceDocument(input: RegisterDocumentInput & { storagePath: string }) {
  const [organisation, job, objectName, ...rest] = input.storagePath.split("/");
  if (
    organisation !== input.organisationId || job !== input.jobId || rest.length > 0 ||
    !objectName || !/^[a-zA-Z0-9._-]+$/.test(objectName) ||
    !objectName.endsWith(`-${safeSourceName(input.fileName)}`)
  ) {
    throw new Error("The upload does not belong to this job.");
  }

  const supabase = createSupabaseServiceClient();
  await requireUploadJob(supabase, input.organisationId, input.jobId);
  const { data: object, error: objectError } = await supabase.storage
    .from("source-documents")
    .info(input.storagePath);
  if (objectError || !object || object.size !== input.byteSize) {
    throw new Error("The uploaded file could not be verified in private storage.");
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      organisation_id: input.organisationId,
      job_id: input.jobId,
      kind: "source_pdf",
      file_name: input.fileName,
      storage_bucket: "source-documents",
      storage_path: input.storagePath,
      sha256: input.sha256,
      byte_size: input.byteSize,
      uploaded_by: input.userId,
    })
    .select("id,storage_path,sha256")
    .single();

  if (error) throw error;

  await supabase.from("audit_events").insert({
    organisation_id: input.organisationId,
    job_id: input.jobId,
    actor_id: input.userId,
    event_type: "document.registered",
    target_table: "documents",
    target_id: data.id,
    metadata: {
      sha256: input.sha256,
      byteSize: input.byteSize,
    },
  });

  return data;
}
