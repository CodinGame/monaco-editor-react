# @codingame/monaco-editor-react &middot; [![monthly downloads](https://img.shields.io/npm/dm/@codingame/monaco-editor-react)](https://www.npmjs.com/package/@codingame/monaco-editor-react) [![npm version](https://img.shields.io/npm/v/@codingame/monaco-editor-react.svg?style=flat)](https://www.npmjs.com/package/@codingame/monaco-editor-react) [![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/codingame/monaco-editor-react/pulls)

## Synopsis

This library uses https://github.com/CodinGame/monaco-editor-wrapper

Please refer to this documentation

### Installation

```bash
npm install @codingame/monaco-editor-react 
```

### Usage

#### Simple usage

Here is an example of a simple integration of `monaco` editor with a `React` project.
You just need to import and render the `Editor` component:

```typescript
import React from "react";
import ReactDOM from "react-dom";

import Editor from "@codingame/monaco-editor-react";

function App() {
  const [value, setValue] = useState('// some comment');
  return (
   <Editor
     height="auto"
     programmingLanguage="javascript"
     value={value}
     onChange={setValue}
   />
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
```

#### Models management

When you render the MonacoEditor component, there is 2 modes for the model management:
- if the model already exists, it will be reused and not disposed at the end
- if the model doesn't exist, it will be created and disposed at the end

This way, the editor is plug-and-play for simple use cases but it allows you to create your models before, use them in the editor and dispose them when you don't need them anymore

### Differences with [monaco-react](https://github.com/suren-atoyan/monaco-react)
- This library outputs some dynamic `import` and rely on webpack to handle them
- The model management is different, either you manage your models by hands or let the editor create and destroy them
- no `onValidate`: can be done directly with monaco.editor.onDidChangeMarkers
- no theme prop: the theme can be changed using `monaco.editor.setTheme`
- To get the editor instance, use `ref` instead of `handleEditorDidMount`
- There is no `useMonaco`, you can just use the exported `monaco`: `import { monaco }, Editor from "@codingame/monaco-editor-react";`









