import { useTheme } from 'next-themes'
import * as React from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

/**
 * 3-state 다크모드 hook (system / light / dark).
 *
 * - `preference`: 사용자가 선택한 값 (localStorage에 저장됨, system 포함)
 * - `isDarkMode`: 실제 적용된 테마가 dark인지 (system 모드일 땐 OS 설정 기반)
 * - `setTheme`: 명시적으로 테마 변경
 * - `cycleTheme`: light → dark → system → light 순환
 *
 * SSR/CSR mismatch 방지를 위해 mount 전에는 isDarkMode = false로 fallback.
 *
 * @see analysis/recommendations.md (다크모드 요구사항)
 */
export function useDarkMode() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [hasMounted, setHasMounted] = React.useState(false)

  React.useEffect(() => {
    setHasMounted(true)
  }, [])

  const preference = (theme ?? 'system') as ThemePreference
  const isDarkMode = hasMounted ? resolvedTheme === 'dark' : false

  const cycleTheme = React.useCallback(() => {
    if (preference === 'light') setTheme('dark')
    else if (preference === 'dark') setTheme('system')
    else setTheme('light')
  }, [preference, setTheme])

  return {
    preference,
    isDarkMode,
    hasMounted,
    setTheme: setTheme as (t: ThemePreference) => void,
    cycleTheme,
    // backward-compat alias for existing call sites
    toggleDarkMode: cycleTheme
  }
}
