import React from 'react'
import { summarizeQuery, explain } from '../../../core/src/explain'
import type { ParseResult } from '../../../core/src/ast'
import '../styles/ExplainPanel.css'

export interface ExplainPanelProps {
  parseResult: ParseResult | null
}

export function ExplainPanel({ parseResult }: ExplainPanelProps) {
  if (!parseResult) {
    return (
      <div className="explain-panel">
        <p className="explain-placeholder">Parse a query to see the explanation</p>
      </div>
    )
  }

  const summary = summarizeQuery(parseResult.ast)
  const explanation = explain(parseResult.ast)

  return (
    <div className="explain-panel">
      <div className="explain-section">
        <h3 className="explain-title">Query Summary</h3>
        <div className="explain-summary">{summary}</div>
      </div>

      {explanation && (
        <div className="explain-section">
          <h3 className="explain-title">Breakdown</h3>
          <div className="explain-text">
            {explanation.split('\n').map((line, i) => (
              <div key={i} className="explain-line">
                {line}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
