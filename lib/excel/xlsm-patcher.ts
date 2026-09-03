import JSZip from "jszip";
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import { createHash } from "crypto";
import { quarterlyWithMonthlyWagesTemplateMap } from "./template-map";
import type { QuarterGroup } from "@/lib/validation/types";

type WorkbookPatchInput = {
  template: ArrayBuffer | Uint8Array;
  quarters: QuarterGroup[];
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: false,
});

function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function cellRef(column: string, row: number) {
  return `${column}${row}`;
}

function setCell(sheet: Record<string, unknown>, ref: string, value: string | number | boolean | null) {
  const worksheet = sheet.worksheet as Record<string, unknown>;
  const sheetData = worksheet.sheetData as Record<string, unknown>;
  const rows = asArray(sheetData.row as Record<string, unknown>[]);
  const rowNumber = Number(ref.replace(/[A-Z]/g, ""));
  const row = rows.find((item) => Number(item["@_r"]) === rowNumber);
  if (!row) throw new Error(`Template row ${rowNumber} was not found.`);

  const cells = asArray(row.c as Record<string, unknown>[]);
  const cell = cells.find((item) => item["@_r"] === ref);
  if (!cell) throw new Error(`Template cell ${ref} was not found.`);

  delete cell.f;
  cell["@_t"] = typeof value === "boolean" ? "b" : "n";
  cell.v = value === null ? "" : value === true ? 1 : value === false ? 0 : value;
}

function forceFullCalculation(workbook: Record<string, unknown>) {
  const root = workbook.workbook as Record<string, unknown>;
  root.calcPr = {
    "@_calcMode": "auto",
    "@_fullCalcOnLoad": "1",
    "@_forceFullCalc": "1",
  };
}

export async function patchBasCalculator(input: WorkbookPatchInput) {
  const zip = await JSZip.loadAsync(input.template);
  const vba = await zip.file("xl/vbaProject.bin")?.async("uint8array");
  if (!vba) throw new Error("Template is missing xl/vbaProject.bin.");

  const originalVbaHash = sha256(vba);
  const workbookXml = await zip.file("xl/workbook.xml")?.async("string");
  const relsXml = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");
  if (!workbookXml || !relsXml) throw new Error("Template workbook metadata is incomplete.");

  const workbook = parser.parse(workbookXml);
  const rels = parser.parse(relsXml);
  const sheets = asArray(workbook.workbook.sheets.sheet as Record<string, string>[]);
  const targetSheet = sheets.find(
    (sheet) => sheet["@_name"] === quarterlyWithMonthlyWagesTemplateMap.sheetName,
  );
  if (!targetSheet) throw new Error(`Worksheet ${quarterlyWithMonthlyWagesTemplateMap.sheetName} was not found.`);

  const relationshipId = targetSheet["@_r:id"];
  const relationships = asArray(rels.Relationships.Relationship as Record<string, string>[]);
  const relationship = relationships.find((item) => item["@_Id"] === relationshipId);
  if (!relationship) throw new Error("Worksheet relationship was not found.");

  const target = relationship["@_Target"].replace(/^\/?xl\//, "");
  const sheetPath = `xl/${target}`;
  const worksheetXml = await zip.file(sheetPath)?.async("string");
  if (!worksheetXml) throw new Error(`Worksheet XML ${sheetPath} was not found.`);

  const worksheet = parser.parse(worksheetXml);
  const map = quarterlyWithMonthlyWagesTemplateMap;

  input.quarters.forEach((quarter, index) => {
    const column = map.quarterColumns[index];
    if (!column) return;

    const periodEnd = new Date(`${quarter.periodEnd}T00:00:00Z`);
    setCell(worksheet, cellRef(column, map.rows.year), periodEnd.getUTCFullYear());
    setCell(worksheet, cellRef(column, map.rows.quarterEndingMonth), quarter.quarterEndingMonth);
    setCell(worksheet, cellRef(column, map.rows.g1TotalSales), quarter.bas.g1TotalSales);
    setCell(worksheet, cellRef(column, map.rows.g1IncludesGst), quarter.bas.g1IncludesGst);
    setCell(worksheet, cellRef(column, map.rows.oneAGstOnSales), quarter.bas.oneAGstOnSales);
    setCell(worksheet, cellRef(column, map.rows.g11NonCapitalPurchases), quarter.bas.g11NonCapitalPurchases);
    setCell(worksheet, cellRef(column, map.rows.g10CapitalPurchases), quarter.bas.g10CapitalPurchases);
    setCell(worksheet, cellRef(column, map.rows.oneBGstOnPurchases), quarter.bas.oneBGstOnPurchases);
    setCell(worksheet, cellRef(column, map.rows.w1Month1), quarter.w1Months[0]?.value ?? null);
    setCell(worksheet, cellRef(column, map.rows.w1Month2), quarter.w1Months[1]?.value ?? null);
    setCell(worksheet, cellRef(column, map.rows.w1Month3), quarter.w1Months[2]?.value ?? null);
    setCell(worksheet, cellRef(column, map.rows.sixAFbt), quarter.bas.sixAFbt);
  });

  forceFullCalculation(workbook);
  zip.file("xl/workbook.xml", builder.build(workbook));
  zip.file(sheetPath, builder.build(worksheet));

  const output = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  const outputZip = await JSZip.loadAsync(output);
  const outputVba = await outputZip.file("xl/vbaProject.bin")?.async("uint8array");
  if (!outputVba || sha256(outputVba) !== originalVbaHash) {
    throw new Error("VBA project hash changed during XLSM generation.");
  }

  return {
    bytes: output,
    verification: {
      vbaProjectSha256: originalVbaHash,
      requiredEntriesPresent: [
        "xl/workbook.xml",
        "xl/_rels/workbook.xml.rels",
        "xl/vbaProject.bin",
        sheetPath,
      ].every((entry) => Boolean(outputZip.file(entry))),
    },
  };
}
