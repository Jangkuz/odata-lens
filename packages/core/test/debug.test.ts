import { describe, it } from 'vitest'
import { parse } from '../src/parser/url'
import { printCompact } from '../src/printer'
import { stripSpans } from './helpers/stripSpans'

describe('Debug round-trip issues', () => {
  it('Orders(1) - debug', () => {
    const fixture = 'Orders(1)'
    const original = parse(fixture)
    console.log('\n=== ORIGINAL ===')
    console.log('Diagnostics:', original.diagnostics)
    console.log('AST:', JSON.stringify(stripSpans(original.ast), null, 2))

    const printed = printCompact(original.ast)
    console.log('\n=== PRINTED ===')
    console.log('Compact:', printed)

    const reparsed = parse(printed)
    console.log('\n=== REPARSED ===')
    console.log('Diagnostics:', reparsed.diagnostics)
    console.log('AST:', JSON.stringify(stripSpans(reparsed.ast), null, 2))

    console.log('\n=== DIFF ===')
    const origStr = JSON.stringify(stripSpans(original.ast))
    const repStr = JSON.stringify(stripSpans(reparsed.ast))
    console.log('Same?', origStr === repStr)
    if (origStr !== repStr) {
      console.log('Original:', origStr.substring(0, 200))
      console.log('Reparsed:', repStr.substring(0, 200))
    }
  })
})
