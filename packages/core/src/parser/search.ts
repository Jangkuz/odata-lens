/**
 * $search option parser for OData V4.
 * Format: $search="term1 AND term2" or $search="\"exact phrase\""
 * Grammar: term | phrase | expr AND/OR expr | NOT expr
 */

import { SearchExpr, Span } from '../ast'

export class SearchParser {
  private input: string
  private pos: number = 0

  constructor(input: string) {
    // Remove outer quotes if present
    if ((input.startsWith('"') && input.endsWith('"')) || (input.startsWith("'") && input.endsWith("'"))) {
      this.input = input.slice(1, -1)
    } else {
      this.input = input
    }
  }

  parse(): SearchExpr {
    return this.parseOr()
  }

  private parseOr(): SearchExpr {
    let left = this.parseAnd()

    while (this.matchKeyword('OR')) {
      const start = left.span.start
      const right = this.parseAnd()
      left = {
        kind: 'SearchOr',
        left,
        right,
        span: { start, end: right.span.end },
      }
    }

    return left
  }

  private parseAnd(): SearchExpr {
    let left = this.parseNot()

    while (this.matchKeyword('AND')) {
      const start = left.span.start
      const right = this.parseNot()
      left = {
        kind: 'SearchAnd',
        left,
        right,
        span: { start, end: right.span.end },
      }
    }

    return left
  }

  private parseNot(): SearchExpr {
    const start = this.pos

    if (this.matchKeyword('NOT')) {
      const operand = this.parseNot()
      return {
        kind: 'SearchNot',
        operand,
        span: { start, end: operand.span.end },
      }
    }

    return this.parsePrimary()
  }

  private parsePrimary(): SearchExpr {
    this.skipWhitespace()
    const start = this.pos

    // Quoted phrase: "exact phrase"
    if (this.input[this.pos] === '"') {
      this.pos++ // consume opening "
      const phrase: string[] = []
      while (this.pos < this.input.length && this.input[this.pos] !== '"') {
        if (this.input[this.pos] === '\\' && this.input[this.pos + 1] === '"') {
          phrase.push('"')
          this.pos += 2
        } else {
          phrase.push(this.input[this.pos])
          this.pos++
        }
      }
      if (this.input[this.pos] === '"') {
        this.pos++ // consume closing "
      }
      const value = phrase.join('')
      return {
        kind: 'SearchPhrase',
        value,
        span: { start, end: this.pos },
      }
    }

    // Bare term (up to whitespace or AND/OR/NOT)
    const term: string[] = []
    while (this.pos < this.input.length && !/\s/.test(this.input[this.pos])) {
      term.push(this.input[this.pos])
      this.pos++
    }

    const value = term.join('')
    if (value.length === 0) {
      return {
        kind: 'SearchTerm',
        value: '',
        span: { start, end: this.pos },
      }
    }

    return {
      kind: 'SearchTerm',
      value,
      span: { start, end: this.pos },
    }
  }

  private matchKeyword(kw: string): boolean {
    const end = this.pos + kw.length
    if (end > this.input.length) return false

    const word = this.input.slice(this.pos, end).toUpperCase()
    if (word !== kw.toUpperCase()) return false

    // Check word boundary after
    if (end < this.input.length && /[a-zA-Z0-9_]/.test(this.input[end])) return false

    this.pos = end
    this.skipWhitespace()
    return true
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++
    }
  }
}

export function parseSearch(value: string): SearchExpr {
  const parser = new SearchParser(value)
  return parser.parse()
}
