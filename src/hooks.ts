import { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react'
import deepEqual from 'deep-equal'
import { getConfiguration, onConfigurationChanged, monaco } from '@codingame/monaco-editor-wrapper'
import { StandaloneServices, IThemeService } from 'vscode/services'

function getCurrentThemeColor (color: string): string | undefined {
  const themeService = StandaloneServices.get(IThemeService)
  return themeService.getColorTheme().getColor(color)?.toString()
}

export function useThemeColors (colors: string[]): (string | undefined)[] {
  const [colorValues, setColorValues] = useState(colors.map(getCurrentThemeColor))
  useEffect(() => {
    const disposable = StandaloneServices.get(IThemeService).onDidColorThemeChange(() => {
      setColorValues(colors.map(getCurrentThemeColor))
    })
    // Since useEffect is asynchronous, the theme may have changed between the initialization of state and now
    // Let's update the state just in case
    setColorValues(colors.map(getCurrentThemeColor))
    return () => {
      disposable.dispose()
    }
  }, [colors])

  return colorValues
}

export function useUserConfiguration (programmingLanguageId?: string): Partial<monaco.editor.IEditorOptions> {
  const [userConfiguration, setUserConfiguration] = useState(() => getConfiguration()!)
  useEffect(() => {
    const updateOptions = () => {
      setUserConfiguration(getConfiguration(programmingLanguageId)!)
    }
    const configurationChangeDisposable = onConfigurationChanged(updateOptions)
    return () => {
      configurationChangeDisposable.dispose()
    }
  }, [programmingLanguageId])
  return userConfiguration
}

export function useLastValueRef<T> (value: T): MutableRefObject<T> {
  const ref = useRef<T>(value)
  ref.current = value
  return ref
}

export function useLastVersion<P extends unknown[], R> (func: (...args: P) => R): (...args: P) => R {
  const ref = useRef<(...args: P) => R>(func)
  useEffect(() => {
    ref.current = func
  }, [func])
  return useCallback((...args: P) => {
    return ref.current(...args)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

export function usePrevious<T> (value: T): T | undefined {
  const ref = useRef<T>()
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref.current
}

export function useDeepMemo<T, D extends unknown[]> (memoFn: () => T, deps: D, isEqual: (a: D, b: D) => boolean = deepEqual): T {
  const ref = useRef<{ deps: D, value: T }>()
  if (ref.current == null || !isEqual(deps, ref.current.deps)) {
    ref.current = { deps, value: memoFn() }
  }

  return ref.current.value
}
