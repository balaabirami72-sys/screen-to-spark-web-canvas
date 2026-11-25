import { describe, expect, it } from "vitest";

import { getRoleNavigation } from "@/lib/snackflow";

describe("SnackFlow Phase 1 role menus", () => {
  it("gives admins every Phase 1 screen", () => {
    expect(getRoleNavigation(["admin"])).toEqual([
      "stock-summary",
      "stock-ledger",
      "items",
      "customers",
      "suppliers",
      "bom",
      "staff",
    ]);
  });

  it("gives production staff stock and BOM screens", () => {
    expect(getRoleNavigation(["production"])).toEqual([
      "stock-summary",
      "stock-ledger",
      "items",
      "bom",
    ]);
  });

  it("keeps accountants read-only on Phase 1 stock screens", () => {
    expect(getRoleNavigation(["accountant"])).toEqual(["stock-summary", "stock-ledger"]);
  });

  it("limits owners to the Phase 1 dashboard", () => {
    expect(getRoleNavigation(["owner"])).toEqual(["stock-summary"]);
  });

  it("does not expose later-phase order screens to salesmen yet", () => {
    expect(getRoleNavigation(["salesman"])).toEqual([]);
  });
});
