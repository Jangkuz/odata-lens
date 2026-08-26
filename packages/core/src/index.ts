/**
 * OData Lens Core — parser, printer, explainer, and validator.
 * Zero external dependencies. Pure functions. Publishable as an npm package.
 */

// AST node types and type guards
export * from './ast'

// Diagnostics
export type { DiagnosticCode } from './diagnostics'
export { diagnosticMessages } from './diagnostics'

// Main entry points
export { parse } from './parser/url'
export { printCompact, printExpanded } from './printer'
export { explain, summarizeQuery } from './explain'
export { validateSyntactic, validateSemantic } from './validate'
export { diffAst } from './diff/ast-diff'
export { parseEdmx } from './edmx/model'

// Source/span utilities
export type { SourceMap } from './source/sourcemap'
export { percentDecode } from './source/decode'
export { liftSpan } from './source/sourcemap'
