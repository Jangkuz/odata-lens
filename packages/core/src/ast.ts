/**
 * AST node types for OData V4 queries.
 * All nodes carry a Span in raw input coordinates (pre-percent-decode).
 */

// ============ Shared types ============

export interface Span {
  start: number
  end: number
}

export interface NodeBase {
  span: Span
}

export type Severity = 'error' | 'warning' | 'info'

export interface Diagnostic {
  span: Span
  severity: Severity
  code: string
  message: string
  hint?: string
}

export interface ParseResult {
  ast: ODataUrl
  diagnostics: Diagnostic[]
}

// ============ Top level ============

export interface ODataUrl extends NodeBase {
  kind: 'ODataUrl'
  serviceRoot: string | null
  path: ResourcePath
  options: QueryOption[]
  fragment: string | null
}

export interface ResourcePath extends NodeBase {
  kind: 'ResourcePath'
  segments: PathSegment[]
}

// ============ Resource path segments ============

export type PathSegment =
  | EntitySetSegment
  | KeySegment
  | PropertySegment
  | NavigationSegment
  | TypeCastSegment
  | FunctionSegment
  | CountSegment
  | ValueSegment
  | RefSegment
  | UnknownSegment

export interface EntitySetSegment extends NodeBase {
  kind: 'EntitySet'
  name: string
}

export interface PropertySegment extends NodeBase {
  kind: 'Property'
  name: string
}

export interface NavigationSegment extends NodeBase {
  kind: 'Navigation'
  name: string
}

export interface TypeCastSegment extends NodeBase {
  kind: 'TypeCast'
  qualifiedName: string
}

export interface CountSegment extends NodeBase {
  kind: 'Count'
}

export interface ValueSegment extends NodeBase {
  kind: 'Value'
}

export interface RefSegment extends NodeBase {
  kind: 'Ref'
}

export interface UnknownSegment extends NodeBase {
  kind: 'UnknownSegment'
  raw: string
}

export interface KeySegment extends NodeBase {
  kind: 'Key'
  keys: { name: string | null; value: Expression; span: Span }[]
}

export interface FunctionSegment extends NodeBase {
  kind: 'Function'
  qualifiedName: string
  args: FunctionArg[]
}

export interface FunctionArg extends NodeBase {
  kind: 'FunctionArg'
  name: string | null
  value: Expression
}

// ============ Query options ============

export type QueryOption =
  | FilterOption
  | SelectOption
  | ExpandOption
  | OrderByOption
  | TopOption
  | SkipOption
  | CountOption
  | SearchOption
  | ComputeOption
  | ApplyOption
  | FormatOption
  | SkipTokenOption
  | AliasOption
  | CustomOption
  | UnknownOption

export interface OptionBase extends NodeBase {
  nameSpan: Span
  valueSpan: Span
  rawValue: string
}

export interface FilterOption extends OptionBase {
  kind: '$filter'
  expr: Expression
}

export interface SelectOption extends OptionBase {
  kind: '$select'
  items: SelectItem[]
}

export interface ExpandOption extends OptionBase {
  kind: '$expand'
  items: ExpandItem[]
}

export interface OrderByOption extends OptionBase {
  kind: '$orderby'
  items: OrderByItem[]
}

export interface TopOption extends OptionBase {
  kind: '$top'
  value: number | UnknownExpr
}

export interface SkipOption extends OptionBase {
  kind: '$skip'
  value: number | UnknownExpr
}

export interface CountOption extends OptionBase {
  kind: '$count'
  value: boolean
}

export interface SearchOption extends OptionBase {
  kind: '$search'
  expr: SearchExpr
}

export interface ComputeOption extends OptionBase {
  kind: '$compute'
  items: ComputeItem[]
}

export interface ApplyOption extends OptionBase {
  kind: '$apply'
  transforms: Transform[]
}

export interface FormatOption extends OptionBase {
  kind: '$format'
  value: string
}

export interface SkipTokenOption extends OptionBase {
  kind: '$skiptoken'
  value: string
}

export interface AliasOption extends OptionBase {
  kind: 'Alias'
  name: string
  value: Expression
}

export interface CustomOption extends OptionBase {
  kind: 'Custom'
  name: string
  value: string
}

export interface UnknownOption extends OptionBase {
  kind: 'UnknownOption'
  name: string
  raw: string
}

// ============ Option item types ============

export interface SelectItem extends NodeBase {
  kind: 'SelectItem'
  star: boolean
  path: PropertyPath | null
  options: QueryOption[]
}

export interface ExpandItem extends NodeBase {
  kind: 'ExpandItem'
  star: boolean
  path: PropertyPath | null
  ref: boolean
  count: boolean
  options: QueryOption[]
}

export interface OrderByItem extends NodeBase {
  kind: 'OrderByItem'
  expr: Expression
  direction: 'asc' | 'desc' | null
}

export interface ComputeItem extends NodeBase {
  kind: 'ComputeItem'
  expr: Expression
  alias: string
}

// ============ Expressions ============

export type Expression =
  | BinaryExpr
  | UnaryExpr
  | GroupExpr
  | FunctionCall
  | LambdaExpr
  | PropertyPath
  | CollectionExpr
  | ParameterAlias
  | Literal
  | UnknownExpr

export type BinaryOp =
  | 'or'
  | 'and'
  | 'eq'
  | 'ne'
  | 'gt'
  | 'ge'
  | 'lt'
  | 'le'
  | 'in'
  | 'has'
  | 'add'
  | 'sub'
  | 'mul'
  | 'div'
  | 'divby'
  | 'mod'

export interface BinaryExpr extends NodeBase {
  kind: 'Binary'
  op: BinaryOp
  opSpan: Span
  left: Expression
  right: Expression
}

export interface UnaryExpr extends NodeBase {
  kind: 'Unary'
  op: 'not' | '-'
  opSpan: Span
  operand: Expression
}

export interface GroupExpr extends NodeBase {
  kind: 'Group'
  expr: Expression
}

export interface FunctionCall extends NodeBase {
  kind: 'Call'
  name: string
  args: Expression[]
}

export interface LambdaExpr extends NodeBase {
  kind: 'Lambda'
  op: 'any' | 'all'
  source: PropertyPath
  variable: string | null
  body: Expression | null
}

export interface PropertyPath extends NodeBase {
  kind: 'Path'
  segments: PathStep[]
}

export interface PathStep {
  name: string
  cast?: string
  span: Span
}

export interface CollectionExpr extends NodeBase {
  kind: 'Collection'
  items: Expression[]
}

export interface ParameterAlias extends NodeBase {
  kind: 'ParamAlias'
  name: string
}

export interface UnknownExpr extends NodeBase {
  kind: 'UnknownExpr'
  raw: string
}

// ============ Literals ============

export type Literal =
  | StringLit
  | NumberLit
  | BooleanLit
  | NullLit
  | GuidLit
  | TemporalLit
  | EnumLit
  | BinaryDataLit
  | GeoLit

export interface StringLit extends NodeBase {
  kind: 'String'
  value: string
}

export interface NumberLit extends NodeBase {
  kind: 'Number'
  raw: string
  suffix?: 'L' | 'M' | 'd' | 'f'
  value: number
}

export interface BooleanLit extends NodeBase {
  kind: 'Boolean'
  value: boolean
}

export interface NullLit extends NodeBase {
  kind: 'Null'
}

export interface GuidLit extends NodeBase {
  kind: 'Guid'
  value: string
}

export interface TemporalLit extends NodeBase {
  kind: 'Temporal'
  type: 'Date' | 'DateTimeOffset' | 'TimeOfDay' | 'Duration'
  raw: string
}

export interface EnumLit extends NodeBase {
  kind: 'Enum'
  type: string
  members: string[]
}

export interface BinaryDataLit extends NodeBase {
  kind: 'BinaryData'
  raw: string
}

export interface GeoLit extends NodeBase {
  kind: 'Geo'
  raw: string
}

// ============ $search ============

export type SearchExpr =
  | (NodeBase & { kind: 'SearchTerm'; value: string })
  | (NodeBase & { kind: 'SearchPhrase'; value: string })
  | (NodeBase & { kind: 'SearchAnd'; left: SearchExpr; right: SearchExpr })
  | (NodeBase & { kind: 'SearchOr'; left: SearchExpr; right: SearchExpr })
  | (NodeBase & { kind: 'SearchNot'; operand: SearchExpr })

// ============ $apply ============

export type Transform =
  | (NodeBase & { kind: 'TFilter'; expr: Expression })
  | (NodeBase & { kind: 'TGroupBy'; properties: PropertyPath[]; nested: Transform[] })
  | (NodeBase & { kind: 'TAggregate'; items: AggregateItem[] })
  | (NodeBase & { kind: 'TCompute'; items: ComputeItem[] })
  | (NodeBase & {
      kind: 'TExpand' | 'TConcat' | 'TTopCount' | 'TBottomCount' | 'TIdentity'
      raw: string
    })
  | (NodeBase & { kind: 'UnknownTransform'; name: string; raw: string })

export interface AggregateItem extends NodeBase {
  kind: 'AggregateItem'
  expr: Expression
  method: 'sum' | 'min' | 'max' | 'average' | 'countdistinct' | '$count' | null
  alias: string | null
}

// ============ EDMX model ============

export interface EdmModel {
  namespaces: string[]
  entityTypes: Map<string, EdmEntityType>
  complexTypes: Map<string, EdmComplexType>
  enumTypes: Map<string, EdmEnumType>
  entitySets: Map<string, string>
  functions: Map<string, EdmOperation[]>
}

export interface EdmEntityType {
  name: string
  baseType?: string
  keys: string[]
  properties: Map<string, EdmProperty>
  navigation: Map<string, EdmNavProperty>
}

export interface EdmComplexType {
  name: string
  baseType?: string
  properties: Map<string, EdmProperty>
}

export interface EdmEnumType {
  name: string
  members: Map<string, number>
  isFlags?: boolean
}

export interface EdmProperty {
  type: string
  nullable: boolean
}

export interface EdmNavProperty {
  type: string
  collection: boolean
}

export interface EdmOperation {
  name: string
  parameters: EdmParameter[]
  returnType: string
  isBound?: boolean
}

export interface EdmParameter {
  name: string
  type: string
  nullable?: boolean
}

// ============ Type guards ============

export const isOption = (x: any): x is QueryOption => x?.kind?.startsWith('$') || x?.kind === 'Alias' || x?.kind === 'Custom' || x?.kind === 'UnknownOption'
export const isExpression = (x: any): x is Expression => x?.kind && ['Binary', 'Unary', 'Group', 'Call', 'Lambda', 'Path', 'Collection', 'ParamAlias', 'UnknownExpr', 'String', 'Number', 'Boolean', 'Null', 'Guid', 'Temporal', 'Enum', 'BinaryData', 'Geo'].includes(x.kind)
export const isLiteral = (x: any): x is Literal => x?.kind && ['String', 'Number', 'Boolean', 'Null', 'Guid', 'Temporal', 'Enum', 'BinaryData', 'Geo'].includes(x.kind)
export const isBinaryExpr = (x: any): x is BinaryExpr => x?.kind === 'Binary'
export const isUnaryExpr = (x: any): x is UnaryExpr => x?.kind === 'Unary'
export const isGroupExpr = (x: any): x is GroupExpr => x?.kind === 'Group'
export const isFunctionCall = (x: any): x is FunctionCall => x?.kind === 'Call'
export const isLambdaExpr = (x: any): x is LambdaExpr => x?.kind === 'Lambda'
export const isPropertyPath = (x: any): x is PropertyPath => x?.kind === 'Path'
export const isCollectionExpr = (x: any): x is CollectionExpr => x?.kind === 'Collection'
export const isParameterAlias = (x: any): x is ParameterAlias => x?.kind === 'ParamAlias'
export const isUnknownExpr = (x: any): x is UnknownExpr => x?.kind === 'UnknownExpr'
export const isStringLit = (x: any): x is StringLit => x?.kind === 'String'
export const isNumberLit = (x: any): x is NumberLit => x?.kind === 'Number'
export const isBooleanLit = (x: any): x is BooleanLit => x?.kind === 'Boolean'
export const isNullLit = (x: any): x is NullLit => x?.kind === 'Null'
export const isGuidLit = (x: any): x is GuidLit => x?.kind === 'Guid'
export const isTemporalLit = (x: any): x is TemporalLit => x?.kind === 'Temporal'
export const isEnumLit = (x: any): x is EnumLit => x?.kind === 'Enum'
export const isBinaryDataLit = (x: any): x is BinaryDataLit => x?.kind === 'BinaryData'
export const isGeoLit = (x: any): x is GeoLit => x?.kind === 'Geo'
export const isFilterOption = (x: any): x is FilterOption => x?.kind === '$filter'
export const isSelectOption = (x: any): x is SelectOption => x?.kind === '$select'
export const isExpandOption = (x: any): x is ExpandOption => x?.kind === '$expand'
export const isOrderByOption = (x: any): x is OrderByOption => x?.kind === '$orderby'
export const isTopOption = (x: any): x is TopOption => x?.kind === '$top'
export const isSkipOption = (x: any): x is SkipOption => x?.kind === '$skip'
export const isCountOption = (x: any): x is CountOption => x?.kind === '$count'
export const isSearchOption = (x: any): x is SearchOption => x?.kind === '$search'
export const isComputeOption = (x: any): x is ComputeOption => x?.kind === '$compute'
export const isApplyOption = (x: any): x is ApplyOption => x?.kind === '$apply'
export const isFormatOption = (x: any): x is FormatOption => x?.kind === '$format'
export const isSkipTokenOption = (x: any): x is SkipTokenOption => x?.kind === '$skiptoken'
export const isAliasOption = (x: any): x is AliasOption => x?.kind === 'Alias'
export const isCustomOption = (x: any): x is CustomOption => x?.kind === 'Custom'
export const isUnknownOption = (x: any): x is UnknownOption => x?.kind === 'UnknownOption'
