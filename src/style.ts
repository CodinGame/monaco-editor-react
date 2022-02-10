export function addStyle (styleString: string): void {
  const style = document.createElement('style')
  style.textContent = styleString
  document.head.append(style)
}

addStyle(`
.react-monaco-editor-react-container {
  position: relative;
  width: 100%;
  font-size: 12px;
}

.react-monaco-editor-react-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.react-monaco-editor-react {
  flex: 1;
  min-height: 0;
}

.react-monaco-editor-react h1, .react-monaco-editor-react h2, .react-monaco-editor-react h3 {
  /* For tooltips */
  font-size: initial;
  font-weight: initial;
}

.react-monaco-editor-react-status-bar {
  flex: none;
  display: none;
  padding: 3px 8px 0px 8px;
  font-size: 13px;
  font-family: "Courier New", Courier, monospace;
  font-weight: bold;
}

.react-monaco-editor-react-status-bar input {
  all: initial;
  color: yellow;
  outline: none;
  border: none;
  background: transparent;
}
`)
