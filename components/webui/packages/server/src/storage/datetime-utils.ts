/** Convert JS Date to MySQL-compatible DATETIME string (e.g., "2026-05-12 12:41:18.061") */
export function toMySQLDatetime(date: Date = new Date()): string {
  return date.toISOString().replace("T", " ").replace("Z", "");
}
