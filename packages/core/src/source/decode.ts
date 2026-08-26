import type { SourceMap } from './sourcemap'

/**
 * Percent-decode a string, producing a source map from decoded to raw coordinates.
 * Detects double-encoding: if decoded text still contains %XX sequences that decode further.
 */
export function percentDecode(raw: string): SourceMap & { doubleEncoded: boolean } {
  const decoded: string[] = []
  const map: number[] = []
  let doubleEncoded = false

  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '%' && i + 2 < raw.length) {
      const hex = raw.slice(i + 1, i + 3) ?? ''
      const codePoint = parseInt(hex, 16)
      if (!isNaN(codePoint)) {
        decoded.push(String.fromCharCode(codePoint))
        map.push(i)
        i += 2
        continue
      }
    }
    decoded.push(raw[i] ?? '')
    map.push(i)
  }

  const decodedStr = decoded.join('')
  // Check for double-encoding: if the decoded text still has % followed by two hex digits
  if (/%[0-9A-Fa-f]{2}/.test(decodedStr)) {
    doubleEncoded = true
  }

  return {
    decoded: decodedStr,
    map: new Int32Array(map),
    doubleEncoded,
  }
}
