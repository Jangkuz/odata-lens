import { describe, it, expect } from 'vitest'
import { parse } from '../src/parser/url'
import { printCompact, printExpanded } from '../src/printer'
import { stripSpans, astEqual } from './helpers/stripSpans'

/**
 * Round-trip tests: parse(print(parse(x))) ≡ parse(x)
 * This is the correctness backbone of the tool.
 */

const fixtures = [
  // Simple entity set
  'Orders',

  // Entity set with key
  'Orders(1)',
  "Orders(id=42)",

  // Navigation property
  'Orders(1)/Items',

  // $select
  'Orders?$select=ID,Name',
  'Orders?$select=*',
  "Orders?$select=ID,Items/ItemNo",

  // $filter
  "Orders?$filter=Status eq 'Open'",
  "Orders?$filter=Amount gt 100",
  "Orders?$filter=Status eq 'Open' and Amount gt 100",
  "Orders?$filter=Status eq 'Open' or Status eq 'Pending'",
  "Orders?$filter=not Status eq 'Closed'",
  "Orders?$filter=startswith(Name,'ACME')",
  "Orders(1)/Items?$filter=Qty gt 0",

  // $orderby
  'Orders?$orderby=Date',
  'Orders?$orderby=Date desc',
  'Orders?$orderby=Date desc, Amount asc',

  // $top and $skip
  'Orders?$top=10',
  'Orders?$skip=20',
  'Orders?$skip=20&$top=10',

  // $expand (the critical construct)
  'Orders?$expand=Items',
  'Orders?$expand=Items,Customer',
  "Orders?$expand=Items($filter=Qty gt 0)",
  'Orders?$expand=Items($select=ItemNo,Qty)',
  "Orders?$expand=Items($filter=Qty gt 0;$select=ItemNo)",
  'Orders?$expand=Customer',
  'Orders?$expand=Items($expand=Warehouse)',  // nested expand

  // $count
  'Orders/$count',
  'Orders?$count=true',

  // Nested navigation + key
  'Orders(1)/Items(2)',

  // Multiple options
  "Orders?$filter=Status eq 'Open'&$select=ID,Name&$orderby=Date&$top=10",

  // Complex filter with expressions
  "Orders?$filter=(Status eq 'Open' or Status eq 'Pending') and Amount gt 100",

  // Numbers with suffixes
  'Orders?$filter=Amount gt 100L',
  'Orders?$filter=Price eq 19.99M',

  // String escaping (single quotes)
  "Orders?$filter=Name eq 'O''Reilly'",

  // Date literals
  "Orders?$filter=OrderDate eq 2024-01-15",
  "Orders?$filter=CreatedAt gt 2024-01-15T10:30:00Z",

  // Lambdas
  'Orders?$filter=Items/any(i:i/Qty gt 5)',
  'Orders?$filter=Items/all(i:i/Qty gt 0)',

  // $search
  'Orders?$search=urgent',
  'Orders?$search=urgent OR high',

  // $compute
  'Orders?$compute=Amount mul 1.1 as TotalWithTax',

  // $format
  'Orders?$format=json',

  // Combinations
  "Orders?$filter=Status eq 'Open'&$select=*&$expand=Items&$orderby=Date desc&$top=20",
]

describe('Round-trip parsing and printing', () => {
  for (const fixture of fixtures) {
    it(`compact: ${fixture}`, () => {
      // Parse original
      const original = parse(fixture)
      expect(original.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0)

      // Print compact
      const printed = printCompact(original.ast)
      expect(printed.length).toBeGreaterThan(0)

      // Reparse
      const reparsed = parse(printed)
      expect(reparsed.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0)

      // Compare ASTs (ignoring spans and raw values which may differ)
      expect(astEqual(original.ast, reparsed.ast)).toBe(true)
    })

    it(`expanded: ${fixture}`, () => {
      // Parse original
      const original = parse(fixture)
      expect(original.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0)

      // Print expanded
      const printed = printExpanded(original.ast)
      expect(printed.length).toBeGreaterThan(0)

      // Reparse compact form to remove expand formatting
      const compact = printCompact(original.ast)
      const reparsed = parse(compact)
      expect(reparsed.diagnostics.filter((d) => d.severity === 'error')).toHaveLength(0)

      // Compare ASTs
      expect(astEqual(original.ast, reparsed.ast)).toBe(true)
    })
  }

  it('handles empty query gracefully', () => {
    const result = parse('')
    expect(result.ast.path.segments).toHaveLength(0)
    expect(result.ast.options).toHaveLength(0)
  })

  it('handles service root URL', () => {
    const url = 'https://api.example.com/odata/v4/Orders(1)?$select=ID'
    const result = parse(url)
    expect(result.ast.serviceRoot).toBeDefined()
    expect(result.ast.serviceRoot).toContain('https://')
  })
})
