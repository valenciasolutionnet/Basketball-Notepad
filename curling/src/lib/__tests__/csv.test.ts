import { describe, expect, it } from "vitest";
import { buildCsv, csvCell, csvRow } from "../csv";

describe("csvCell", () => {
  it("leaves plain values alone", () => {
    expect(csvCell("Wildcats")).toBe("Wildcats");
    expect(csvCell(12)).toBe("12");
    expect(csvCell(0.333)).toBe("0.333");
  });
  it("treats null/undefined as an empty cell", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });
  it("quotes a value containing a comma", () => {
    expect(csvCell("Smith, Jr.")).toBe('"Smith, Jr."');
  });
  it("quotes and doubles embedded quotes", () => {
    expect(csvCell('6"2" catcher')).toBe('"6""2"" catcher"');
  });
  it("quotes a value containing a newline", () => {
    expect(csvCell("line one\nline two")).toBe('"line one\nline two"');
    expect(csvCell("line one\r\nline two")).toBe('"line one\r\nline two"');
  });
  it("quotes a value with commas, quotes, and newlines together", () => {
    expect(csvCell('a, "b"\nc')).toBe('"a, ""b""\nc"');
  });
});

describe("csvRow / buildCsv", () => {
  it("joins cells with commas and rows with CRLF", () => {
    const csv = buildCsv([
      ["Date", "Opponent", "Result", "Score"],
      ["2026-04-01", "Riverside, JV", "W", "5-2"],
    ]);
    expect(csv).toBe('Date,Opponent,Result,Score\r\n2026-04-01,"Riverside, JV",W,5-2');
  });
  it("csvRow matches the first line of buildCsv for a single row", () => {
    const row = ["a", 'b"c', "d,e"];
    expect(csvRow(row)).toBe(buildCsv([row]));
  });
});
