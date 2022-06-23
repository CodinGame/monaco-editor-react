module.exports = {
  env: {
    browser: true,
    es6: true
  },
  extends: [
    '@codingame', 'standard-jsx'
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: [
    'react',
    'react-hooks'
  ],
  rules: {
    'react-hooks/exhaustive-deps': 'error',
    'react-hooks/rules-of-hooks': 'error'
  }
}
