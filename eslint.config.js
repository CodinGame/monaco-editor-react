import eslint from '@eslint/js'
import tsEslint from 'typescript-eslint'
import eslintPluginReact from 'eslint-plugin-react'
import eslintPluginReactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default tsEslint.config(
  eslint.configs.recommended,
  tsEslint.configs.recommended,
  eslintPluginReact.configs.flat.recommended,
  eslintPluginReact.configs.flat?.['jsx-runtime'],
  {
    rules: { '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }] },
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  },

  // TODO: Simplify when https://github.com/facebook/react/issues/28313 is resolved
  {
    plugins: {
      'react-hooks': eslintPluginReactHooks
    },
    rules: { ...eslintPluginReactHooks.configs.recommended.rules }
  }
)
