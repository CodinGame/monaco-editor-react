import { loadLanguage, monaco, updateKeybindings, updateUserConfiguration } from '@codingame/monaco-editor-wrapper'
import { IEditorOptions, IResolvedTextEditorModel } from '@codingame/monaco-vscode-editor-service-override'
import { IReference } from 'vscode/monaco'
import { useThemeColor, useUserConfiguration } from './hooks'
import MonacoEditor, { MonacoEditorProps } from './MonacoEditor'

export default MonacoEditor
export {
  monaco,
  useThemeColor,
  useUserConfiguration,
  updateKeybindings,
  updateUserConfiguration,
  loadLanguage
}
export type {
  MonacoEditorProps,
  IReference,
  IEditorOptions,
  IResolvedTextEditorModel
}
