"use client";

import { useMemo, useState } from "react";

type DocumentRecord = {
  fileName: string;
  sha256: string;
  byteSize: number;
  storagePath: string;
  status: "uploaded" | "registered";
};

async function sha256Hex(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function JobWorkspace() {
  const [jobId, setJobId] = useState("");
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [status, setStatus] = useState("No job created");
  const [error, setError] = useState("");
  const canStart = documents.length === 4 && Boolean(jobId);

  const bundleSummary = useMemo(() => {
    if (documents.length === 0) return "Upload four bundles covering the full 12-month period.";
    if (documents.length < 4) return `${4 - documents.length} bundle${4 - documents.length === 1 ? "" : "s"} still required.`;
    return "Four bundles uploaded. Ready to start extraction.";
  }, [documents.length]);

  async function createJob() {
    setError("");
    const response = await fetch("/api/jobs", { method: "POST" });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Could not create job.");
      return;
    }
    setJobId(body.job.id);
    setStatus(body.job.status);
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || !jobId) return;
    setError("");

    for (const file of Array.from(files).slice(0, 4 - documents.length)) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setError("Only PDF bundles can be uploaded.");
        continue;
      }

      const signedResponse = await fetch(`/api/jobs/${jobId}/uploads`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileName: file.name }),
      });
      const signedBody = await signedResponse.json();
      if (!signedResponse.ok) {
        setError(signedBody.error ?? "Could not prepare upload.");
        return;
      }

      const uploadResponse = await fetch(signedBody.upload.signedUrl, {
        method: "PUT",
        headers: { "content-type": "application/pdf" },
        body: file,
      });
      if (!uploadResponse.ok) {
        setError("Direct upload to private storage failed.");
        return;
      }

      const digest = await sha256Hex(file);
      const registerResponse = await fetch(`/api/jobs/${jobId}/uploads`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          storagePath: signedBody.upload.path,
          sha256: digest,
          byteSize: file.size,
        }),
      });
      const registerBody = await registerResponse.json();
      if (!registerResponse.ok) {
        setError(registerBody.error ?? "Could not register uploaded document.");
        return;
      }

      setDocuments((current) => [
        ...current,
        {
          fileName: file.name,
          sha256: digest,
          byteSize: file.size,
          storagePath: signedBody.upload.path,
          status: "registered",
        },
      ]);
    }
  }

  async function startProcessing() {
    setError("");
    const response = await fetch(`/api/jobs/${jobId}/start`, { method: "POST" });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Could not start processing.");
      return;
    }
    setStatus(body.status);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <section className="border border-[#d7d0c2] bg-white p-5">
        <h2 className="text-lg font-semibold">Processing job</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-[#657066]">Job ID</dt>
            <dd className="break-all font-mono text-xs">{jobId || "Not created"}</dd>
          </div>
          <div>
            <dt className="text-[#657066]">Status</dt>
            <dd className="font-semibold">{status}</dd>
          </div>
          <div>
            <dt className="text-[#657066]">Bundles</dt>
            <dd className="font-semibold">{documents.length} of 4</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => void createJob()}
          disabled={Boolean(jobId)}
          className="mt-5 w-full border border-[#17201b] bg-[#17201b] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#9b9b92]"
        >
          Create BAS processing job
        </button>
      </section>

      <section className="border border-[#d7d0c2] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Upload source PDFs</h2>
            <p className="mt-1 text-sm text-[#566158]">{bundleSummary}</p>
          </div>
          <label className="cursor-pointer border border-[#17201b] px-4 py-3 text-sm font-semibold">
            Choose PDFs
            <input
              className="hidden"
              type="file"
              accept="application/pdf,.pdf"
              multiple
              disabled={!jobId || documents.length >= 4}
              onChange={(event) => void uploadFiles(event.target.files)}
            />
          </label>
        </div>

        {error && (
          <div className="mt-4 border border-[#e7b7a3] bg-[#fff2eb] px-3 py-2 text-sm font-medium text-[#8a3a1f]">
            {error}
          </div>
        )}

        <div className="mt-5 divide-y divide-[#ece5d8] border border-[#ece5d8]">
          {documents.length === 0 ? (
            <div className="p-4 text-sm text-[#566158]">No PDFs uploaded yet.</div>
          ) : (
            documents.map((document) => (
              <div key={document.storagePath} className="grid gap-2 p-4 text-sm md:grid-cols-[1fr_140px]">
                <div>
                  <div className="font-semibold">{document.fileName}</div>
                  <div className="mt-1 break-all font-mono text-xs text-[#657066]">SHA-256 {document.sha256}</div>
                </div>
                <div className="text-left md:text-right">
                  <div>{Math.round(document.byteSize / 1024)} KB</div>
                  <div className="mt-1 font-semibold text-[#0f766e]">{document.status}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          type="button"
          onClick={() => void startProcessing()}
          disabled={!canStart}
          className="mt-5 border border-[#0f766e] bg-[#0f766e] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#9b9b92]"
        >
          Start extraction workflow
        </button>
      </section>
    </div>
  );
}
