# Template Mapping

The initial macro-enabled calculator worksheet is:

```text
Quarterly with Monthly Wages
```

The versioned mapping lives in:

```text
lib/excel/template-map.ts
```

## Version 1

Quarter columns:

```ts
["C", "D", "E", "F"]
```

Rows:

```ts
{
  year: 6,
  quarterEndingMonth: 7,
  g1TotalSales: 10,
  g1IncludesGst: 12,
  oneAGstOnSales: 14,
  g11NonCapitalPurchases: 19,
  g10CapitalPurchases: 21,
  oneBGstOnPurchases: 23,
  w1Month1: 27,
  w1Month2: 29,
  w1Month3: 31,
  sixAFbt: 39
}
```

## XLSM Preservation Requirements

- Read the workbook as an OOXML ZIP package.
- Locate the worksheet from `xl/workbook.xml`.
- Follow the relationship in `xl/_rels/workbook.xml.rels`.
- Patch only configured input cells.
- Preserve all other entries where possible.
- Preserve `xl/vbaProject.bin`.
- Verify the VBA SHA-256 hash before and after generation.
- Force full recalculation when the workbook opens.
- Never overwrite the original template.

No real template file is currently present in this repository.
