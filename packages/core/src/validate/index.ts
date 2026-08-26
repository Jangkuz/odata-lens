import { ODataUrl, Diagnostic, EdmModel } from '../ast'

/**
 * Syntactic validation (metadata-independent rules).
 */
export function validateSyntactic(ast: ODataUrl): Diagnostic[] {
  // Stub for Phase 1. Real implementation in Phase 7.
  return []
}

/**
 * Semantic validation (requires metadata).
 */
export function validateSemantic(ast: ODataUrl, model: EdmModel): Diagnostic[] {
  // Stub for Phase 1. Real implementation in Phase 7.
  return []
}
