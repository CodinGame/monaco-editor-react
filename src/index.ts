import { loadLanguage, monaco, updateKeybindings, updateUserConfiguration } from '@codingame/monaco-editor-wrapper'
import { useThemeColors, useUserConfiguration } from './hooks'
import MonacoEditor, { MonacoEditorProps } from './MonacoEditor'

export default MonacoEditor
export {
  monaco,
  useThemeColors,
  useUserConfiguration,
  updateKeybindings,
  updateUserConfiguration,
  loadLanguage
}
export type {
  MonacoEditorProps
}
