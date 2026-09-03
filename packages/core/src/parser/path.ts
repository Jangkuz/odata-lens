/**
 * Resource path parser for OData V4.
 * Handles: entity sets, keys, properties, navigation, casts, functions, $count/$value/$ref.
 */

import { PathSegment, EntitySetSegment, PropertySegment, NavigationSegment, TypeCastSegment, FunctionSegment, KeySegment, CountSegment, ValueSegment, RefSegment, UnknownSegment, FunctionArg, Expression, Span } from '../ast'
import { Lexer, filterWhitespace } from './lexer'
import { ExpressionParser } from './expression'

export class ResourcePathParser {
  private input: string
  private pos: number = 0
  private segments: PathSegment[] = []

  constructor(input: string) {
    this.input = input.trim()
  }

  parse(): PathSegment[] {
    while (this.pos < this.input.length) {
      this.skipWhitespace()
      if (this.pos >= this.input.length) break

      const segment = this.parseSegment()
      if (!segment) break

      this.segments.push(segment)

      // After any EntitySet/Property/Navigation segment, check for a key (…)
      const lastSeg = this.segments[this.segments.length - 1]!
      if ((lastSeg.kind === 'EntitySet' || lastSeg.kind === 'Property' || lastSeg.kind === 'Navigation')
        && this.input[this.pos] === '(') {
        const keySeg = this.parseKeyOrFunction(lastSeg.span.start, lastSeg.name)
        this.segments.push(keySeg)
      }

      // Expect / or end
      this.skipWhitespace()
      if (this.pos < this.input.length && this.input[this.pos] === '/') {
        this.pos++
      } else if (this.pos < this.input.length) {
        // Invalid char; treat rest as unknown
        const raw = this.input.slice(this.pos)
        this.segments.push({ kind: 'UnknownSegment', raw, span: { start: this.pos, end: this.input.length } })
        break
      }
    }

    return this.segments
  }

  private parseSegment(): PathSegment | null {
    const start = this.pos

    // Check for special segments: $count, $value, $ref
    if (this.match('$count')) {
      return { kind: 'Count', span: { start, end: this.pos } }
    }
    if (this.match('$value')) {
      return { kind: 'Value', span: { start, end: this.pos } }
    }
    if (this.match('$ref')) {
      return { kind: 'Ref', span: { start, end: this.pos } }
    }

    // Read identifier
    const ident = this.readIdent()
    if (!ident) {
      return null
    }

    this.skipWhitespace()

    // Don't parse keys or casts here; just classify the identifier
    // The caller (parse()) will handle keys after an EntitySet

    // Just an identifier; classify based on position
    if (this.segments.length === 0) {
      return {
        kind: 'EntitySet',
        name: ident,
        span: { start, end: this.pos },
      }
    }

    // Could be property or navigation; default to Property
    return {
      kind: 'Property',
      name: ident,
      span: { start, end: this.pos },
    }
  }

  private parseKeyOrFunction(start: number, ident: string): PathSegment {
    this.pos++ // consume '('
    this.skipWhitespace()

    const keyItems: Array<{ name: string | null; value: Expression; span: Span }> = []
    let hasNamedKey = false

    // Try to parse key(s) or function arguments
    while (this.input[this.pos] !== ')' && this.pos < this.input.length) {
      const itemStart = this.pos

      // Try to read name=value (named key)
      const maybeName = this.readIdent()
      this.skipWhitespace()

      if (this.input[this.pos] === '=') {
        // Named key
        this.pos++
        this.skipWhitespace()
        const valueStr = this.readExprValue()
        const valueExpr = parseExpressionSafe(valueStr)
        keyItems.push({ name: maybeName, value: valueExpr, span: { start: itemStart, end: this.pos } })
        hasNamedKey = true
      } else {
        // Unnamed key; rewind and parse as expression
        this.pos = itemStart
        const valueStr = this.readExprValue()
        const valueExpr = parseExpressionSafe(valueStr)
        keyItems.push({ name: null, value: valueExpr, span: { start: itemStart, end: this.pos } })
      }

      this.skipWhitespace()
      if (this.input[this.pos] === ',') {
        this.pos++
        this.skipWhitespace()
      } else {
        break
      }
    }

    if (this.input[this.pos] === ')') {
      this.pos++
    }

    // In OData path parsing, (...) is always a key, not a function call
    // (functions appear in $filter and other contexts, not in the path)
    return {
      kind: 'Key',
      keys: keyItems,
      span: { start, end: this.pos },
    }
  }

  private readIdent(): string | null {
    const start = this.pos
    while (this.pos < this.input.length && /[a-zA-Z0-9_$]/.test(this.input[this.pos]!)) {
      this.pos++
    }
    return this.pos > start ? this.input.slice(start, this.pos) : null
  }

  private readExprValue(): string {
    const start = this.pos
    let depth = 0
    let inString = false

    while (this.pos < this.input.length) {
      const ch = this.input[this.pos]

      if (inString) {
        if (ch === "'") {
          if (this.input[this.pos + 1] === "'") {
            this.pos += 2 // escaped quote
          } else {
            inString = false
            this.pos++
          }
        } else {
          this.pos++
        }
      } else {
        if (ch === "'") {
          inString = true
          this.pos++
        } else if (ch === '(' || ch === '[') {
          depth++
          this.pos++
        } else if (ch === ')' || ch === ']') {
          if (depth === 0) break
          depth--
          this.pos++
        } else if (ch === ',' && depth === 0) {
          break
        } else {
          this.pos++
        }
      }
    }

    return this.input.slice(start, this.pos).trim()
  }

  private peekIdent(): string | null {
    const saved = this.pos
    const result = this.readIdent()
    this.pos = saved
    return result
  }

  private match(str: string): boolean {
    if (this.input.slice(this.pos, this.pos + str.length) === str) {
      this.pos += str.length
      return true
    }
    return false
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos]!)) {
      this.pos++
    }
  }
}

function parseExpressionSafe(input: string): Expression {
  try {
    const parser = new ExpressionParser(input)
    return parser.parse()
  } catch {
    return { kind: 'UnknownExpr', raw: input, span: { start: 0, end: input.length } }
  }
}

export function parseResourcePath(input: string): PathSegment[] {
  const parser = new ResourcePathParser(input)
  return parser.parse()
}
