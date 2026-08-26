/**
 * Strip Span info from AST nodes for comparison.
 * Used to compare ASTs when spans differ due to reparsing.
 */

export function stripSpans(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(stripSpans)
  }

  if (typeof obj === 'object') {
    const result: any = {}
    for (const key of Object.keys(obj)) {
      if (key === 'span') {
        // Skip span
        continue
      }
      result[key] = stripSpans(obj[key])
    }
    return result
  }

  return obj
}

/**
 * Deep equality check that ignores spans.
 */
export function astEqual(a: any, b: any): boolean {
  const aStripped = stripSpans(a)
  const bStripped = stripSpans(b)
  return JSON.stringify(aStripped, null, 2) === JSON.stringify(bStripped, null, 2)
}
