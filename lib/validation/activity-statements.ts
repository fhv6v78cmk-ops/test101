import type { StatementWithSource, ValidationCheck, ValidationResult } from "./types";

const quarterEndingMonths = new Set([3, 6, 9, 12]);
const tolerance = 1;

function monthEnd(dateString: string) {
  return new Date(`${dateString}T00:00:00Z`).getUTCMonth() + 1;
}

function normaliseName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function statementKey(statement: StatementWithSource) {
  return `${statement.documentType}:${statement.periodEnd}`;
}

function addCheck(checks: ValidationCheck[], check: ValidationCheck) {
  checks.push(check);
}

function monthsBetweenInclusive(startEnd: string, endEnd: string) {
  const start = new Date(`${startEnd}T00:00:00Z`);
  const end = new Date(`${endEnd}T00:00:00Z`);
  return (
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    end.getUTCMonth() -
    start.getUTCMonth() +
    1
  );
}

export function validateActivityStatements(statements: StatementWithSource[]): ValidationResult {
  const checks: ValidationCheck[] = [];
  const bas = statements.filter((statement) => statement.documentType === "BAS");
  const ias = statements.filter((statement) => statement.documentType === "IAS");
  const periodCounts = new Map<string, number>();

  for (const statement of statements) {
    periodCounts.set(statementKey(statement), (periodCounts.get(statementKey(statement)) ?? 0) + 1);

    if (!statement.sourceDocumentId || statement.sourcePage < 1) {
      addCheck(checks, {
        code: "missing_source_reference",
        severity: "blocking",
        message: "Every extracted statement must reference a source document and page.",
        statementKey: statementKey(statement),
      });
    }

    for (const [field, value] of Object.entries(statement)) {
      if (typeof value === "number" && value < 0) {
        addCheck(checks, {
          code: "negative_value",
          severity: "blocking",
          message: `${field} must not be negative.`,
          statementKey: statementKey(statement),
        });
      }
    }
  }

  for (const [key, count] of periodCounts) {
    if (count > 1) {
      addCheck(checks, {
        code: "duplicate_period",
        severity: "blocking",
        message: `Duplicate reporting period found for ${key}.`,
      });
    }
  }

  if (bas.length !== 4) {
    addCheck(checks, {
      code: "bas_count",
      severity: "blocking",
      message: `Expected exactly four quarterly BAS statements, found ${bas.length}.`,
    });
  } else {
    addCheck(checks, {
      code: "bas_count",
      severity: "passed",
      message: "Exactly four quarterly BAS statements found.",
    });
  }

  const abns = new Set(statements.map((statement) => statement.abn.replace(/\s+/g, "")));
  if (abns.size > 1) {
    addCheck(checks, {
      code: "abn_consistency",
      severity: "blocking",
      message: "Statements contain more than one ABN.",
    });
  } else if (abns.size === 1) {
    addCheck(checks, {
      code: "abn_consistency",
      severity: "passed",
      message: "ABN is consistent across extracted statements.",
    });
  }

  const entityNames = new Set(statements.map((statement) => normaliseName(statement.entityName)));
  if (entityNames.size > 1) {
    addCheck(checks, {
      code: "entity_name_consistency",
      severity: "warning",
      message: "Entity names differ beyond punctuation or whitespace.",
    });
  }

  const sortedBas = [...bas].sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
  const quarters = sortedBas.map((statement) => {
    const quarterEndMonth = monthEnd(statement.periodEnd);
    const quarterYear = new Date(`${statement.periodEnd}T00:00:00Z`).getUTCFullYear();
    const month1 = new Date(Date.UTC(quarterYear, quarterEndMonth - 3, 1));
    const month2 = new Date(Date.UTC(quarterYear, quarterEndMonth - 2, 1));
    const iasMonth1 = ias.find((item) => monthEnd(item.periodEnd) === month1.getUTCMonth() + 1);
    const iasMonth2 = ias.find((item) => monthEnd(item.periodEnd) === month2.getUTCMonth() + 1);

    return {
      periodEnd: statement.periodEnd,
      quarterEndingMonth: quarterEndMonth,
      bas: statement,
      w1Months: [
        {
          monthEnd: iasMonth1?.periodEnd ?? "",
          value: iasMonth1?.w1Wages ?? null,
          sourceDocumentId: iasMonth1?.sourceDocumentId ?? "",
          sourcePage: iasMonth1?.sourcePage ?? 0,
          documentType: "IAS" as const,
        },
        {
          monthEnd: iasMonth2?.periodEnd ?? "",
          value: iasMonth2?.w1Wages ?? null,
          sourceDocumentId: iasMonth2?.sourceDocumentId ?? "",
          sourcePage: iasMonth2?.sourcePage ?? 0,
          documentType: "IAS" as const,
        },
        {
          monthEnd: statement.periodEnd,
          value: statement.w1Wages,
          sourceDocumentId: statement.sourceDocumentId,
          sourcePage: statement.sourcePage,
          documentType: "BAS" as const,
        },
      ],
    };
  });

  for (const statement of sortedBas) {
    const key = statementKey(statement);
    const endingMonth = monthEnd(statement.periodEnd);

    if (!quarterEndingMonths.has(endingMonth)) {
      addCheck(checks, {
        code: "invalid_quarter_end",
        severity: "blocking",
        message: `${statement.periodEnd} is not a valid quarter-ending month.`,
        statementKey: key,
      });
    }

    for (const field of ["g1TotalSales", "oneAGstOnSales", "oneBGstOnPurchases", "w1Wages"] as const) {
      if (statement[field] === null) {
        addCheck(checks, {
          code: "missing_required_bas_field",
          severity: "blocking",
          message: `${field} is required for each quarterly BAS.`,
          statementKey: key,
        });
      }
    }

    if (
      statement.oneAGstOnSales !== null &&
      statement.oneBGstOnPurchases !== null &&
      statement.w2TaxWithheld !== null &&
      statement.paygInstalment !== null &&
      statement.amountOwing !== null
    ) {
      const expected =
        statement.oneAGstOnSales -
        statement.oneBGstOnPurchases +
        statement.w2TaxWithheld +
        statement.paygInstalment;
      if (Math.abs(expected - statement.amountOwing) > tolerance) {
        addCheck(checks, {
          code: "bas_amount_reconciliation",
          severity: "warning",
          message: `Amount owing does not reconcile within $${tolerance}.`,
          statementKey: key,
        });
      }
    }
  }

  const w1MonthCount = quarters.flatMap((quarter) => quarter.w1Months).filter((month) => month.value !== null).length;
  if (w1MonthCount !== 12) {
    addCheck(checks, {
      code: "monthly_w1_count",
      severity: "blocking",
      message: `Expected twelve contiguous months of W1 figures, found ${w1MonthCount}.`,
    });
  }

  if (sortedBas.length === 4 && monthsBetweenInclusive(sortedBas[0].periodEnd, sortedBas[3].periodEnd) !== 10) {
    addCheck(checks, {
      code: "quarter_contiguity",
      severity: "blocking",
      message: "The four BAS quarter-ending periods are not contiguous.",
    });
  }

  for (const statement of ias) {
    if (statement.w2TaxWithheld !== null && statement.incomeTaxWithheldAmount !== null) {
      if (Math.abs(statement.w2TaxWithheld - statement.incomeTaxWithheldAmount) > tolerance) {
        addCheck(checks, {
          code: "ias_w2_reconciliation",
          severity: "warning",
          message: "IAS W2 does not match income tax withheld amount.",
          statementKey: statementKey(statement),
        });
      }
    }
  }

  const hasBlocking = checks.some((check) => check.severity === "blocking");
  const hasStatements = statements.length > 0;

  return {
    status: hasStatements ? (hasBlocking ? "review_required" : "ready_for_approval") : "failed",
    checks,
    quarters,
  };
}
