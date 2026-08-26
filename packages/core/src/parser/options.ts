/**
 * Query options parser for OData V4.
 * Splits on & and first =, dispatches to option-specific parsers.
 * Handles recursion for nested options in $expand items.
 */

import {
  QueryOption,
  FilterOption,
  SelectOption,
  ExpandOption,
  OrderByOption,
  TopOption,
  SkipOption,
  CountOption,
  SearchOption,
  ComputeOption,
  ApplyOption,
  FormatOption,
  SkipTokenOption,
  AliasOption,
  CustomOption,
  UnknownOption,
  Span,
  Diagnostic,
} from '../ast'
import { parseExpression } from './expression'
import { parseSelect } from './select'
import { parseExpand } from './expand'
import { parseSearch } from './search'
import { parseApply } from './apply'
import { createDiagnostic } from './recover'

export interface ParsedOption {
  name: string
  value: string
  nameSpan: Span
  valueSpan: Span
  rawValue: string
}

/**
 * Split query string (everything after ?) into parsed options.
 */
export function splitOptions(queryString: string, baseOffset: number = 0): ParsedOption[] {
  const options: ParsedOption[] = []
  const parts = queryString.split('&')

  let currentOffset = baseOffset
  for (const part of parts) {
    const eqIdx = part.indexOf('=')
    if (eqIdx === -1) {
      // No value, skip
      currentOffset += part.length + 1 // +1 for the &
      continue
    }

    const name = part.slice(0, eqIdx).trim()
    const value = part.slice(eqIdx + 1).trim()

    const nameStart = currentOffset
    const nameEnd = nameStart + name.length
    const valueStart = currentOffset + eqIdx + 1
    const valueEnd = currentOffset + part.length

    options.push({
      name,
      value,
      nameSpan: { start: nameStart, end: nameEnd },
      valueSpan: { start: valueStart, end: valueEnd },
      rawValue: value,
    })

    currentOffset += part.length + 1 // +1 for the &
  }

  return options
}

/**
 * Parse a single query option into a QueryOption node.
 */
export function parseOption(parsed: ParsedOption): QueryOption | null {
  const { name, value, nameSpan, valueSpan, rawValue } = parsed
  const nameLower = name.toLowerCase()
  const span = { start: nameSpan.start, end: valueSpan.end }

  switch (nameLower) {
    case '$filter': {
      const expr = parseExpression(value)
      return {
        kind: '$filter',
        expr,
        nameSpan,
        valueSpan,
        rawValue,
        span,
      } as FilterOption
    }

    case '$select': {
      const items = parseSelect(value, valueSpan)
      return {
        kind: '$select',
        items,
        nameSpan,
        valueSpan,
        rawValue,
        span,
      } as SelectOption
    }

    case '$expand': {
      const items = parseExpand(value)
      // Note: nested options inside expand items are parsed recursively
      // during the expand parse; they're stored in ExpandItem.options
      return {
        kind: '$expand',
        items,
        nameSpan,
        valueSpan,
        rawValue,
        span,
      } as ExpandOption
    }

    case '$orderby': {
      // Parse as comma-separated items, each a "expr asc/desc"
      const items = parseOrderBy(value, valueSpan)
      return {
        kind: '$orderby',
        items,
        nameSpan,
        valueSpan,
        rawValue,
        span,
      } as OrderByOption
    }

    case '$top': {
      const numValue = parseInt(value, 10)
      const topValue = isNaN(numValue) ? { kind: 'UnknownExpr', raw: value, span: valueSpan } : numValue
      return {
        kind: '$top',
        value: topValue,
        nameSpan,
        valueSpan,
        rawValue,
        span,
      } as TopOption
    }

    case '$skip': {
      const numValue = parseInt(value, 10)
      const skipValue = isNaN(numValue) ? { kind: 'UnknownExpr', raw: value, span: valueSpan } : numValue
      return {
        kind: '$skip',
        value: skipValue,
        nameSpan,
        valueSpan,
        rawValue,
        span,
      } as SkipOption
    }

    case '$count': {
      const countValue = value === 'true'
      return {
        kind: '$count',
        value: countValue,
        nameSpan,
        valueSpan,
        rawValue,
        span,
      } as CountOption
    }

    case '$search': {
      const expr = parseSearch(value)
      return {
        kind: '$search',
        expr,
        nameSpan,
        valueSpan,
        rawValue,
        span,
      } as SearchOption
    }

    case '$compute': {
      const items = parseCompute(value, valueSpan)
      return {
        kind: '$compute',
        items,
        nameSpan,
        valueSpan,
        rawValue,
        span,
      } as ComputeOption
    }

    case '$apply': {
      const transforms = parseApply(value)
      return {
        kind: '$apply',
        transforms,
        nameSpan,
        valueSpan,
        rawValue,
        span,
      } as ApplyOption
    }

    case '$format': {
      return {
        kind: '$format',
        value,
        nameSpan,
        valueSpan,
        rawValue,
        span,
      } as FormatOption
    }

    case '$skiptoken': {
      return {
        kind: '$skiptoken',
        value,
        nameSpan,
        valueSpan,
        rawValue,
        span,
      } as SkipTokenOption
    }

    default: {
      // Parameter alias: @name=value
      if (name.startsWith('@')) {
        const expr = parseExpression(value)
        return {
          kind: 'Alias',
          name,
          value: expr,
          nameSpan,
          valueSpan,
          rawValue,
          span,
        } as AliasOption
      }

      // Custom/unknown option
      if (nameLower.startsWith('$')) {
        return {
          kind: 'UnknownOption',
          name,
          raw: value,
          nameSpan,
          valueSpan,
          rawValue,
          span,
        } as UnknownOption
      }

      // Non-OData parameter
      return {
        kind: 'Custom',
        name,
        value,
        nameSpan,
        valueSpan,
        rawValue,
        span,
      } as CustomOption
    }
  }
}

function parseOrderBy(value: string, span: Span): any[] {
  // Simple parser: expr [asc|desc], expr [asc|desc], ...
  // For now, just split and parse each part
  const items = []
  const parts = value.split(',')

  for (const part of parts) {
    const trimmed = part.trim()
    const match = trimmed.match(/^(.+?)\s+(asc|desc)$/)

    if (match) {
      const [, exprStr, dir] = match
      const expr = parseExpression(exprStr)
      items.push({
        kind: 'OrderByItem',
        expr,
        direction: dir as 'asc' | 'desc',
        span,
      })
    } else {
      // No explicit direction; default to asc
      const expr = parseExpression(trimmed)
      items.push({
        kind: 'OrderByItem',
        expr,
        direction: null,
        span,
      })
    }
  }

  return items
}

function parseCompute(value: string, span: Span): any[] {
  // Simple parser: expr as alias, expr as alias, ...
  const items = []
  const parts = value.split(',')

  for (const part of parts) {
    const trimmed = part.trim()
    const match = trimmed.match(/^(.+?)\s+as\s+([a-zA-Z_][a-zA-Z0-9_]*)$/i)

    if (match) {
      const [, exprStr, alias] = match
      const expr = parseExpression(exprStr)
      items.push({
        kind: 'ComputeItem',
        expr,
        alias,
        span,
      })
    }
  }

  return items
}
