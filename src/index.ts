import { loadLanguage, monaco, updateKeybindings, updateUserConfiguration } from '@codingame/monaco-editor-wrapper'
import { useThemeData, useUserConfiguration } from './hooks'
import MonacoEditor, { MonacoEditorProps } from './MonacoEditor'

export default MonacoEditor
export {
  monaco,
  useThemeData,
  useUserConfiguration,
  updateKeybindings,
  updateUserConfiguration,
  loadLanguage
}
export type {
  MonacoEditorProps
}
