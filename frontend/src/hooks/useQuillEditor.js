import { useEffect, useRef, useState } from 'react'
import Quill from 'quill'

/**
 * Quill editor with HTML + revision counter so effects re-run on every edit.
 */
export function useQuillEditor() {
  const editorRef = useRef(null)
  const quillRef = useRef(null)
  const [html, setHtml] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!editorRef.current) return

    if (!quillRef.current) {
      quillRef.current = new Quill(editorRef.current, { theme: 'snow' })
    }

    const quill = quillRef.current

    const onTextChange = () => {
      setHtml(quill.root.innerHTML)
      setRevision((n) => n + 1)
    }

    quill.on('text-change', onTextChange)

    return () => {
      quill.off('text-change', onTextChange)
    }
  }, [])

  const syncFromEditor = () => {
    if (!quillRef.current) return
    setHtml(quillRef.current.root.innerHTML)
    setRevision((n) => n + 1)
  }

  const clearEditor = () => {
    if (!quillRef.current) return
    quillRef.current.setText('')
    syncFromEditor()
  }

  return { editorRef, quillRef, html, revision, syncFromEditor, clearEditor }
}
