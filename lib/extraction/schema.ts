import { z } from "zod";

export const activityStatementSchema = z.object({
  documentType: z.enum(["BAS", "IAS"]),
  abn: z.string().min(1),
  entityName: z.string().min(1),
  periodStart: z.string().date().nullable(),
  periodEnd: z.string().date(),
  dateLodged: z.string().date().nullable(),
  g1TotalSales: z.number().nonnegative().nullable(),
  g1IncludesGst: z.boolean().nullable(),
  oneAGstOnSales: z.number().nonnegative().nullable(),
  oneBGstOnPurchases: z.number().nonnegative().nullable(),
  g10CapitalPurchases: z.number().nonnegative().nullable(),
  g11NonCapitalPurchases: z.number().nonnegative().nullable(),
  w1Wages: z.number().nonnegative().nullable(),
  w2TaxWithheld: z.number().nonnegative().nullable(),
  incomeTaxWithheldAmount: z.number().nonnegative().nullable(),
  sixAFbt: z.number().nonnegative().nullable(),
  paygInstalment: z.number().nonnegative().nullable(),
  amountOwing: z.number().nonnegative().nullable(),
  sourcePage: z.number().int().positive(),
  extractionWarnings: z.array(z.string()),
});

export const extractionResultSchema = z.object({
  statements: z.array(activityStatementSchema),
});

export type ActivityStatement = z.infer<typeof activityStatementSchema>;
export type ExtractionResult = z.infer<typeof extractionResultSchema>;
