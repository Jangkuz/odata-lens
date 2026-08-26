import { useState, useCallback, useEffect } from 'react'
import { parse, printCompact, printExpanded, type ParseResult } from '../../../core/src/index'

export interface QueryState {
  text: string
  compact: string
  expanded: string
  parseResult: ParseResult | null
  hasErrors: boolean
}

export function useQueryState(initialText: string = ''): [QueryState, (text: string) => void] {
  const [text, setText] = useState(initialText)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)

  // Parse on text change (debounced via effect)
  useEffect(() => {
    const timer = setTimeout(() => {
      const result = parse(text)
      setParseResult(result)
    }, 300)
    return () => clearTimeout(timer)
  }, [text])

  const compact = parseResult ? printCompact(parseResult.ast) : ''
  const expanded = parseResult ? printExpanded(parseResult.ast) : ''
  const hasErrors = parseResult ? parseResult.diagnostics.some((d: any) => d.severity === 'error') : false

  return [
    { text, compact, expanded, parseResult, hasErrors },
    setText,
  ]
}
