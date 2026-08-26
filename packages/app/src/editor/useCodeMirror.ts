import { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { indentOnInput } from '@codemirror/language'
import { defaultKeymap } from '@codemirror/commands'
import { keymap } from '@codemirror/view'

export interface CodeMirrorOptions {
  initialValue?: string
  onChange?: (text: string) => void
  readOnly?: boolean
  theme?: 'light' | 'dark'
}

/**
 * Mount CodeMirror 6 editor in a div.
 * Returns [ref, editor] where ref is the mount point.
 */
export function useCodeMirror(options: CodeMirrorOptions = {}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<EditorView | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const state = EditorState.create({
      doc: options.initialValue || '',
      extensions: [
        indentOnInput(),
        keymap.of(defaultKeymap),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && options.onChange) {
            options.onChange(update.state.doc.toString())
          }
        }),
        EditorView.editable.of(!options.readOnly),
      ],
    })

    const editor = new EditorView({
      state,
      parent: containerRef.current,
    })

    editorRef.current = editor

    return () => {
      editor.destroy()
    }
  }, [])

  // Update theme
  useEffect(() => {
    if (!editorRef.current) return
    const isDark = options.theme === 'dark'
    editorRef.current.dom.style.colorScheme = isDark ? 'dark' : 'light'
  }, [options.theme])

  return [containerRef, editorRef] as const
}
