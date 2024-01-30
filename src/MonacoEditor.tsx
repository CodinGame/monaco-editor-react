import React, { ForwardedRef, forwardRef, ReactElement, useEffect, useMemo, useRef, useState } from 'react'
import debounce from 'lodash.debounce'
import * as monaco from 'monaco-editor'
import { createEditor, getMonacoLanguage, updateEditorKeybindingsMode, registerEditorOpenHandler, createModelReference } from '@codingame/monaco-editor-wrapper'
import { IEditorOptions, IResolvedTextEditorModel } from '@codingame/monaco-vscode-editor-service-override'
import { IReference, ITextFileEditorModel } from 'vscode/monaco'
import { useDeepMemo, useLastValueRef, useLastVersion, useThemeColor } from './hooks'
import './style'

const STATUS_BAR_HEIGHT = 20

function fixCode (code: string): string {
  // If monaco editor is provided code using \r\n
  // The editor seems to flicker and the language server is spammed by document/didChange events
  // TODO investigate me?
  return code.replace(/\r\n?/g, '\n')
}

type MonacoEditorOption = keyof monaco.editor.IEditorOptions
type KeyBindingsMode = 'classic' | 'vim' | 'emacs'

// Some editor properties are managed directly by monaco-vim / monaco-emacs so we don't want to override them
const keyBindingsManagedOptions: Record<KeyBindingsMode, Set<MonacoEditorOption> | null> = {
  vim: new Set<MonacoEditorOption>(['cursorBlinking', 'cursorWidth']),
  emacs: new Set<MonacoEditorOption>(['cursorBlinking', 'cursorStyle']),
  classic: null
}
function removeKeyBindingsManagedOptions (options: monaco.editor.IEditorOptions, keyBindingsMode: KeyBindingsMode) {
  const managedOptions = keyBindingsManagedOptions[keyBindingsMode]
  if (managedOptions == null) {
    return options
  } else {
    return Object.fromEntries(
      Object.entries(options)
        .filter(([optionId]) => !managedOptions.has(optionId as MonacoEditorOption))
    )
  }
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
  onChange?: (value: string, event: monaco.editor.IModelContentChangedEvent) => void
  markers?: monaco.editor.IMarkerData[]
  keyBindingsMode?: KeyBindingsMode
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
  /**
   * Called when the user do a ctrl+click on a reference to another model
   * The returned editor should already contain the model before this function returns
   *
   * Default is opening a new editor in a popup
   */
  onEditorOpenRequest?: (model: IReference<IResolvedTextEditorModel>, options: IEditorOptions | undefined, source: monaco.editor.ICodeEditor, sideBySide?: boolean) => Promise<monaco.editor.ICodeEditor | null>

  /**
   * if true, the models created by the component will be disposed when they are no longer displayed in the editor
   * if false, the models will be kept and re-used the next time the same uri is provided
   */
  disposeModels?: boolean
}

function MonacoEditor ({
  height: requestedHeight = '100%',
  maxHeight,
  minHeight = 350,
  fileUri,
  programmingLanguage,
  value,
  options,
  onChange,
  keyBindingsMode = 'classic',
  markers,
  saveViewState = defaultSaveViewState,
  restoreViewState = defaultRestoreViewState,
  onEditorOpenRequest
}: MonacoEditorProps, ref: ForwardedRef<monaco.editor.IStandaloneCodeEditor>): ReactElement {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>()
  const modelRef = useRef<monaco.editor.ITextModel>()
  const [modelReady, setModelReady] = useState(false)
  const preventTriggerChangeEventRef = useRef<boolean>(false)

  const [height, setHeight] = useState<number | string>(requestedHeight !== 'auto' ? requestedHeight : 50)
  const statusBarBackground = useThemeColor('statusBar.background')
  const statusBarForeground = useThemeColor('statusBar.foreground')
  const statusBarBorder = useThemeColor('statusBar.border')

  const containerRef = useRef<HTMLDivElement>(null)
  const statusBarRef = useRef<HTMLDivElement>(null)
  const monacoLanguage = useMemo(() => programmingLanguage != null ? getMonacoLanguage(programmingLanguage) : undefined, [programmingLanguage])

  const memoizedOptions = useDeepMemo(() => options, [options])
  const allOptions = useMemo<monaco.editor.IEditorOptions>(() => {
    return removeKeyBindingsManagedOptions({
      ...memoizedOptions
    }, keyBindingsMode)
  }, [memoizedOptions, keyBindingsMode])

  const fixedCode = useMemo(() => value != null ? fixCode(value) : null, [value])

  const valueRef = useLastValueRef(fixedCode)
  const lastSaveViewState = useLastVersion(saveViewState)
  const lastRestoreViewState = useLastVersion(restoreViewState)

  const hasValue = fixedCode != null

  // Create editor
  useEffect(() => {
    const containerElement = containerRef.current
    if (containerElement != null) {
      const editor = createEditor(
        containerElement,
        {
          automaticLayout: true,
          // We need to pass options here for the `scrollbar` options to be used
          ...allOptions,
          // We need to override all IStandaloneEditorConstructionOptions fields to prevent conflicts with proper editor options (especially `language`)
          value: undefined,
          language: undefined,
          theme: undefined,
          autoDetectHighContrast: undefined,
          accessibilityHelpUrl: undefined,
          ariaContainerElement: undefined,
          dimension: undefined,
          overflowWidgetsDomNode: undefined
        }
      )
      editorRef.current = editor

      if (ref != null) {
        if (typeof ref === 'function') {
          ref(editor)
        } else {
          ref.current = editor
        }
      }

      return () => {
        editorRef.current = undefined
        editor.dispose()
      }
    }
    return undefined
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Create/Update model
  useEffect(() => {
    if (fileUri == null && !hasValue) {
      modelRef.current = undefined
      editorRef.current!.setModel(null)
      return
    }
    let cancelled = false
    async function updateModel () {
      modelRef.current = undefined
      editorRef.current!.setModel(null)
      setModelReady(false)

      const value = valueRef.current
      let modelIRef: IReference<ITextFileEditorModel> | undefined
      let model: monaco.editor.ITextModel
      if (fileUri != null) {
        modelIRef = await createModelReference(monaco.Uri.parse(fileUri), value!)
        if (cancelled) {
          modelIRef.dispose()
          return () => {}
        }
        model = modelIRef.object.textEditorModel!
        if (monacoLanguage != null && model.getLanguageId() !== monacoLanguage) {
          monaco.editor.setModelLanguage(model, monacoLanguage)
        }
      } else {
        model = monaco.editor.createModel(value!, monacoLanguage)
      }

      modelRef.current = model
      setModelReady(true)
      editorRef.current!.setModel(model)
      if (editorRef.current != null) {
        lastRestoreViewState(editorRef.current, model)
      }
      return () => {
        if (editorRef.current != null) {
          lastSaveViewState(editorRef.current, model)
        }
        modelRef.current = undefined
      }
    }
    const disposePromise = updateModel()
    return () => {
      cancelled = true
      disposePromise.then(dispose => dispose(), console.error)
    }
  }, [monacoLanguage, fileUri, valueRef, lastSaveViewState, lastRestoreViewState, hasValue])

  // Update value
  useEffect(() => {
    if (modelReady && fixedCode != null) {
      const model = modelRef.current
      const editor = editorRef.current!
      if (model != null && fixedCode !== model.getValue()) {
        preventTriggerChangeEventRef.current = true
        console.debug('Replacing whole editor content')
        editor.pushUndoStop()
        model.setValue(fixedCode)
        editor.pushUndoStop()
        preventTriggerChangeEventRef.current = false
      }
    }
  }, [fixedCode, modelReady])

  // Update options from props
  useEffect(() => {
    editorRef.current!.updateOptions(allOptions)
  }, [allOptions])

  // Keybindings mode
  useEffect(() => {
    const editor = editorRef.current!
    const disposable = updateEditorKeybindingsMode(editor, keyBindingsMode, statusBarRef.current!)
    return () => {
      disposable.dispose()
    }
  }, [keyBindingsMode])

  // Update markers
  useEffect(() => {
    if (!modelReady) {
      return
    }
    const model = modelRef.current
    if (markers != null && model != null) {
      monaco.editor.setModelMarkers(model, 'customMarkers', markers)
      return () => {
        monaco.editor.setModelMarkers(model, 'customMarkers', [])
      }
    }
    return undefined
  }, [markers, modelReady])

  // Call onChange callback
  useEffect(() => {
    if (onChange != null) {
      // Sometimes, monaco calls the didChangeModelContent multiple times in a row
      // (For instance, after an autocomplete with some additionalTextEdits - used by the typescript language server)
      // The onChange prop is very probably used to store the current code in a state somewhere
      // Updating that state 2 times in a row will trigger 2 asynchronous renders
      // The first render will use the state after the first model content change, while the monaco model is already up to date with the last change
      // It will then produce a desync and this component will overwrite the editor content to sync it back
      // Doing so produces at least 2 issues: the cursor is moved to the beginning of the file by monaco and the undo stack is lost
      // So a solution is to debounce the onChange callback so it's called only once in that case
      const debouncedOnChange = debounce(onChange, 0)
      const editor = editorRef.current!
      const didChangeModelContentDisposable = editor.onDidChangeModelContent(event => {
        if (!preventTriggerChangeEventRef.current) {
          debouncedOnChange(editor.getValue(), event)
        }
      })
      return () => {
        didChangeModelContentDisposable.dispose()
      }
    }
    return undefined
  }, [onChange])

  useEffect(() => {
    if (onEditorOpenRequest != null) {
      const disposable = registerEditorOpenHandler(async (model, input, source, sideBySide) => {
        if (source === editorRef.current) {
          return onEditorOpenRequest(model, input, source, sideBySide)
        }
        return null
      })
      return () => {
        disposable.dispose()
      }
    }
    return undefined
  }, [onEditorOpenRequest])

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
      backgroundColor: statusBarBackground ?? '#007ACC',
      color: statusBarForeground ?? '#FFFFFF',
      borderTop: `1px solid ${statusBarBorder ?? '#FFFFFF'}`
    }
  }, [statusBarBackground, statusBarBorder, statusBarForeground])

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
