/**
 * $apply option parser for OData V4.
 * Phase 2: shallow parse – recognize transform chain, keep args opaque.
 * Phase 6: deep parse – full groupby/aggregate/compute/filter grammar.
 *
 * Format: $apply=filter(...)/groupby(...)/aggregate(...)
 */

import { Transform } from '../ast'

export function parseApply(value: string): Transform[] {
  const transforms: Transform[] = []
  const parts = value.split('/').map((s) => s.trim()).filter((s) => s.length > 0)

  let pos = 0
  for (const part of parts) {
    const itemStart = pos
    pos = value.indexOf(part, pos) + part.length

    // Extract transform name and args
    const match = part.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\((.*)\)$/)
    if (match) {
      const name = (match[1] ?? 'unknown').toLowerCase()
      const args = match[2] ?? ''

      // Phase 2: all transforms are stored as opaque for now
      transforms.push({
        kind: 'UnknownTransform',
        name,
        raw: part,
        span: { start: itemStart, end: pos },
      } as any)
    } else {
      // Invalid transform; store as unknown
      transforms.push({
        kind: 'UnknownTransform',
        name: 'unknown',
        raw: part,
        span: { start: itemStart, end: pos },
      } as any)
    }
  }

  return transforms
}
