/**
 * sanitize-csv.ts — RFC-4180 CSV Formula Neutralization Utility
 *
 * Prevents CSV / Dynamic Data Exchange (DDE) Injection attacks when exported CSVs
 * are opened in Microsoft Excel, LibreOffice Calc, or Google Sheets.
 *
 * Threat Vector:
 * Cells beginning with '=', '+', '-', '@', '\t', or '\r' can trigger formula
 * execution, external command execution, or data exfiltration.
 *
 * Remediation:
 * Prepends a single quote "'" to neutralize formula interpretation, escapes
 * internal double-quotes by doubling them ("""), and encapsulates the field in quotes.
 */

const FORMULA_TRIGGERS = new Set(["=", "+", "-", "@", "\t", "\r"])

export function sanitizeCsvField(val: unknown): string {
  if (val === null || val === undefined) {
    return '""'
  }

  let str = String(val)

  // Strip leading/trailing null bytes or unusual control characters if any
  str = str.replace(/\0/g, "")

  // Check if first character is a formula execution trigger
  if (str.length > 0 && FORMULA_TRIGGERS.has(str.charAt(0))) {
    str = `'${str}`
  }

  // RFC-4180: escape double quotes by doubling them
  const escaped = str.replace(/"/g, '""')

  return `"${escaped}"`
}

/**
 * Builds an RFC-4180 compliant CSV line from an array of fields.
 */
export function buildCsvRow(fields: unknown[]): string {
  return fields.map(sanitizeCsvField).join(",")
}
