import { MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as monaco from 'monaco-editor'
import deepEqual from 'deep-equal'
import { getConfiguration, getThemeData, onConfigurationChanged } from '@codingame/monaco-editor-wrapper'

const standaloneThemeService = monaco.editor.StaticServices.standaloneThemeService.get()
export function useThemeData (): monaco.extra.ColorThemeData | null {
  const [themeName, setThemeName] = useState(standaloneThemeService.getColorTheme().themeName)
  const updateTheme = (theme: monaco.editor.IColorTheme) => {
    setThemeName((theme as monaco.editor.IStandaloneTheme).themeName)
  }
  useEffect(() => {
    const disposable = standaloneThemeService.onDidColorThemeChange(updateTheme)
    updateTheme(standaloneThemeService.getColorTheme())
    return () => {
      disposable.dispose()
    }
  }, [])

  return useMemo(() => {
    return getThemeData(themeName)
  }, [themeName])
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
