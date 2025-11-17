import { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react'
import deepEqual from 'deep-equal'
import { getConfiguration, onConfigurationChanged, monaco } from '@codingame/monaco-editor-wrapper'
import { StandaloneServices, IThemeService } from '@codingame/monaco-vscode-api/services'

function getCurrentThemeColor(color: string): string | undefined {
  const themeService = StandaloneServices.get(IThemeService)
  return themeService.getColorTheme().getColor(color)?.toString()
}

export function useThemeColor(color: string): string | undefined {
  const [colorValue, setColorValue] = useState(getCurrentThemeColor(color))
  useEffect(() => {
    const disposable = StandaloneServices.get(IThemeService).onDidColorThemeChange(() => {
      setColorValue(getCurrentThemeColor(color))
    })
    // Since useEffect is asynchronous, the theme may have changed between the initialization of state and now
    // Let's update the state just in case
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setColorValue(getCurrentThemeColor(color))
    return () => {
      disposable.dispose()
    }
  }, [color])

  return colorValue
}

export function useUserConfiguration(
  programmingLanguageId?: string
): Partial<monaco.editor.IEditorOptions> {
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

export function useLastValueRef<T>(value: T): MutableRefObject<T> {
  const ref = useRef<T>(value)
  // eslint-disable-next-line react-hooks/refs
  ref.current = value
  return ref
}

export function useLastVersion<P extends unknown[], R>(func: (...args: P) => R): (...args: P) => R {
  const ref = useRef<(...args: P) => R>(func)
  useEffect(() => {
    ref.current = func
  }, [func])
  return useCallback((...args: P) => {
    return ref.current(...args)
  }, [])
}

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>(undefined)
  useEffect(() => {
    ref.current = value
  }, [value])
  // eslint-disable-next-line react-hooks/refs
  return ref.current
}

export function useDeepMemo<T, D extends unknown[]>(
  memoFn: () => T,
  deps: D,
  isEqual: (a: D, b: D) => boolean = deepEqual
): T {
  const ref = useRef<{ deps: D; value: T }>(undefined)
  // eslint-disable-next-line react-hooks/refs
  if (ref.current == null || !isEqual(deps, ref.current.deps)) {
    ref.current = { deps, value: memoFn() }
  }

  // eslint-disable-next-line react-hooks/refs
  return ref.current.value
}
