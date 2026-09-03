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
 * Use encodeURIComponent as the safe base (escapes &, #, %, space, etc.),
 * then unescape OData delimiters that must stay literal.
 * Preserve single quotes (they delimit OData string literals) and all OData syntax chars.
 */
export function encodeQueryValue(str: string): string {
  return encodeURIComponent(str)
    // Unescape OData syntax delimiters that must stay literal
    .replace(/%2C/g, ',')  // comma: list/multi-value separator
    .replace(/%2F/g, '/')  // slash: navigation/path separator
    .replace(/%28/g, '(')  // left paren: options/args
    .replace(/%29/g, ')')  // right paren: options/args
    .replace(/%3A/g, ':')  // colon: namespace/enum separator
    .replace(/%24/g, '$')  // dollar: option/system query prefix
    .replace(/%3D/g, '=')  // equals: key/option assignment
    .replace(/%40/g, '@')  // at-sign: parameter alias
    .replace(/%27/g, "'")  // single quote: string literal delimiter (must stay literal per OData spec)
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
