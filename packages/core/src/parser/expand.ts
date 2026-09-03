/**
 * $expand option parser for OData V4.
 * Format: $expand=nav1,nav2($filter=...;$select=...),nav3/subnav
 * Handles recursive nested options inside parens.
 */

import { ExpandItem, PropertyPath, PathStep, QueryOption, Span } from '../ast'

export class ExpandParser {
  private input: string
  private pos: number = 0

  constructor(input: string) {
    this.input = input
  }

  parse(): ExpandItem[] {
    const items: ExpandItem[] = []

    while (this.pos < this.input.length && this.input[this.pos] !== undefined) {
      this.skipWhitespace()
      if (this.pos >= this.input.length) break

      const item = this.parseExpandItem()
      if (item) {
        items.push(item)
      }

      this.skipWhitespace()
      if (this.input[this.pos] === ',') {
        this.pos++
      } else if (this.pos >= this.input.length || this.input[this.pos] === ';') {
        break
      }
    }

    return items
  }

  private parseExpandItem(): ExpandItem | null {
    const start = this.pos

    // Check for * (all navigation properties)
    if (this.input[this.pos] === '*') {
      this.pos++
      return {
        kind: 'ExpandItem',
        star: true,
        path: null,
        ref: false,
        count: false,
        options: [],
        span: { start, end: this.pos },
      }
    }

    // Parse path: nav or nav/subnav or nav/$ref or nav/$count
    const path = this.parseExpandPath()
    if (!path && this.input[this.pos] !== '*') {
      return null
    }

    this.skipWhitespace()

    let ref = false
    let count = false

    // Check for /$ref or /$count after path
    if (this.input[this.pos] === '/') {
      const savedPos = this.pos
      this.pos++
      if (this.input.slice(this.pos, this.pos + 4) === '$ref') {
        this.pos += 4
        ref = true
      } else if (this.input.slice(this.pos, this.pos + 6) === '$count') {
        this.pos += 6
        count = true
      } else {
        // Not /$ref or /$count; rewind
        this.pos = savedPos
      }
    }

    this.skipWhitespace()

    // Check for nested options in parens
    const options: QueryOption[] = []
    if (this.input[this.pos] === '(') {
      // Parse nested options; they're semicolon-separated inside
      this.pos++ // consume (
      const optionsStr = this.readUntil(')')
      if (this.input[this.pos] === ')') {
        this.pos++ // consume )
      }
      // Parse the options string; this will be done by the options parser
      // For now, store as raw; we'll parse recursively in options.ts
    }

    return {
      kind: 'ExpandItem',
      star: path === null,
      path,
      ref,
      count,
      options,
      span: { start, end: this.pos },
    }
  }

  private parseExpandPath(): PropertyPath | null {
    const start = this.pos
    const segments: PathStep[] = []

    // Read first segment
    let ident = this.readIdent()
    if (!ident) {
      return null
    }

    segments.push({ name: ident.toLowerCase(), span: { start, end: this.pos } })

    // Read additional segments separated by /
    while (this.input[this.pos] === '/') {
      // Check if it's /$ref or /$count (don't consume those here)
      if (this.input.slice(this.pos, this.pos + 5) === '/$ref' || this.input.slice(this.pos, this.pos + 7) === '/$count') {
        break
      }

      this.pos++ // consume /
      this.skipWhitespace()
      ident = this.readIdent()
      if (!ident) {
        break
      }
      segments.push({ name: ident.toLowerCase(), span: { start: this.pos - ident.length, end: this.pos } })
    }

    if (segments.length === 0) {
      return null
    }

    return {
      kind: 'Path',
      segments,
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

  private readUntil(ch: string): string {
    const start = this.pos
    let depth = 0
    let inString = false

    while (this.pos < this.input.length) {
      const curr = this.input[this.pos]

      if (inString) {
        if (curr === "'") {
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
        if (curr === "'") {
          inString = true
          this.pos++
        } else if (curr === '(') {
          depth++
          this.pos++
        } else if (curr === ')') {
          if (depth === 0 && ch === ')') {
            break
          }
          depth--
          this.pos++
        } else if (curr === ch && depth === 0) {
          break
        } else {
          this.pos++
        }
      }
    }

    return this.input.slice(start, this.pos).trim()
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos]!)) {
      this.pos++
    }
  }
}

export function parseExpand(value: string): ExpandItem[] {
  const parser = new ExpandParser(value)
  return parser.parse()
}
