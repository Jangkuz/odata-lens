/**
 * Expanded printer: indented multi-line OData query output.
 * Designed for readability and editing.
 */

import {
  ODataUrl,
  ResourcePath,
  PathSegment,
  QueryOption,
  Expression,
  ExpandItem,
  OrderByItem,
  SearchExpr,
} from '../ast'

/**
 * Print OData query in expanded form (indented, multi-line).
 */
export function printExpanded(ast: ODataUrl): string {
  const lines: string[] = []

  // Service root + path (single line)
  let urlLine = ''
  if (ast.serviceRoot) {
    urlLine += ast.serviceRoot
  }
  urlLine += printResourcePath(ast.path)

  if (ast.options.length === 0 && !ast.fragment) {
    return urlLine
  }

  lines.push(urlLine)

  // Query options, one per line, indented
  if (ast.options.length > 0) {
    lines.push('?')
    for (let i = 0; i < ast.options.length; i++) {
      const opt = ast.options[i]
      const isLast = i === ast.options.length - 1
      const sep = isLast ? '' : '&'
      const optLine = printOptionExpanded(opt)

      // Multi-line options like $expand get special formatting
      if (opt.kind === '$expand' && optLine.includes('\n')) {
        lines.push(optLine + sep)
      } else {
        lines.push('  ' + optLine + sep)
      }
    }
  }

  // Fragment (rare, but include)
  if (ast.fragment) {
    lines.push('#' + ast.fragment)
  }

  return lines.join('\n')
}

function printResourcePath(path: ResourcePath): string {
  if (path.segments.length === 0) {
    return ''
  }

  // Join segments with /, but Key segments are special - they attach to the previous segment
  let result = ''
  for (let i = 0; i < path.segments.length; i++) {
    const seg = path.segments[i] as any
    if (seg && i > 0 && seg.kind !== 'Key') {
      result += '/'
    }
    if (seg) {
      result += printPathSegment(seg)
    }
  }
  return result
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
      return `(${keyStrs.join(', ')})`
    }

    case 'Function': {
      const args = seg.args.map((arg) => {
        const val = printExpression(arg.value)
        if (arg.name) {
          return `${arg.name}=${val}`
        }
        return val
      })
      return `${seg.qualifiedName}(${args.join(', ')})`
    }

    case 'UnknownSegment':
      return seg.raw

    default:
      return ''
  }
}

function printOptionExpanded(opt: QueryOption): string {
  switch (opt.kind) {
    case '$filter':
      return `$filter = ${printExpression(opt.expr)}`

    case '$select': {
      const items = opt.items.map((item) => {
        if (item.star) return '*'
        if (!item.path) return '*'
        return item.path.segments.map((s) => s.name).join('/')
      })
      return `$select = ${items.join(', ')}`
    }

    case '$expand': {
      // Multi-line, indented format for $expand
      const lines: string[] = ['$expand = (']
      for (let i = 0; i < opt.items.length; i++) {
        const item = opt.items[i]
        const isLast = i === opt.items.length - 1
        const sep = isLast ? '' : ','
        const itemStr = printExpandItemExpanded(item, '  ')
        lines.push(itemStr + sep)
      }
      lines.push(')')
      return lines.join('\n')
    }

    case '$orderby': {
      const items = opt.items.map((item) => {
        const expr = printExpression(item.expr)
        const dir = item.direction ? ` ${item.direction}` : ''
        return expr + dir
      })
      return `$orderby = ${items.join(', ')}`
    }

    case '$top':
      return `$top = ${typeof opt.value === 'number' ? opt.value : printExpression(opt.value)}`

    case '$skip':
      return `$skip = ${typeof opt.value === 'number' ? opt.value : printExpression(opt.value)}`

    case '$count':
      return `$count = ${opt.value ? 'true' : 'false'}`

    case '$search':
      return `$search = ${printSearchExpr(opt.expr)}`

    case '$compute': {
      const items = opt.items.map((item) => `${printExpression(item.expr)} as ${item.alias}`)
      return `$compute = ${items.join(', ')}`
    }

    case '$apply': {
      const items = opt.transforms.map((t) => (t as any).raw || '')
      return `$apply = ${items.join(' / ')}`
    }

    case '$format':
      return `$format = ${opt.value}`

    case '$skiptoken':
      return `$skiptoken = ${opt.value}`

    case 'Alias':
      return `${opt.name} = ${printExpression(opt.value)}`

    case 'Custom':
      return `${opt.name} = ${opt.value}`

    case 'UnknownOption':
      return `${opt.name} = ${opt.raw}`

    default:
      return ''
  }
}

function printExpandItemExpanded(item: ExpandItem, indent: string): string {
  let result = indent

  if (item.star) {
    result += '*'
  } else if (item.path) {
    result += item.path.segments.map((s) => s.name).join('/')
  }

  if (item.ref) result += '/$ref'
  if (item.count) result += '/$count'

  if (item.options && item.options.length > 0) {
    result += ' (\n'
    for (let i = 0; i < item.options.length; i++) {
      const opt = item.options[i] as any
      const isLast = i === item.options.length - 1
      const optStr = printOptionExpanded(opt)
      const lines = optStr.split('\n')
      for (const line of lines) {
        result += indent + '  ' + line + '\n'
      }
      if (!isLast) {
        result = result.trimEnd() + ';\n'
      }
    }
    result = result.trimEnd() + '\n' + indent + ')'
  }

  return result
}

function printExpression(expr: Expression): string {
  switch (expr.kind) {
    case 'String': {
      // Escape single quotes by doubling
      const escaped = expr.value.replace(/'/g, "''")
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
      return `(${items.join(', ')})`
    }

    case 'Call': {
      const args = expr.args.map(printExpression)
      return `${expr.name}(${args.join(', ')})`
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
          return `${source}/all(${expr.variable}: ${body})`
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
      return `"${expr.value}"`

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
