import React, { ForwardedRef, forwardRef, ReactElement, useEffect, useMemo, useRef, useState } from 'react'
import debounce from 'lodash.debounce'
import { monaco, createEditor, getMonacoLanguage, updateEditorKeybindings } from '@codingame/monaco-editor-wrapper'
import { useDeepMemo, useLastValueRef, useLastVersion, useThemeData, useUserConfiguration } from './hooks'
import './style'

const STATUS_BAR_HEIGHT = 20

function fixCode (code: string): string {
  // If monaco editor is provided code using \r\n
  // The editor seems to flicker and the language server is spammed by document/didChange events
  // TODO investigate me?
  return code.replace(/\r\n?/g, '\n')
}

const viewStates = new Map<string, monaco.editor.ICodeEditorViewState>()
export function defaultRestoreViewState (editor: monaco.editor.IStandaloneCodeEditor, model: monaco.editor.ITextModel): void {
  const viewState = viewStates.get(model.uri.toString())
  if (viewState != null) {
    editor.restoreViewState(viewState)
  }
}
export function defaultSaveViewState (editor: monaco.editor.IStandaloneCodeEditor, model: monaco.editor.ITextModel): void {
  const viewState = editor.saveViewState()
  const key = model.uri.toString()
  if (viewState != null) {
    viewStates.set(key, viewState)
  } else {
    viewStates.delete(key)
  }
}

export interface MonacoEditorProps {
  /**
   * - auto means the editor will grow or shring base on the content
   * - Any other value is just used as is
   *
   * default: 100%
   */
  height?: 'auto' | string | number
  /**
   * Max height when in height: auto mode
   */
  maxHeight?: number
  /**
   * Max height when in height: auto mode
   */
  minHeight?: number
  value?: string
  programmingLanguage?: string
  fileUri?: string
  options?: monaco.editor.IStandaloneEditorConstructionOptions
  overrideServices?: monaco.editor.IEditorOverrideServices
  onChange?: (value: string, event: monaco.editor.IModelContentChangedEvent) => void
  markers?: monaco.editor.IMarkerData[]
  keyBindingsMode?: 'classic' | 'vim' | 'emacs'
  keyBindings?: monaco.extra.IUserFriendlyKeybinding[]
  /**
   * Called when the editor will switch to another model
   *
   * Default to store is into a Map<fileUri, viewState>
   */
  saveViewState?: (editor: monaco.editor.IStandaloneCodeEditor, model: monaco.editor.ITextModel) => void
  /**
   * Called when the editor just switch to a model
   *
   * Default to using the Map<fileUri, viewState>
   */
  restoreViewState?: (editor: monaco.editor.IStandaloneCodeEditor, model: monaco.editor.ITextModel) => void
}

function MonacoEditor ({
  height: requestedHeight = '100%',
  maxHeight,
  minHeight = 350,
  fileUri,
  programmingLanguage,
  value,
  options,
  overrideServices,
  onChange,
  keyBindings,
  keyBindingsMode = 'classic',
  markers,
  saveViewState = defaultSaveViewState,
  restoreViewState = defaultRestoreViewState
}: MonacoEditorProps, ref: ForwardedRef<monaco.editor.IStandaloneCodeEditor>): ReactElement {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>()
  const modelRef = useRef<monaco.editor.ITextModel>()
  const preventTriggerChangeEventRef = useRef<boolean>(false)

  const [height, setHeight] = useState<number | string>(requestedHeight !== 'auto' ? requestedHeight : 50)
  const themeData = useThemeData()

  const containerRef = useRef<HTMLDivElement>(null)
  const statusBarRef = useRef<HTMLDivElement>(null)
  const monacoLanguage = useMemo(() => programmingLanguage != null ? getMonacoLanguage(programmingLanguage) : undefined, [programmingLanguage])

  const userConfiguration = useUserConfiguration(monacoLanguage)
  const memoizedOptions = useDeepMemo(() => options, [options])
  const allOptions = useMemo(() => {
    return {
      ...userConfiguration,
      ...memoizedOptions,
      automaticLayout: true
    }
  }, [memoizedOptions, userConfiguration])

  const modelUri = useMemo(() => {
    return fileUri != null ? monaco.Uri.parse(fileUri) : undefined
  }, [fileUri])

  const fixedCode = useMemo(() => value != null ? fixCode(value) : null, [value])

  const valueRef = useLastValueRef(fixedCode)
  const lastSaveViewState = useLastVersion(saveViewState)
  const lastRestoreViewState = useLastVersion(restoreViewState)

  // Create/Update model
  useEffect(() => {
    const value = valueRef.current
    if (modelUri != null || value != null) {
      const existingModel = modelUri != null ? monaco.editor.getModel(modelUri) : null
      const model = existingModel ?? monaco.editor.createModel(value!, monacoLanguage, modelUri)
      if (monacoLanguage != null && model.getLanguageId() !== monacoLanguage) {
        monaco.editor.setModelLanguage(model, monacoLanguage)
      }
      modelRef.current = model
      editorRef.current?.setModel(model)
      if (editorRef.current != null) {
        lastRestoreViewState(editorRef.current, model)
      }
      return () => {
        lastSaveViewState(editorRef.current!, model)
        if (existingModel == null) {
          // Only dispose if we are the one that created the model
          model.dispose()
        }
      }
    } else {
      modelRef.current = undefined
      editorRef.current?.setModel(null)
    }
  }, [monacoLanguage, modelUri, valueRef, lastSaveViewState, lastRestoreViewState])

  // Create editor
  useEffect(() => {
    const containerElement = containerRef.current
    if (containerElement != null) {
      const model = modelRef.current
      const editor = createEditor(
        containerElement,
        {
          model,
          automaticLayout: true
        },
        overrideServices
      )
      editorRef.current = editor
      if (model != null) {
        lastRestoreViewState(editor, model)
      }

      if (ref != null) {
        if (typeof ref === 'function') {
          ref(editor)
        } else {
          ref.current = editor
        }
      }

      return () => {
        editor.dispose()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrideServices])

  // Update value
  useEffect(() => {
    if (fixedCode != null) {
      const model = modelRef.current!
      const editor = editorRef.current!
      if (fixedCode !== model.getValue()) {
        preventTriggerChangeEventRef.current = true
        console.debug('Replacing whole editor content')
        if (editor.getOption(monaco.editor.EditorOption.readOnly)) {
          model.setValue(fixedCode)
        } else {
          editor.pushUndoStop()
          model.pushEditOperations(
            [],
            [{
              range: model.getFullModelRange(),
              text: fixedCode
            }],
            () => null
          )
          editor.pushUndoStop()
        }
        preventTriggerChangeEventRef.current = false
      }
    }
  }, [fixedCode])

  // Update options from props
  useEffect(() => {
    editorRef.current!.updateOptions(allOptions)
  }, [allOptions])

  // Keybindings
  useEffect(() => {
    const editor = editorRef.current!
    const disposable = updateEditorKeybindings(editor, keyBindingsMode, statusBarRef.current!, keyBindings)
    return () => {
      disposable.dispose()
    }
  }, [keyBindings, keyBindingsMode])

  // Update markers
  useEffect(() => {
    const model = modelRef.current
    if (markers != null && model != null) {
      monaco.editor.setModelMarkers(model, 'customMarkers', markers)
      return () => {
        monaco.editor.setModelMarkers(model, 'customMarkers', [])
      }
    }
  }, [markers])

  // Call onChange callback
  useEffect(() => {
    if (onChange != null) {
      const editor = editorRef.current!
      const didChangeModelContentDisposable = editor.onDidChangeModelContent(event => {
        if (!preventTriggerChangeEventRef.current) {
          onChange(editor.getValue(), event)
        }
      })
      return () => {
        didChangeModelContentDisposable.dispose()
      }
    }
  }, [onChange])

  // Compute height
  useEffect(() => {
    if (requestedHeight !== 'auto') {
      setHeight(requestedHeight)
      return
    }
    const editor = editorRef.current!
    const recomputeHeight = () => {
      let height = Math.max(
        minHeight,
        editor.getContentHeight() + STATUS_BAR_HEIGHT
      )
      if (maxHeight != null) {
        height = Math.min(height, maxHeight)
      }
      setHeight(height)
    }
    const onDidContentSizeChangeDisposable = editor.onDidContentSizeChange(debounce(recomputeHeight, 50))
    recomputeHeight()

    return () => {
      onDidContentSizeChangeDisposable.dispose()
    }
  }, [minHeight, maxHeight, requestedHeight])

  const statusBarStyle = useMemo(() => {
    return {
      backgroundColor: themeData?.getColor('statusBar.background')?.toString() ?? '#007ACC',
      color: themeData?.getColor('statusBar.foreground')?.toString() ?? '#FFFFFF',
      borderTop: `1px solid ${themeData?.getColor('statusBar.border')?.toString() ?? '#FFFFFF'}`
    }
  }, [themeData])

  return (
    <div className='react-monaco-editor-react-container' style={{ height }}>
      <div
        className='react-monaco-editor-react-wrapper'
      >
        <div className='react-monaco-editor-react' ref={containerRef} />
        <div
          className='react-monaco-editor-react-status-bar'
          ref={statusBarRef}
          style={statusBarStyle}
        />
      </div>
    </div>
  )
}

export default forwardRef(MonacoEditor)
