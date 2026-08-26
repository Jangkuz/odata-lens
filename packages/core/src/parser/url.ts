import { ODataUrl, ParseResult, Span } from '../ast'

/**
 * Parse an OData V4 query URL (or just the query string).
 * Never throws; returns partial AST + diagnostics.
 */
export function parse(input: string): ParseResult {
  // Stub implementation for Phase 1. Real implementation comes in Phase 2.
  return {
    ast: {
      kind: 'ODataUrl',
      serviceRoot: null,
      path: { kind: 'ResourcePath', span: { start: 0, end: 0 }, segments: [] },
      options: [],
      fragment: null,
      span: { start: 0, end: 0 },
    },
    diagnostics: [],
  }
}
