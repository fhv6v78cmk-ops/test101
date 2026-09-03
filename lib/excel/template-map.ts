export const quarterlyWithMonthlyWagesTemplateMap = {
  id: "quarterly-with-monthly-wages-v1",
  sheetName: "Quarterly with Monthly Wages",
  quarterColumns: ["C", "D", "E", "F"],
  rows: {
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
    sixAFbt: 39,
  },
} as const;

export type TemplateMap = typeof quarterlyWithMonthlyWagesTemplateMap;
