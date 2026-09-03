import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function JobStatusPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("id,status,validation_summary,created_at,approved_at")
    .eq("id", jobId)
    .single();
  const { data: statements } = await supabase
    .from("statements")
    .select("id,source_page,original_extraction,reviewed_extraction,validation_results,review_status")
    .eq("job_id", jobId);

  return (
    <main className="min-h-screen bg-[#f6f4ef] px-5 py-8 text-[#17201b] lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#687168]">
          Job review
        </p>
        <h1 className="mt-4 text-3xl font-semibold">BAS processing job</h1>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="border border-[#d7d0c2] bg-white p-4">
            <div className="text-sm text-[#566158]">Job ID</div>
            <div className="mt-1 break-all font-mono text-xs">{job?.id ?? jobId}</div>
          </div>
          <div className="border border-[#d7d0c2] bg-white p-4">
            <div className="text-sm text-[#566158]">Status</div>
            <div className="mt-1 font-semibold">{job?.status ?? "Not found"}</div>
          </div>
          <div className="border border-[#d7d0c2] bg-white p-4">
            <div className="text-sm text-[#566158]">Statements</div>
            <div className="mt-1 font-semibold">{statements?.length ?? 0}</div>
          </div>
        </div>

        <section className="mt-6 border border-[#d7d0c2] bg-white">
          <div className="border-b border-[#d7d0c2] px-5 py-4">
            <h2 className="text-xl font-semibold">Extracted statements</h2>
          </div>
          <div className="divide-y divide-[#ece5d8]">
            {!statements?.length ? (
              <div className="p-5 text-sm text-[#566158]">
                No extracted statements have been saved yet.
              </div>
            ) : (
              statements.map((statement) => {
                const original = statement.original_extraction as Record<string, unknown>;
                return (
                  <div key={statement.id} className="grid gap-4 p-5 md:grid-cols-[1fr_180px]">
                    <div>
                      <div className="font-semibold">
                        {String(original.documentType)} | {String(original.periodEnd)}
                      </div>
                      <div className="mt-2 text-sm text-[#566158]">
                        {String(original.entityName)} | ABN {String(original.abn)}
                      </div>
                      <div className="mt-2 grid gap-2 text-sm sm:grid-cols-4">
                        <span>G1: {String(original.g1TotalSales ?? "missing")}</span>
                        <span>1A: {String(original.oneAGstOnSales ?? "missing")}</span>
                        <span>1B: {String(original.oneBGstOnPurchases ?? "missing")}</span>
                        <span>W1: {String(original.w1Wages ?? "missing")}</span>
                      </div>
                    </div>
                    <div className="text-sm md:text-right">
                      <div>Source page {statement.source_page}</div>
                      <div className="mt-1 font-semibold">{statement.review_status}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
