import { ODataUrl } from '../ast'

export interface AstDiff {
  added: any[]
  removed: any[]
  changed: any[]
}

/**
 * Structural diff between two OData ASTs (order-insensitive for options).
 */
export function diffAst(ast1: ODataUrl, ast2: ODataUrl): AstDiff {
  // Stub for Phase 1. Real implementation in Phase 8.
  return {
    added: [],
    removed: [],
    changed: [],
  }
}
