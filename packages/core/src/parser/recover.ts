/**
 * Error recovery utilities for OData parsing.
 * Helps parsers emit Unknown* nodes instead of throwing.
 */

import { Diagnostic, Span } from '../ast'
import type { DiagnosticCode } from '../diagnostics'

/**
 * Skip to next safe boundary: &, comma, closing paren/bracket, semicolon.
 * Returns the skipped text.
 */
export function skipToSafeBoundary(input: string, startPos: number, boundaries: string[] = ['&', ',', ')', ']', ';']): { endPos: number; skipped: string } {
  let pos = startPos
  let depth = 0
  let inString = false

  while (pos < input.length) {
    const ch = input[pos]

    if (inString) {
      if (ch === "'") {
        if (input[pos + 1] === "'") {
          pos += 2 // escaped quote
        } else {
          inString = false
          pos++
        }
      } else if (ch === '"') {
        if (input[pos + 1] === '"') {
          pos += 2 // escaped quote
        } else {
          inString = false
          pos++
        }
      } else {
        pos++
      }
    } else {
      if (ch === "'" || ch === '"') {
        inString = true
        pos++
      } else if (ch === '(' || ch === '[') {
        depth++
        pos++
      } else if (ch === ')' || ch === ']') {
        if (depth === 0) break
        depth--
        pos++
      } else if (boundaries.includes(ch) && depth === 0) {
        break
      } else {
        pos++
      }
    }
  }

  return {
    endPos: pos,
    skipped: input.slice(startPos, pos).trim(),
  }
}

/**
 * Create a diagnostic for a parse error.
 */
export function createDiagnostic(
  code: DiagnosticCode,
  message: string,
  span: Span,
  severity: 'error' | 'warning' | 'info' = 'error',
  hint?: string,
): Diagnostic {
  return {
    code,
    message,
    span,
    severity,
    hint,
  }
}

/**
 * Detect common mistakes in OData expressions.
 */
export function diagnoseCommonMistakes(input: string, span: Span): Diagnostic[] {
  const diagnostics: Diagnostic[] = []

  // Check for '=' instead of 'eq'
  if (/\s=\s/.test(input) && !input.includes('==')) {
    diagnostics.push(
      createDiagnostic('E_INVALID_OPERATOR', "Use 'eq' instead of '=' for comparison", span, 'error', "Change '=' to 'eq'"),
    )
  }

  // Check for unquoted strings (heuristic: identifier without operator before it)
  const unquotedMatch = input.match(/\b(and|or|eq|ne|lt|le|gt|ge)\s+([a-z_][a-z0-9_]*)\b/i)
  if (unquotedMatch && !input.includes("'")) {
    // Could be an unquoted string, but not always
  }

  // Check for unbalanced parentheses
  let parenDepth = 0
  let inString = false
  for (let i = 0; i < input.length; i++) {
    if (inString) {
      if (input[i] === "'") {
        if (input[i + 1] === "'") {
          i++ // skip escaped quote
        } else {
          inString = false
        }
      }
    } else {
      if (input[i] === "'") {
        inString = true
      } else if (input[i] === '(') {
        parenDepth++
      } else if (input[i] === ')') {
        parenDepth--
      }
    }
  }

  if (parenDepth > 0) {
    diagnostics.push(createDiagnostic('E_UNBALANCED_PAREN', `Unmatched opening parenthesis`, span, 'error'))
  } else if (parenDepth < 0) {
    diagnostics.push(createDiagnostic('E_UNBALANCED_PAREN', `Unmatched closing parenthesis`, span, 'error'))
  }

  return diagnostics
}

/**
 * Detect double encoding (% sequences in decoded text).
 */
export function detectDoubleEncoding(decoded: string, rawSpan: Span): Diagnostic | null {
  if (/%[0-9A-Fa-f]{2}/.test(decoded)) {
    return createDiagnostic(
      'W_DOUBLE_ENCODED',
      'Double-encoded percent sequence detected (URL was encoded twice)',
      rawSpan,
      'warning',
      'Percent-decode only once before parsing',
    )
  }
  return null
}
