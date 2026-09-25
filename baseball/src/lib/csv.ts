// Small, dependency-free CSV builder (RFC 4180-ish quoting): a cell is
// wrapped in double quotes, with embedded quotes doubled, whenever it
// contains a comma, a quote, or a newline.

export function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvRow(cells: readonly unknown[]): string {
  return cells.map(csvCell).join(",");
}

export function buildCsv(rows: readonly (readonly unknown[])[]): string {
  return rows.map(csvRow).join("\r\n");
}

/** Triggers a browser download of `content` as a .csv file named `filename`. */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
