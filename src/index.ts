import { loadLanguage, monaco, updateKeybindings, updateUserConfiguration } from '@codingame/monaco-editor-wrapper'
import { useColorTheme, useUserConfiguration } from './hooks'
import MonacoEditor, { MonacoEditorProps } from './MonacoEditor'

export default MonacoEditor
export {
  monaco,
  useColorTheme,
  useUserConfiguration,
  updateKeybindings,
  updateUserConfiguration,
  loadLanguage
}
export type {
  MonacoEditorProps
}
