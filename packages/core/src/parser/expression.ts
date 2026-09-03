/**
 * Expression parser using Pratt parsing (top-down operator precedence).
 * Handles: binary ops, unary ops, function calls, lambdas, literals, property paths.
 */

import { BinaryOp, Expression, UnaryExpr, BinaryExpr, GroupExpr, FunctionCall, PropertyPath, PathStep, ParameterAlias, UnknownExpr, LambdaExpr, Span, CollectionExpr, isStringLit } from '../ast'
import { Lexer, Token, filterWhitespace } from './lexer'
import { parseLiteral } from './literals'

type PrefixFn = (token: Token) => Expression
type InfixFn = (left: Expression, token: Token) => Expression

interface Precedence {
  [key: string]: number
}

const PRECEDENCE: Precedence = {
  or: 1,
  and: 2,
  eq: 3,
  ne: 3,
  gt: 3,
  ge: 3,
  lt: 3,
  le: 3,
  in: 3,
  has: 3,
  add: 4,
  sub: 4,
  mul: 5,
  div: 5,
  divby: 5,
  mod: 5,
}

export type OrderByItem = any // Forward declaration, defined in ast.ts

export class ExpressionParser {
  private tokens: Token[]
  private pos: number = 0
  private prefixFns: Map<string, PrefixFn> = new Map()
  private infixFns: Map<string, InfixFn> = new Map()

  constructor(input: string) {
    const lexer = new Lexer(input)
    this.tokens = filterWhitespace(lexer.scanAll())
    this.registerPrefixFns()
    this.registerInfixFns()
  }

  private registerPrefixFns(): void {
    this.prefixFns.set('ident', (token) => this.prefixIdent(token))
    this.prefixFns.set('string', (token) => {
      const lit = parseLiteral(token.value, 'string', token.start, token.end)
      return lit as Expression
    })
    this.prefixFns.set('number', (token) => {
      const lit = parseLiteral(token.value, 'number', token.start, token.end)
      return lit as Expression
    })
    this.prefixFns.set('guid', (token) => {
      const lit = parseLiteral(token.value, 'guid', token.start, token.end)
      return lit as Expression
    })
    this.prefixFns.set('paren', (token) => this.prefixParen(token))
    this.prefixFns.set('not', (token) => this.prefixUnary(token, 'not'))
    this.prefixFns.set('sub', (token) => this.prefixUnary(token, '-'))
  }

  private registerInfixFns(): void {
    for (const op of ['or', 'and', 'eq', 'ne', 'gt', 'ge', 'lt', 'le', 'in', 'has', 'add', 'sub', 'mul', 'div', 'divby', 'mod']) {
      this.infixFns.set(op, (left, token) => this.infixBinary(left, token, op as BinaryOp))
    }
    this.infixFns.set('paren', (left, token) => this.infixCall(left, token))
    this.infixFns.set('slash', (left, token) => this.infixNavigation(left, token))
  }

  parse(): Expression {
    return this.parseExpression(0)
  }

  private parseExpression(minPrec: number): Expression {
    // Parse prefix (left-hand side)
    let left = this.parsePrefix()

    // Parse infix operators (right-associative)
    while (this.pos < this.tokens.length) {
      const nextToken = this.current()
      if (!nextToken) break

      const nextOp = nextToken.value.toLowerCase()
      const nextPrec = PRECEDENCE[nextOp] ?? -1

      if (nextPrec < minPrec || !this.infixFns.has(nextOp)) {
        break
      }

      const infixFn = this.infixFns.get(nextOp)
      if (!infixFn) break

      left = infixFn(left, nextToken)
    }

    return left
  }

  private parsePrefix(): Expression {
    const token = this.current()
    if (!token) return this.makeUnknown('Unexpected end of input', 0, 0)

    let left: Expression

    // Handle by token kind first
    switch (token.kind) {
      case 'paren':
        left = this.prefixParen(token)
        return left

      case 'bracket':
        left = this.prefixBracketCollection(token)
        return left

      case 'star':
        left = this.prefixStar(token)
        this.advance()
        return left

      case 'op': {
        // Check if this op has a registered prefix handler (e.g., 'not', 'sub')
        const prefixFn = this.prefixFns.get(token.value.toLowerCase())
        if (prefixFn) {
          return prefixFn(token)
        }
        // Not a valid prefix op; fall through to default error
        const unknown = this.makeUnknown(`Unexpected token: ${token.value}`, token.start, token.end)
        this.advance()
        return unknown
      }

      case 'string': {
        const lit = parseLiteral(token.value, 'string', token.start, token.end)
        this.advance()
        return lit
      }

      case 'number': {
        const lit = parseLiteral(token.value, 'number', token.start, token.end)
        this.advance()
        return lit
      }

      case 'guid': {
        const lit = parseLiteral(token.value, 'guid', token.start, token.end)
        this.advance()
        return lit
      }

      case 'ident': {
        const lower = token.value.toLowerCase()

        // Check for unary operators and keywords registered by value
        if (lower === 'not') {
          return this.prefixUnary(token, 'not')
        }

        if (lower === '-') {
          return this.prefixUnary(token, '-')
        }

        // Check for special constants
        if (lower === 'true') {
          this.advance()
          return { kind: 'Boolean', value: true, span: { start: token.start, end: token.end } }
        }

        if (lower === 'false') {
          this.advance()
          return { kind: 'Boolean', value: false, span: { start: token.start, end: token.end } }
        }

        if (lower === 'null') {
          this.advance()
          return { kind: 'Null', span: { start: token.start, end: token.end } }
        }

        // Lambda or property path
        if (lower === 'any' || lower === 'all') {
          return this.parseLambda(token, lower as 'any' | 'all')
        }

        // Property path or function call
        return this.prefixIdent(token)
      }

      default:
        const unknown = this.makeUnknown(`Unexpected token: ${token.value}`, token.start, token.end)
        this.advance()
        return unknown
    }
  }

  private prefixIdent(token: Token): Expression {
    const lower = token.value.toLowerCase()

    // Check for special constants
    if (lower === 'true' || lower === 'false') {
      this.advance()
      return {
        kind: 'Boolean',
        value: lower === 'true',
        span: { start: token.start, end: token.end },
      }
    }

    if (lower === 'null') {
      this.advance()
      return { kind: 'Null', span: { start: token.start, end: token.end } }
    }

    // Check for lambda: any/all
    if (lower === 'any' || lower === 'all') {
      return this.parseLambda(token, lower as 'any' | 'all')
    }

    // Property path or function call
    const start = token.start
    const segments: PathStep[] = [{ name: token.value, span: { start: token.start, end: token.end } }]
    this.advance()

    // Try to parse more segments (casts, navigation)
    while (this.pos < this.tokens.length) {
      const next = this.current()
      if (!next) break

      if (next.value === '/') {
        this.advance()
        const nextToken = this.current()
        if (!nextToken) break

        if (nextToken.kind === 'ident') {
          segments.push({ name: nextToken.value, span: { start: nextToken.start, end: nextToken.end } })
          this.advance()
        } else if (nextToken.value === '(') {
          // /cast(...)
          const castStart = nextToken.start
          this.advance()
          const castName = this.current()?.value ?? ''
          this.advance()
          if (this.current()?.value === ')') {
            this.advance()
            const lastIdx = segments.length - 1
            if (lastIdx >= 0) {
              segments[lastIdx]!.cast = castName
            }
          }
        } else {
          break
        }
      } else {
        break
      }
    }

    return {
      kind: 'Path',
      segments,
      span: { start, end: this.prevEnd() },
    }
  }

  private parseLambda(token: Token, op: 'any' | 'all'): Expression {
    const start = token.start
    this.advance() // consume 'any' or 'all'

    const next = this.current()
    if (!next || next.value !== '(') {
      return this.makeUnknown(`Expected '(' after '${op}'`, start, this.prevEnd())
    }
    this.advance() // consume '('

    // Parse source: property path
    const sourceStart = this.pos
    const sourcePath = this.parsePropertyPath()
    if (sourcePath.kind !== 'Path') {
      return this.makeUnknown(`Expected property path in ${op}`, start, this.prevEnd())
    }

    // For `any()`, there's no variable and body
    if (op === 'any') {
      if (this.current()?.value === ')') {
        this.advance()
        return {
          kind: 'Lambda',
          op,
          source: sourcePath,
          variable: null,
          body: null,
          span: { start, end: this.prevEnd() },
        }
      }
      return this.makeUnknown(`Expected ')' after source in any`, start, this.prevEnd())
    }

    // For `all`, optionally variable: body
    let variable: string | null = null
    let body: Expression | null = null

    const colon = this.current()
    if (colon?.value === ':') {
      this.advance()
      const varToken = this.current()
      if (varToken?.kind === 'ident') {
        variable = varToken.value
        this.advance()

        const arrow = this.current()
        if (arrow?.value === ':' || arrow?.value === '=') {
          this.advance()
          body = this.parseExpression(0)
        }
      }
    }

    if (this.current()?.value === ')') {
      this.advance()
    }

    return {
      kind: 'Lambda',
      op,
      source: sourcePath,
      variable,
      body,
      span: { start, end: this.prevEnd() },
    }
  }

  private parsePropertyPath(): Expression {
    const start = this.current()?.start ?? this.prevEnd()
    const segments: PathStep[] = []

    while (this.pos < this.tokens.length) {
      const token = this.current()
      if (!token || token.kind !== 'ident') break

      segments.push({ name: token.value, span: { start: token.start, end: token.end } })
      this.advance()

      if (this.current()?.value === '/') {
        this.advance()
      } else {
        break
      }
    }

    if (segments.length === 0) {
      return this.makeUnknown('Expected property path', start, this.prevEnd())
    }

    return {
      kind: 'Path',
      segments,
      span: { start, end: this.prevEnd() },
    }
  }

  private prefixParen(token: Token): Expression {
    this.advance() // consume '('
    const expr = this.parseExpression(0)

    if (this.current()?.value === ')') {
      this.advance()
      return {
        kind: 'Group',
        expr,
        span: { start: token.start, end: this.prevEnd() },
      }
    }

    return expr
  }

  private prefixBracketCollection(token: Token): Expression {
    const start = token.start
    this.advance() // consume '['
    const items: Expression[] = []

    while (this.pos < this.tokens.length && this.current()?.value !== ']') {
      items.push(this.parseExpression(0))
      if (this.current()?.value === ',') {
        this.advance()
      } else {
        break
      }
    }

    if (this.current()?.value === ']') {
      this.advance()
    }

    return {
      kind: 'Collection',
      items,
      span: { start, end: this.prevEnd() },
    }
  }

  private prefixStar(token: Token): Expression {
    this.advance()
    return {
      kind: 'Path',
      segments: [{ name: '*', span: { start: token.start, end: token.end } }],
      span: { start: token.start, end: this.prevEnd() },
    }
  }

  private prefixUnary(token: Token, op: 'not' | '-'): Expression {
    const start = token.start
    this.advance() // consume op
    const operand = this.parseExpression(6) // high precedence for unary
    return {
      kind: 'Unary',
      op,
      opSpan: { start, end: token.end },
      operand,
      span: { start, end: this.prevEnd() },
    }
  }

  private infixBinary(left: Expression, token: Token, op: BinaryOp): Expression {
    const start = left.span.start
    const prec = PRECEDENCE[op] ?? 0
    this.advance() // consume op
    const right = this.parseExpression(prec + 1)

    return {
      kind: 'Binary',
      op,
      opSpan: { start: token.start, end: token.end },
      left,
      right,
      span: { start, end: this.prevEnd() },
    }
  }

  private infixCall(left: Expression, token: Token): Expression {
    if (left.kind !== 'Path') {
      // Not a function call; return as-is
      return left
    }

    const start = left.span.start
    this.advance() // consume '('
    const args: Expression[] = []

    while (this.pos < this.tokens.length && this.current()?.value !== ')') {
      args.push(this.parseExpression(0))
      if (this.current()?.value === ',') {
        this.advance()
      } else {
        break
      }
    }

    if (this.current()?.value === ')') {
      this.advance()
    }

    // Extract function name from path
    const pathSegments = left.segments
    const funcName = pathSegments.map((s) => s.name).join('/')

    return {
      kind: 'Call',
      name: funcName,
      args,
      span: { start, end: this.prevEnd() },
    }
  }

  private infixNavigation(left: Expression, token: Token): Expression {
    // Property path navigation via /
    const start = left.span.start
    this.advance() // consume '/'

    const next = this.current()
    if (!next) return left

    if (next.kind === 'ident') {
      const segments: PathStep[] = [...(left.kind === 'Path' ? left.segments : [{ name: '?', span: { start: 0, end: 0 } }])]
      segments.push({ name: next.value, span: { start: next.start, end: next.end } })
      this.advance()

      return {
        kind: 'Path',
        segments,
        span: { start, end: this.prevEnd() },
      }
    }

    return left
  }

  private current(): Token | undefined {
    return this.tokens[this.pos]
  }

  private prevEnd(): number {
    if (this.pos > 0) {
      return this.tokens[this.pos - 1]!.end
    }
    return 0
  }

  private advance(): void {
    this.pos++
  }

  private makeUnknown(raw: string, start: number, end: number): UnknownExpr {
    return { kind: 'UnknownExpr', raw, span: { start, end } }
  }
}

export function parseExpression(input: string): Expression {
  const parser = new ExpressionParser(input)
  return parser.parse()
}
