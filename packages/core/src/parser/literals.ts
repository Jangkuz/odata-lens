/**
 * Literal parsing for OData V4.
 * Handles strings, numbers, GUIDs, dates, times, enums, binary data, etc.
 */

import { Literal, Span } from '../ast'

export type LiteralKind = 'string' | 'number' | 'guid' | 'temporal' | 'enum' | 'binary' | 'geo'

/**
 * Parse a literal value from a token.
 */
export function parseLiteral(value: string, kind: LiteralKind, start: number, end: number): Literal {
  const span = { start, end }

  switch (kind) {
    case 'string':
      return { kind: 'String', value, span }

    case 'number':
      return parseNumber(value, span)

    case 'guid':
      return { kind: 'Guid', value, span }

    case 'temporal':
      return parseTemporalLiteral(value, span)

    case 'enum':
      return parseEnumLiteral(value, span)

    case 'binary':
      return { kind: 'BinaryData', raw: value, span }

    case 'geo':
      return { kind: 'Geo', raw: value, span }

    default:
      return { kind: 'String', value, span }
  }
}

/**
 * Parse a number literal with optional suffix (L, M, d, f).
 */
function parseNumber(raw: string, span: Span): Literal {
  const suffixMatch = raw.match(/[LMdf]$/)
  const suffix = suffixMatch ? (suffixMatch[0] as 'L' | 'M' | 'd' | 'f') : undefined
  const numPart = suffix ? raw.slice(0, -1) : raw
  const value = parseFloat(numPart)

  const result: any = {
    kind: 'Number' as const,
    raw,
    value,
    span,
  }

  if (suffix) {
    result.suffix = suffix
  }

  return result
}

/**
 * Parse a temporal literal (Date, DateTimeOffset, TimeOfDay, Duration).
 */
function parseTemporalLiteral(raw: string, span: Span): Literal {
  // Patterns:
  // Date: 1996-01-01
  // DateTimeOffset: 1996-01-01T10:00:00Z
  // TimeOfDay: 10:00:00
  // Duration: duration'P11M'

  if (raw.startsWith("duration'") && raw.endsWith("'")) {
    return { kind: 'Temporal', type: 'Duration', raw, span }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { kind: 'Temporal', type: 'Date', raw, span }
  }

  if (/^\d{2}:\d{2}:\d{2}/.test(raw)) {
    return { kind: 'Temporal', type: 'TimeOfDay', raw, span }
  }

  // Default to DateTimeOffset (most common)
  return { kind: 'Temporal', type: 'DateTimeOffset', raw, span }
}

/**
 * Parse an enum literal: Namespace.EnumType'member1,member2'.
 */
function parseEnumLiteral(raw: string, span: Span): Literal {
  // Format: Ns.Type'member' or Ns.Type'member1,member2'
  const match = raw.match(/^(.+?)'(.*)'/);
  if (!match) {
    return { kind: 'Enum', type: 'Enum', members: [], span }
  }

  const [, typeStr, membersStr] = match
  const type = (typeStr ?? 'Enum').trim()
  const members = (membersStr ?? '').split(',').map((m) => m.trim()).filter((m) => m.length > 0)

  return {
    kind: 'Enum',
    type,
    members,
    span,
  }
}

/**
 * Recognize and parse literal values from raw input.
 * Returns null if the value doesn't look like a literal.
 */
export function tryParseLiteral(raw: string, start: number, end: number): Literal | null {
  // Guid: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(raw)) {
    return { kind: 'Guid', value: raw, span: { start, end } }
  }

  // Boolean
  if (raw === 'true' || raw === 'false') {
    return { kind: 'Boolean', value: raw === 'true', span: { start, end } }
  }

  // Null
  if (raw === 'null') {
    return { kind: 'Null', span: { start, end } }
  }

  // Number
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?[LMdf]?$/.test(raw)) {
    return parseNumber(raw, { start, end })
  }

  // Temporal
  if (
    /^duration'[^']+'$/.test(raw) ||
    /^\d{4}-\d{2}-\d{2}$/.test(raw) ||
    /^\d{2}:\d{2}:\d{2}/.test(raw) ||
    /^\d{4}-\d{2}-\d{2}T/.test(raw)
  ) {
    return parseTemporalLiteral(raw, { start, end })
  }

  // Enum: Ns.Type'member'
  if (raw.includes("'") && raw.includes('.')) {
    return parseEnumLiteral(raw, { start, end })
  }

  return null
}
