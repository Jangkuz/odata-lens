import { ODataUrl, isFilterOption, isSelectOption, isOrderByOption, isExpandOption } from '../ast'
import { explainExpression } from './filter'

/**
 * Explain an OData query in plain English.
 */
export function explain(ast: ODataUrl): string {
  const lines: string[] = []

  // Resource path
  if (ast.path.segments.length > 0) {
    const pathNames = ast.path.segments.map((s) => (s.kind === 'EntitySet' ? s.name : '')).filter(Boolean)
    if (pathNames.length > 0) {
      lines.push(`From: ${pathNames.join('/')}`)
    }
  }

  // Query options
  for (const opt of ast.options) {
    if (isFilterOption(opt)) {
      lines.push(`Filter: ${explainExpression(opt.expr)}`)
    } else if (isSelectOption(opt)) {
      const fields = opt.items.map((item) => (item.star ? '*' : item.path?.segments.map((s) => s.name).join('/') || '?')).join(', ')
      lines.push(`Select: ${fields}`)
    } else if (isOrderByOption(opt)) {
      const items = opt.items.map((item) => `${explainExpression(item.expr)} ${item.direction || 'asc'}`).join(', ')
      lines.push(`Order by: ${items}`)
    } else if (isExpandOption(opt)) {
      const paths = opt.items.map((item) => (item.path?.segments.map((s) => s.name).join('/') || '?')).join(', ')
      lines.push(`Expand: ${paths}`)
    } else if (opt.kind === '$top') {
      lines.push(`Top: ${typeof opt.value === 'number' ? opt.value : 'unknown'}`)
    } else if (opt.kind === '$skip') {
      lines.push(`Skip: ${typeof opt.value === 'number' ? opt.value : 'unknown'}`)
    }
  }

  return lines.join('\n')
}

/**
 * Generate a one-line summary of the query.
 */
export function summarizeQuery(ast: ODataUrl): string {
  const parts: string[] = []

  // Resource
  const resourceNames = ast.path.segments.map((s) => (s.kind === 'EntitySet' ? s.name : '')).filter(Boolean)
  if (resourceNames.length > 0) {
    parts.push(resourceNames[0]!)
  }

  // Count conditions
  const filterOpts = ast.options.filter(isFilterOption)
  if (filterOpts.length > 0) {
    parts.push(`${filterOpts.length} filter`)
  }

  // Expand depth
  const expandOpts = ast.options.filter(isExpandOption)
  if (expandOpts.length > 0) {
    const maxDepth = Math.max(...expandOpts.map((e) => (e.items[0]?.options.length ?? 0)))
    parts.push(`expand: ${maxDepth > 0 ? 'nested' : 'simple'}`)
  }

  // Paging
  const topOpts = ast.options.filter((o) => o.kind === '$top')
  const skipOpts = ast.options.filter((o) => o.kind === '$skip')
  if (topOpts.length > 0 || skipOpts.length > 0) {
    parts.push('paged')
  }

  return parts.join(' • ') || 'OData query'
}
