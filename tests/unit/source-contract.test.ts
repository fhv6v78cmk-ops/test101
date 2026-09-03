import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("source contract", () => {
  it("keeps the product shell and removes starter preview code", async () => {
    const [page, packageJson] = await Promise.all([
      readFile(new URL("../../app/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../../package.json", import.meta.url), "utf8"),
    ]);

    expect(page).toContain("Australian BAS automation MVP");
    expect(page).toContain("Extract BAS and PAYG wage figures");
    expect(packageJson).not.toContain("react-loading-skeleton");
  });
});
