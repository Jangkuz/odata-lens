/**
 * Percent-encoding for OData URLs.
 * Path and query string have different rules.
 */

/**
 * Encode a string for use in the resource path.
 * Encode: space, %, <, >, ", all control chars, some punctuation.
 * Don't encode: /, (), [], commas, quotes inside strings.
 */
export function encodePathComponent(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
}

/**
 * Encode a string for use in a query option value.
 * Similar to path but preserves some chars like = and &.
 */
export function encodeQueryValue(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
}

/**
 * Encode a property name (shouldn't need much encoding).
 */
export function encodePropertyName(str: string): string {
  // Property names are typically alphanumeric; light encoding
  return str.replace(/[^a-zA-Z0-9_$]/g, (ch) => '%' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'))
}

/**
 * Encode a string literal value (contents of single quotes).
 * In OData, single quotes inside strings are escaped by doubling: ' -> ''
 */
export function encodeStringLiteral(str: string): string {
  // Replace ' with ''
  return str.replace(/'/g, "''")
}

/**
 * Encode a complete filter/orderby/select expression.
 * These are already syntactically formatted; encode special chars.
 */
export function encodeExpressionValue(str: string): string {
  // Encode spaces and special chars, but preserve operators and structure
  return str
    .replace(/ /g, '%20')
    .replace(/'/g, '%27')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')
    .replace(/"/g, '%22')
}

/**
 * Escape a value to be safe as-is in a URL.
 * Used when we already have a raw value and want to preserve it.
 */
export function escapeForUrl(str: string): string {
  const encoded = encodeURIComponent(str)
  // Don't double-encode already-encoded sequences
  return encoded
}
