/**
 * Tokenizer for OData expressions.
 * Produces a stream of tokens; tolerant of whitespace and newlines.
 * Designed to work with decoded input (pre-percent-decode).
 */

export type TokenKind =
  | 'ident' | 'number' | 'string' | 'guid'
  | 'op' | 'paren' | 'bracket' | 'comma' | 'colon' | 'slash' | 'dot' | 'star'
  | 'ws' | 'eof'

export interface Token {
  kind: TokenKind
  value: string
  start: number
  end: number
}

export class Lexer {
  private input: string
  private pos: number = 0
  private start: number = 0

  constructor(input: string) {
    this.input = input
  }

  /**
   * Scan all tokens up to EOF. Includes whitespace tokens.
   */
  scanAll(): Token[] {
    const tokens: Token[] = []
    let token: Token | null
    while ((token = this.scan()) && token.kind !== 'eof') {
      tokens.push(token)
    }
    tokens.push(token || { kind: 'eof', value: '', start: this.pos, end: this.pos })
    return tokens
  }

  /**
   * Scan next token, including whitespace.
   */
  scan(): Token | null {
    this.start = this.pos
    const ch = this.peek()

    if (ch === undefined) {
      return { kind: 'eof', value: '', start: this.pos, end: this.pos }
    }

    // Whitespace (including newlines, which are allowed in expanded view)
    if (/\s/.test(ch)) {
      return this.scanWhitespace()
    }

    // String literal: single-quoted, '' escapes single quote
    if (ch === "'") {
      return this.scanString()
    }

    // GUID: starts with hex digits in guid pattern
    if (this.isGuidStart()) {
      return this.scanGuid()
    }

    // Number: decimal or with exponent
    if (this.isDigit(ch) || (ch === '-' && this.isDigit(this.peek(1)))) {
      return this.scanNumber()
    }

    // Operators and special chars
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      this.advance()
      const next = this.peek()
      // Check for divby or other two-char ops
      if (ch === '/' && next === '/') {
        // Not a valid OData op, consume as single /
        this.pos--
        this.advance()
        return { kind: 'slash', value: '/', start: this.start, end: this.pos }
      }
      return { kind: 'op', value: ch, start: this.start, end: this.pos }
    }

    // Two-char operators: eq, ne, gt, ge, lt, le, in, or, and, has, add, sub, mul, div, mod, not, is
    if (this.isAlpha(ch)) {
      const ident = this.scanIdent()
      const lower = (ident.value ?? '').toLowerCase()
      if (
        ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'in', 'or', 'and', 'has', 'add', 'sub', 'mul', 'div', 'divby', 'mod', 'not', 'isof'].includes(lower)
      ) {
        return { kind: 'op', value: lower, start: ident.start, end: ident.end }
      }
      return ident
    }

    // Parentheses, brackets, commas, colons, slashes, dots, stars
    if (ch === '(') {
      this.advance()
      return { kind: 'paren', value: '(', start: this.start, end: this.pos }
    }
    if (ch === ')') {
      this.advance()
      return { kind: 'paren', value: ')', start: this.start, end: this.pos }
    }
    if (ch === '[') {
      this.advance()
      return { kind: 'bracket', value: '[', start: this.start, end: this.pos }
    }
    if (ch === ']') {
      this.advance()
      return { kind: 'bracket', value: ']', start: this.start, end: this.pos }
    }
    if (ch === ',') {
      this.advance()
      return { kind: 'comma', value: ',', start: this.start, end: this.pos }
    }
    if (ch === ':') {
      this.advance()
      return { kind: 'colon', value: ':', start: this.start, end: this.pos }
    }
    if (ch === '/') {
      this.advance()
      return { kind: 'slash', value: '/', start: this.start, end: this.pos }
    }
    if (ch === '.') {
      this.advance()
      return { kind: 'dot', value: '.', start: this.start, end: this.pos }
    }
    if (ch === '*') {
      this.advance()
      return { kind: 'star', value: '*', start: this.start, end: this.pos }
    }

    // Parameter alias: @name
    if (ch === '@') {
      this.advance()
      const name = this.scanIdent()
      if (name.kind === 'ident') {
        return { kind: 'ident', value: '@' + name.value, start: this.start, end: name.end }
      }
      return { kind: 'ident', value: '@', start: this.start, end: this.pos }
    }

    // Unknown char; skip and emit as ident (will be caught by parser)
    this.advance()
    return { kind: 'ident', value: ch, start: this.start, end: this.pos }
  }

  /**
   * Skip whitespace tokens; return the aggregated whitespace token.
   */
  private scanWhitespace(): Token {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos]!)) {
      this.pos++
    }
    return { kind: 'ws', value: this.input.slice(this.start, this.pos), start: this.start, end: this.pos }
  }

  /**
   * Scan single-quoted string; '' inside is an escaped quote.
   */
  private scanString(): Token {
    this.advance() // consume opening '
    const chars: string[] = []
    while (this.pos < this.input.length) {
      const ch = this.input[this.pos]!
      if (ch === "'") {
        this.advance()
        // Check for ''
        if (this.peek() === "'") {
          chars.push("'")
          this.advance()
        } else {
          // End of string
          return { kind: 'string', value: chars.join(''), start: this.start, end: this.pos }
        }
      } else {
        chars.push(ch)
        this.advance()
      }
    }
    // Unterminated string
    return { kind: 'string', value: chars.join(''), start: this.start, end: this.pos }
  }

  /**
   * Scan identifier or keyword.
   */
  private scanIdent(): Token {
    while (this.pos < this.input.length && (this.isAlphaNum(this.input[this.pos]!) || this.input[this.pos]! === '_')) {
      this.pos++
    }
    return { kind: 'ident', value: this.input.slice(this.start, this.pos), start: this.start, end: this.pos }
  }

  /**
   * Scan a number: optional sign, digits, optional decimal, optional exponent.
   */
  private scanNumber(): Token {
    if (this.peek() === '-') {
      this.advance()
    }
    while (this.pos < this.input.length && this.isDigit(this.input[this.pos]!)) {
      this.pos++
    }
    if (this.peek() === '.' && this.isDigit(this.peek(1))) {
      this.advance()
      while (this.pos < this.input.length && this.isDigit(this.input[this.pos]!)) {
        this.pos++
      }
    }
    if ((this.peek() === 'e' || this.peek() === 'E') && (this.isDigit(this.peek(1)) || this.peek(1) === '+' || this.peek(1) === '-')) {
      this.advance()
      if (this.peek() === '+' || this.peek() === '-') {
        this.advance()
      }
      while (this.pos < this.input.length && this.isDigit(this.input[this.pos]!)) {
        this.pos++
      }
    }
    // Check for suffix: L, M, d, f
    const suffix = this.peek()
    if (suffix === 'L' || suffix === 'M' || suffix === 'd' || suffix === 'f') {
      this.advance()
    }
    return { kind: 'number', value: this.input.slice(this.start, this.pos), start: this.start, end: this.pos }
  }

  /**
   * Check if current position starts a GUID (8-4-4-4-12 hex digits with dashes).
   * GUIDs can appear bare or quoted; we handle both.
   */
  private isGuidStart(): boolean {
    if (this.pos + 36 > this.input.length) return false
    // Pattern: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
    const candidate = this.input.slice(this.pos, this.pos + 36)
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/.test(candidate)
  }

  /**
   * Scan GUID.
   */
  private scanGuid(): Token {
    const len = 36 // XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
    this.pos += len
    return { kind: 'guid', value: this.input.slice(this.start, this.pos), start: this.start, end: this.pos }
  }

  private isAlpha(ch: string | undefined): boolean {
    return ch !== undefined && /[a-zA-Z_]/.test(ch)
  }

  private isAlphaNum(ch: string | undefined): boolean {
    return ch !== undefined && /[a-zA-Z0-9_]/.test(ch)
  }

  private isDigit(ch: string | undefined): boolean {
    return ch !== undefined && /[0-9]/.test(ch)
  }

  private peek(offset: number = 0): string | undefined {
    return this.input[this.pos + offset]
  }

  private advance(): void {
    this.pos++
  }
}

/**
 * Filter out whitespace tokens from a token stream.
 */
export function filterWhitespace(tokens: Token[]): Token[] {
  return tokens.filter((t) => t.kind !== 'ws')
}
