import { JobWorkspace } from "@/components/job-workspace";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#17201b]">
      <section className="border-b border-[#d8d2c5] bg-[#fdfbf6]">
        <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#687168]">
            Australian BAS automation MVP
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight tracking-normal md:text-5xl">
            Extract BAS and PAYG wage figures, validate them, then generate the calculator.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-[#4c574f]">
            Create a processing job, upload four private PDF bundles covering a 12-month period, and move the job into asynchronous extraction. The MVP keeps source files in private Supabase Storage and records hashes, statuses, corrections, approvals, and generated outputs for audit.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        <JobWorkspace />
      </section>
    </main>
  );
}
