/**
 * Compact printer: single-line OData URL output.
 */

import {
  ODataUrl,
  ResourcePath,
  PathSegment,
  QueryOption,
  Expression,
  PropertyPath,
  SelectItem,
  ExpandItem,
  OrderByItem,
  SearchExpr,
  Transform,
  isStringLit,
  isNumberLit,
  isPropertyPath,
  isFunctionCall,
  isUnknownExpr,
} from '../ast'
import { encodeQueryValue, encodeStringLiteral, encodePropertyName } from './encode'

/**
 * Print OData URL in compact form (single-line, percent-encoded).
 */
export function printCompact(ast: ODataUrl): string {
  let result = ''

  if (ast.serviceRoot) {
    result += ast.serviceRoot
  }

  result += printResourcePath(ast.path)

  if (ast.options.length > 0) {
    result += '?'
    result += ast.options.map(printOption).join('&')
  }

  if (ast.fragment) {
    result += '#' + ast.fragment
  }

  return result
}

function printResourcePath(path: ResourcePath): string {
  if (path.segments.length === 0) {
    return ''
  }

  return path.segments.map(printPathSegment).join('/')
}

function printPathSegment(seg: PathSegment): string {
  switch (seg.kind) {
    case 'EntitySet':
      return seg.name

    case 'Property':
      return seg.name

    case 'Navigation':
      return seg.name

    case 'TypeCast':
      return seg.qualifiedName

    case 'Count':
      return '$count'

    case 'Value':
      return '$value'

    case 'Ref':
      return '$ref'

    case 'Key': {
      const keyStrs = seg.keys.map((k) => {
        const val = printExpression(k.value)
        if (k.name) {
          return `${k.name}=${val}`
        }
        return val
      })
      return `(${keyStrs.join(',')})`
    }

    case 'Function': {
      const args = seg.args.map((arg) => {
        const val = printExpression(arg.value)
        if (arg.name) {
          return `${arg.name}=${val}`
        }
        return val
      })
      return `${seg.qualifiedName}(${args.join(',')})`
    }

    case 'UnknownSegment':
      return seg.raw

    default:
      return ''
  }
}

function printOption(opt: QueryOption): string {
  switch (opt.kind) {
    case '$filter':
      return `$filter=${encodeQueryValue(printExpression(opt.expr))}`

    case '$select': {
      const items = opt.items.map((item) => {
        if (item.star) return '*'
        if (!item.path) return '*'
        return item.path.segments.map((s) => s.name).join('/')
      })
      return `$select=${encodeQueryValue(items.join(','))}`
    }

    case '$expand': {
      const items = opt.items.map((item) => {
        let result = ''
        if (item.star) {
          result = '*'
        } else if (item.path) {
          result = item.path.segments.map((s) => s.name).join('/')
        }
        if (item.ref) result += '/$ref'
        if (item.count) result += '/$count'
        if (item.options.length > 0) {
          result += '(' + item.options.map(printOption).join(';') + ')'
        }
        return result
      })
      return `$expand=${encodeQueryValue(items.join(','))}`
    }

    case '$orderby': {
      const items = opt.items.map((item) => {
        const expr = printExpression(item.expr)
        const dir = item.direction ? ` ${item.direction}` : ''
        return expr + dir
      })
      return `$orderby=${encodeQueryValue(items.join(','))}`
    }

    case '$top':
      return `$top=${typeof opt.value === 'number' ? opt.value : printExpression(opt.value)}`

    case '$skip':
      return `$skip=${typeof opt.value === 'number' ? opt.value : printExpression(opt.value)}`

    case '$count':
      return `$count=${opt.value ? 'true' : 'false'}`

    case '$search':
      return `$search=${encodeQueryValue(printSearchExpr(opt.expr))}`

    case '$compute': {
      const items = opt.items.map((item) => `${printExpression(item.expr)} as ${item.alias}`)
      return `$compute=${encodeQueryValue(items.join(','))}`
    }

    case '$apply': {
      const items = opt.transforms.map((t) => {
        // Phase 2: all transforms are UnknownTransform; Phase 6 will have proper types
        return (t as any).raw || ''
      })
      return `$apply=${encodeQueryValue(items.join('/'))}`
    }

    case '$format':
      return `$format=${opt.value}`

    case '$skiptoken':
      return `$skiptoken=${encodeQueryValue(opt.value)}`

    case 'Alias':
      return `${opt.name}=${encodeQueryValue(printExpression(opt.value))}`

    case 'Custom':
      return `${opt.name}=${encodeQueryValue(opt.value)}`

    case 'UnknownOption':
      return `${opt.name}=${encodeQueryValue(opt.raw)}`

    default:
      return ''
  }
}

function printExpression(expr: Expression): string {
  switch (expr.kind) {
    case 'String': {
      const escaped = encodeStringLiteral(expr.value)
      return `'${escaped}'`
    }

    case 'Number':
      return expr.raw

    case 'Boolean':
      return expr.value ? 'true' : 'false'

    case 'Null':
      return 'null'

    case 'Guid':
      return expr.value

    case 'Temporal':
      return expr.raw

    case 'Enum':
      return `${expr.type}'${expr.members.join(',')}'`

    case 'BinaryData':
      return expr.raw

    case 'Geo':
      return expr.raw

    case 'Path':
      return expr.segments.map((s) => {
        let seg = s.name
        if (s.cast) {
          seg = `${seg}/${s.cast}`
        }
        return seg
      }).join('/')

    case 'ParamAlias':
      return `@${expr.name}`

    case 'Collection': {
      const items = expr.items.map(printExpression)
      return `(${items.join(',')})`
    }

    case 'Call': {
      const args = expr.args.map(printExpression)
      return `${expr.name}(${args.join(',')})`
    }

    case 'Binary': {
      const left = printExpression(expr.left)
      const right = printExpression(expr.right)
      return `${left} ${expr.op} ${right}`
    }

    case 'Unary': {
      const operand = printExpression(expr.operand)
      if (expr.op === 'not') {
        return `not ${operand}`
      }
      return `${expr.op}${operand}`
    }

    case 'Group': {
      const inner = printExpression(expr.expr)
      return `(${inner})`
    }

    case 'Lambda': {
      const source = printExpression(expr.source)
      if (expr.op === 'any') {
        if (expr.variable) {
          return `${source}/any(${expr.variable})`
        }
        return `${source}/any()`
      } else {
        // all
        if (expr.variable && expr.body) {
          const body = printExpression(expr.body)
          return `${source}/all(${expr.variable}:${body})`
        }
        return `${source}/all()`
      }
    }

    case 'UnknownExpr':
      return expr.raw

    default:
      return ''
  }
}

function printSearchExpr(expr: SearchExpr): string {
  switch (expr.kind) {
    case 'SearchTerm':
      return expr.value

    case 'SearchPhrase':
      return `"${expr.value.replace(/"/g, '\\"')}"`

    case 'SearchAnd': {
      const left = printSearchExpr(expr.left)
      const right = printSearchExpr(expr.right)
      return `${left} AND ${right}`
    }

    case 'SearchOr': {
      const left = printSearchExpr(expr.left)
      const right = printSearchExpr(expr.right)
      return `${left} OR ${right}`
    }

    case 'SearchNot': {
      const operand = printSearchExpr(expr.operand)
      return `NOT ${operand}`
    }

    default:
      return ''
  }
}
