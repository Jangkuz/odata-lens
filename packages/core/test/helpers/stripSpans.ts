/**
 * Strip source-provenance info from AST nodes for comparison.
 *
 * Spans, and the raw source text they point at, describe *where a query came from*,
 * not what it means. They necessarily differ once a query has been reprinted
 * (different offsets, different encoding, canonical spacing), so they must not
 * participate in semantic equality. They stay on the AST for the UI's benefit.
 */

const PROVENANCE_KEYS = new Set(['span', 'nameSpan', 'valueSpan', 'opSpan', 'rawValue', 'raw'])

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
      if (PROVENANCE_KEYS.has(key)) {
        continue
      }
      result[key] = stripSpans(obj[key])
    }
    return result
  }

  return obj
}

/**
 * Stable stringify: sorts object keys so comparison doesn't depend on
 * insertion order, which varies between parser code paths.
 */
function stableStringify(value: any): string {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return Object.keys(val)
        .sort()
        .reduce((acc: any, k) => {
          acc[k] = val[k]
          return acc
        }, {})
    }
    return val
  })
}

/**
 * Deep equality check that ignores spans and raw source text.
 */
export function astEqual(a: any, b: any): boolean {
  return stableStringify(stripSpans(a)) === stableStringify(stripSpans(b))
}
