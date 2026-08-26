import { useEffect, useRef, useState } from 'react'
import './App.css'
import { Toolbar } from './components/Toolbar'
import { useQueryState } from './state/useQueryState'
import { getHashQuery, setHashQuery, onHashChange } from './state/hashState'
import { useCodeMirror } from './editor/useCodeMirror'

export default function App() {
  const [isDark, setIsDark] = useState(() => {
    // Check user preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const [query, setQuery] = useQueryState(getHashQuery())
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const [outputMode, setOutputMode] = useState<'expanded' | 'compact'>('expanded')

  // Load query from hash on mount and when hash changes
  useEffect(() => {
    const unsubscribe = onHashChange((text) => {
      if (text) {
        setQuery(text)
      }
    })
    return unsubscribe
  }, [setQuery])

  // Save query to hash when it changes
  useEffect(() => {
    if (query.text) {
      setHashQuery(query.text)
    }
  }, [query.text])

  // Apply theme to document
  useEffect(() => {
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
  }, [isDark])

  const handleFormat = () => {
    setOutputMode('expanded')
    if (editorContainerRef.current) {
      editorContainerRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleCollapse = () => {
    setOutputMode('compact')
  }

  const handleThemeToggle = () => {
    setIsDark(!isDark)
  }

  return (
    <div className={`app ${isDark ? 'dark' : 'light'}`}>
      <header className="app-header">
        <div className="app-header-content">
          <h1>OData Lens</h1>
          <p>Format, explain, and debug OData V4 queries</p>
        </div>
      </header>

      <Toolbar
        onFormat={handleFormat}
        onCollapse={handleCollapse}
        compactUrl={query.compact}
        isDark={isDark}
        onThemeToggle={handleThemeToggle}
        hasErrors={query.hasErrors}
      />

      <main className="app-main">
        <div className="editor-pane">
          <div className="editor-label">OData Query</div>
          <textarea
            className="editor-textarea"
            value={query.text}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Paste an OData V4 query here..."
            spellCheck="false"
          />
        </div>

        <div className="output-pane">
          <div className="output-label">
            {outputMode === 'expanded' ? '📋 Formatted' : '🔗 URL'}
          </div>
          <div className="output-content">
            {outputMode === 'expanded' ? (
              <pre className="output-text">{query.expanded || 'Paste a query to format it...'}</pre>
            ) : (
              <div className="compact-output">
                <code className="output-text">{query.compact || 'Paste a query to collapse it...'}</code>
              </div>
            )}
          </div>

          {query.parseResult?.diagnostics && query.parseResult.diagnostics.length > 0 && (
            <div className="diagnostics-panel">
              <div className="diagnostics-label">Issues ({query.parseResult.diagnostics.length})</div>
              <ul className="diagnostics-list">
                {query.parseResult.diagnostics.map((diag: any, i: number) => (
                  <li key={i} className={`diagnostic diagnostic-${diag.severity}`}>
                    <span className="diagnostic-code">{diag.code}</span>
                    <span className="diagnostic-message">{diag.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
