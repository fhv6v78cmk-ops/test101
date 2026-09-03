import { describe, expect, it } from "vitest";
import { validateActivityStatements } from "@/lib/validation/activity-statements";
import type { StatementWithSource } from "@/lib/validation/types";

const base = {
  abn: "12 345 678 901",
  entityName: "Example Pty Ltd",
  dateLodged: null,
  g1IncludesGst: true,
  g10CapitalPurchases: 0,
  g11NonCapitalPurchases: 1000,
  sixAFbt: 0,
  incomeTaxWithheldAmount: null,
  extractionWarnings: [],
  sourceDocumentId: "document-1",
  sourcePage: 1,
};

function bas(periodEnd: string, w1Wages = 1000): StatementWithSource {
  return {
    ...base,
    documentType: "BAS",
    periodStart: null,
    periodEnd,
    g1TotalSales: 10000,
    oneAGstOnSales: 1000,
    oneBGstOnPurchases: 200,
    w1Wages,
    w2TaxWithheld: 100,
    paygInstalment: 50,
    amountOwing: 950,
  };
}

function ias(periodEnd: string): StatementWithSource {
  return {
    ...base,
    documentType: "IAS",
    periodStart: null,
    periodEnd,
    g1TotalSales: null,
    g1IncludesGst: null,
    oneAGstOnSales: null,
    oneBGstOnPurchases: null,
    g10CapitalPurchases: null,
    g11NonCapitalPurchases: null,
    w1Wages: 1000,
    w2TaxWithheld: 100,
    incomeTaxWithheldAmount: 100,
    sixAFbt: null,
    paygInstalment: null,
    amountOwing: null,
  };
}

describe("validateActivityStatements", () => {
  it("marks a complete four-quarter dataset as ready for approval", () => {
    const result = validateActivityStatements([
      ias("2025-07-31"),
      ias("2025-08-31"),
      bas("2025-09-30"),
      ias("2025-10-31"),
      ias("2025-11-30"),
      bas("2025-12-31"),
      ias("2026-01-31"),
      ias("2026-02-28"),
      bas("2026-03-31"),
      ias("2026-04-30"),
      ias("2026-05-31"),
      bas("2026-06-30"),
    ]);

    expect(result.status).toBe("ready_for_approval");
    expect(result.quarters).toHaveLength(4);
    expect(result.checks.some((check) => check.severity === "blocking")).toBe(false);
  });

  it("blocks approval when required BAS fields are missing", () => {
    const incomplete = bas("2026-06-30");
    incomplete.g1TotalSales = null;

    const result = validateActivityStatements([incomplete]);

    expect(result.status).toBe("review_required");
    expect(result.checks).toContainEqual(
      expect.objectContaining({
        code: "missing_required_bas_field",
        severity: "blocking",
      }),
    );
  });
});
