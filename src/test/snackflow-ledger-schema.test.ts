import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const phaseOneMigration = readFileSync(
  resolve(process.cwd(), "drizzle/migrations/0000_snackflow_phase_one_core.sql"),
  "utf8",
);

describe("SnackFlow Phase 1 ledger and seed rules", () => {
  it("derives each balance from signed stock movements", () => {
    expect(phaseOneMigration).toContain("COALESCE(SUM(sm.quantity), 0)::numeric(20, 4) AS balance");
    expect(phaseOneMigration).toContain("LEFT JOIN public.stock_movements sm ON sm.item_id = i.id");
  });

  it("seeds the requested opening stock and material rates", () => {
    const openingRows = [
      "('Flour', 100::numeric, 42::numeric)",
      "('Cooking oil', 30::numeric, 140::numeric)",
      "('Salt & spice mix', 5::numeric, 200::numeric)",
      "('200 g pouch', 500::numeric, 2.50::numeric)",
      "('Carton holding 20 packets', 30::numeric, 15::numeric)",
      "('Murukku 200 g', 50::numeric, 0::numeric)",
    ];

    for (const row of openingRows) expect(phaseOneMigration).toContain(row);
  });

  it("keeps the supplied Murukku, tax, BOM and factory defaults", () => {
    expect(phaseOneMigration).toContain("('Murukku 200 g', 'finished', 'packet', '1905', 5)");
    expect(phaseOneMigration).toContain("SELECT pl.id, i.id, 50");
    expect(phaseOneMigration).toContain("VALUES (true, 3, '33')");
    expect(phaseOneMigration).toContain("('Flour', 40::numeric, 'kg')");
    expect(phaseOneMigration).toContain("('Cooking oil', 10::numeric, 'L')");
    expect(phaseOneMigration).toContain("('Salt & spice mix', 1.2::numeric, 'kg')");
    expect(phaseOneMigration).toContain("('200 g pouch', 200::numeric, 'piece')");
    expect(phaseOneMigration).toContain("('Carton holding 20 packets', 10::numeric, 'piece')");
  });
});
