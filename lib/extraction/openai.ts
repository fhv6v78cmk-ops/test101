import "server-only";

import OpenAI from "openai";
import { extractionResultSchema, type ExtractionResult } from "./schema";

const extractionInstructions = `
Extract Australian BAS and IAS/PAYG activity statements from the supplied PDF.
Return one object for each BAS or IAS statement found.
Distinguish quarterly BAS from monthly IAS.
Return numeric values without currency symbols or commas.
Preserve the exact ABN.
Identify the reporting period, not lodgement or payment dates.
Use null for absent or unreadable fields.
Never invent a value to satisfy the schema.
Identify the source page for every statement.
`;

export async function extractActivityStatementsFromPdf(input: {
  fileName: string;
  pdfBase64: string;
}): Promise<ExtractionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_EXTRACTION_MODEL ?? "gpt-5-mini";

  const response = await client.responses.parse({
    model,
    store: false,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: extractionInstructions },
          {
            type: "input_file",
            filename: input.fileName,
            file_data: `data:application/pdf;base64,${input.pdfBase64}`,
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "activity_statement_extraction",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["statements"],
          properties: {
            statements: {
              type: "array",
              items: activityStatementJsonSchema,
            },
          },
        },
        strict: true,
      },
    },
  });

  return extractionResultSchema.parse(response.output_parsed);
}

const nullableNumber = { anyOf: [{ type: "number" }, { type: "null" }] };
const nullableString = { anyOf: [{ type: "string", format: "date" }, { type: "null" }] };
const nullableBoolean = { anyOf: [{ type: "boolean" }, { type: "null" }] };

const activityStatementJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "documentType",
    "abn",
    "entityName",
    "periodStart",
    "periodEnd",
    "dateLodged",
    "g1TotalSales",
    "g1IncludesGst",
    "oneAGstOnSales",
    "oneBGstOnPurchases",
    "g10CapitalPurchases",
    "g11NonCapitalPurchases",
    "w1Wages",
    "w2TaxWithheld",
    "incomeTaxWithheldAmount",
    "sixAFbt",
    "paygInstalment",
    "amountOwing",
    "sourcePage",
    "extractionWarnings",
  ],
  properties: {
    documentType: { enum: ["BAS", "IAS"] },
    abn: { type: "string" },
    entityName: { type: "string" },
    periodStart: nullableString,
    periodEnd: { type: "string", format: "date" },
    dateLodged: nullableString,
    g1TotalSales: nullableNumber,
    g1IncludesGst: nullableBoolean,
    oneAGstOnSales: nullableNumber,
    oneBGstOnPurchases: nullableNumber,
    g10CapitalPurchases: nullableNumber,
    g11NonCapitalPurchases: nullableNumber,
    w1Wages: nullableNumber,
    w2TaxWithheld: nullableNumber,
    incomeTaxWithheldAmount: nullableNumber,
    sixAFbt: nullableNumber,
    paygInstalment: nullableNumber,
    amountOwing: nullableNumber,
    sourcePage: { type: "integer", minimum: 1 },
    extractionWarnings: { type: "array", items: { type: "string" } },
  },
};
