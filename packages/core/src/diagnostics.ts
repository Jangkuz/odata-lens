/**
 * Diagnostic codes and message templates for parsing and validation.
 */

export type DiagnosticCode =
  | 'E_UNBALANCED_PAREN'
  | 'E_UNBALANCED_BRACKET'
  | 'E_UNQUOTED_STRING'
  | 'E_INVALID_LITERAL'
  | 'E_INVALID_OPERATOR'
  | 'W_DOUBLE_ENCODED'
  | 'W_UNUSED_OPTION'
  | 'I_UNKNOWN_OPTION'

export const diagnosticMessages: Record<DiagnosticCode, string> = {
  E_UNBALANCED_PAREN: 'Unbalanced parenthesis',
  E_UNBALANCED_BRACKET: 'Unbalanced bracket',
  E_UNQUOTED_STRING: 'Unquoted string literal',
  E_INVALID_LITERAL: 'Invalid literal',
  E_INVALID_OPERATOR: 'Invalid operator',
  W_DOUBLE_ENCODED: 'Double-encoded percent sequence detected',
  W_UNUSED_OPTION: 'Unused or duplicate query option',
  I_UNKNOWN_OPTION: 'Unknown query option; will be preserved verbatim',
}
