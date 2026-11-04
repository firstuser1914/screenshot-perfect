import { describe, it, expect } from "vitest";
import { parseCitationId } from "./api";

describe("parseCitationId", () => {
  it("extracts act and section from a section ID", () => {
    expect(parseCitationId("BNS-2023-ff92dcc72778-S303")).toEqual({ act: "BNS", section: "303" });
  });
  it("extracts section from a table-row ID", () => {
    expect(parseCitationId("BNSS-2023-8047fe1de609-S359-SS1-T1-R001")).toEqual({ act: "BNSS", section: "359" });
  });
  it("does not treat a schedule ID as a section", () => {
    expect(parseCitationId("BNSS-2023-8047fe1de609-SCH1")).toBeNull();
  });
});
