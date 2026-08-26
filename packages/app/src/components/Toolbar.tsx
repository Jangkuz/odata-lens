import React, { useState } from 'react'
import '../styles/Toolbar.css'

export interface ToolbarProps {
  onFormat: () => void
  onCollapse: () => void
  compactUrl: string
  isDark: boolean
  onThemeToggle: () => void
  hasErrors: boolean
}

export function Toolbar({
  onFormat,
  onCollapse,
  compactUrl,
  isDark,
  onThemeToggle,
  hasErrors,
}: ToolbarProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(compactUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <button onClick={onFormat} className="toolbar-btn" title="Format query with line breaks">
          📐 Format
        </button>
        <button onClick={onCollapse} className="toolbar-btn" title="Collapse to single-line URL">
          ⬇ Collapse
        </button>
        <button
          onClick={handleCopy}
          className="toolbar-btn toolbar-btn-copy"
          title="Copy to clipboard"
          disabled={!compactUrl || hasErrors}
        >
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
      </div>

      <div className="toolbar-section">
        <button
          onClick={onThemeToggle}
          className="toolbar-btn toolbar-btn-theme"
          title="Toggle dark/light theme"
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  )
}
