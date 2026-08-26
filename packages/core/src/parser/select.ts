/**
 * $select option parser for OData V4.
 * Format: $select=prop1,prop2,nav/prop3,*
 */

import { SelectItem, PropertyPath, PathStep, QueryOption } from '../ast'

export function parseSelect(value: string, span: { start: number; end: number }): SelectItem[] {
  const items: SelectItem[] = []
  const parts = value.split(',').map((s) => s.trim()).filter((s) => s.length > 0)

  for (const part of parts) {
    const itemStart = span.start + value.indexOf(part)
    const itemEnd = itemStart + part.length

    if (part === '*') {
      items.push({
        kind: 'SelectItem',
        star: true,
        path: null,
        options: [],
        span: { start: itemStart, end: itemEnd },
      })
    } else {
      // Parse property path: prop1 or nav/prop or nav/subprop
      const segments: PathStep[] = []
      const propParts = part.split('/').filter((s) => s.length > 0)

      for (const propPart of propParts) {
        // Could have options in parens, e.g., nav(filter=...)
        const match = propPart.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)(\(.*\))?$/)
        if (match) {
          const name = match[1]
          segments.push({ name: name.toLowerCase(), span: { start: 0, end: 0 } })
        } else {
          segments.push({ name: propPart.toLowerCase(), span: { start: 0, end: 0 } })
        }
      }

      const path: PropertyPath = {
        kind: 'Path',
        segments,
        span: { start: itemStart, end: itemEnd },
      }

      items.push({
        kind: 'SelectItem',
        star: false,
        path,
        options: [], // V4.01 select-item options; not commonly used
        span: { start: itemStart, end: itemEnd },
      })
    }
  }

  return items
}
