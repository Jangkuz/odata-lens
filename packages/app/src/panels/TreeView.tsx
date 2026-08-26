import React, { useState } from 'react'
import type { ODataUrl } from '../../../core/src/ast'
import '../styles/TreeView.css'

export interface TreeViewProps {
  ast: ODataUrl | null
  onNodeHover?: (span: { start: number; end: number } | null) => void
}

export function TreeView({ ast, onNodeHover }: TreeViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['root']))

  if (!ast) {
    return <div className="tree-view"><p className="tree-placeholder">Parse a query to see the AST</p></div>
  }

  const toggleNode = (id: string) => {
    const next = new Set(expanded)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setExpanded(next)
  }

  return (
    <div className="tree-view">
      <div className="tree-node">
        <div className="tree-node-header" onClick={() => toggleNode('root')}>
          <span className="tree-toggle">{expanded.has('root') ? '▼' : '▶'}</span>
          <span className="tree-kind">ODataUrl</span>
        </div>
        {expanded.has('root') && (
          <div className="tree-node-children">
            {ast.serviceRoot && (
              <div className="tree-node">
                <div className="tree-node-header">
                  <span className="tree-kind">serviceRoot</span>
                  <span className="tree-value">{ast.serviceRoot}</span>
                </div>
              </div>
            )}

            {ast.path && (
              <div className="tree-node">
                <div className="tree-node-header" onClick={() => toggleNode('path')}>
                  <span className="tree-toggle">{expanded.has('path') ? '▼' : '▶'}</span>
                  <span className="tree-kind">path</span>
                  <span className="tree-count">({ast.path.segments.length})</span>
                </div>
                {expanded.has('path') && (
                  <div className="tree-node-children">
                    {ast.path.segments.map((seg, i) => (
                      <div key={i} className="tree-node">
                        <div className="tree-node-header">
                          <span className="tree-kind">{seg.kind}</span>
                          {seg.kind === 'EntitySet' && <span className="tree-value">{(seg as any).name}</span>}
                          {seg.kind === 'Property' && <span className="tree-value">{(seg as any).name}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {ast.options && ast.options.length > 0 && (
              <div className="tree-node">
                <div className="tree-node-header" onClick={() => toggleNode('options')}>
                  <span className="tree-toggle">{expanded.has('options') ? '▼' : '▶'}</span>
                  <span className="tree-kind">options</span>
                  <span className="tree-count">({ast.options.length})</span>
                </div>
                {expanded.has('options') && (
                  <div className="tree-node-children">
                    {ast.options.map((opt, i) => (
                      <div key={i} className="tree-node">
                        <div className="tree-node-header">
                          <span className="tree-kind">{opt.kind}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
