import {
  loadLanguage,
  monaco,
  updateKeybindings,
  updateUserConfiguration
} from '@codingame/monaco-editor-wrapper'
import {
  IEditorOptions,
  IResolvedTextEditorModel
} from '@codingame/monaco-vscode-editor-service-override'
import type { IReference } from '@codingame/monaco-vscode-api/monaco'
import { useThemeColor, useUserConfiguration } from './hooks.js'
import MonacoEditor, { MonacoEditorProps } from './MonacoEditor.js'

export default MonacoEditor
export {
  monaco,
  useThemeColor,
  useUserConfiguration,
  updateKeybindings,
  updateUserConfiguration,
  loadLanguage
}
export type { MonacoEditorProps, IReference, IEditorOptions, IResolvedTextEditorModel }
