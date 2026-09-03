import type { ActivityStatement } from "@/lib/extraction/schema";

export type ValidationSeverity = "blocking" | "warning" | "passed";

export type ValidationCheck = {
  code: string;
  severity: ValidationSeverity;
  message: string;
  statementKey?: string;
};

export type StatementWithSource = ActivityStatement & {
  sourceDocumentId: string;
};

export type QuarterGroup = {
  periodEnd: string;
  quarterEndingMonth: number;
  bas: StatementWithSource;
  w1Months: Array<{
    monthEnd: string;
    value: number | null;
    sourceDocumentId: string;
    sourcePage: number;
    documentType: "BAS" | "IAS";
  }>;
};

export type ValidationResult = {
  status: "review_required" | "ready_for_approval" | "failed";
  checks: ValidationCheck[];
  quarters: QuarterGroup[];
};
