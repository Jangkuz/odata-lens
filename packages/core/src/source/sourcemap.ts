/**
 * Source mapping from decoded coordinates back to raw input coordinates.
 * Used to track AST spans in the original raw input, accounting for percent-decoding.
 */

export interface SourceMap {
  decoded: string
  /** map[i] = raw offset of decoded character i */
  map: Int32Array
}

/**
 * Lift an AST span from decoded coordinates to raw coordinates using a source map.
 */
export function liftSpan(
  decodedStart: number,
  decodedEnd: number,
  sourceMap: SourceMap,
): { start: number; end: number } {
  const rawStart = decodedStart >= 0 ? sourceMap.map[decodedStart] ?? 0 : 0
  const rawEnd = decodedEnd <= sourceMap.map.length ? sourceMap.map[decodedEnd - 1] ?? 0 : rawStart
  return { start: rawStart, end: rawEnd > rawStart ? rawEnd + 1 : rawStart }
}
