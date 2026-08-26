/**
 * English explanation for filter expressions.
 */

import { Expression, isStringLit, isNumberLit, isBinaryExpr, isUnaryExpr, isPropertyPath } from '../ast'

export function explainExpression(expr: Expression): string {
  switch (expr.kind) {
    case 'String':
      return `'${expr.value}'`

    case 'Number':
      return `${expr.value}`

    case 'Boolean':
      return expr.value ? 'true' : 'false'

    case 'Null':
      return 'null'

    case 'Path': {
      const path = expr.segments.map((s) => s.name).join('/')
      return path
    }

    case 'Binary': {
      const left = explainExpression(expr.left)
      const right = explainExpression(expr.right)
      const opName = getBinaryOpName(expr.op)
      return `${left} ${opName} ${right}`
    }

    case 'Unary': {
      const operand = explainExpression(expr.operand)
      if (expr.op === 'not') {
        return `NOT ${operand}`
      }
      return `${expr.op}${operand}`
    }

    case 'Group': {
      return `(${explainExpression(expr.expr)})`
    }

    case 'Call': {
      const args = expr.args.map(explainExpression).join(', ')
      return `${expr.name}(${args})`
    }

    case 'Lambda': {
      const source = explainExpression(expr.source)
      if (expr.op === 'any') {
        return `${source} has any`
      }
      if (expr.variable && expr.body) {
        const body = explainExpression(expr.body)
        return `${source} all (${expr.variable}: ${body})`
      }
      return `${source} all`
    }

    case 'ParamAlias':
      return `@${expr.name}`

    case 'Collection': {
      const items = expr.items.map(explainExpression).join(', ')
      return `(${items})`
    }

    case 'UnknownExpr':
      return `[unknown: ${expr.raw}]`

    default:
      return '[expression]'
  }
}

function getBinaryOpName(op: string): string {
  const names: Record<string, string> = {
    eq: 'equals',
    ne: 'is not equal to',
    gt: 'is greater than',
    ge: 'is greater than or equal to',
    lt: 'is less than',
    le: 'is less than or equal to',
    and: 'AND',
    or: 'OR',
    add: 'plus',
    sub: 'minus',
    mul: 'times',
    div: 'divided by',
    mod: 'modulo',
    in: 'is in',
    has: 'has',
  }
  return names[op] || op
}
