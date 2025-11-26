import { useEffect, useMemo, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Theme, ThemePanel, useThemeContext, type ThemeProps } from '@radix-ui/themes'

import { useSiteContent } from './hooks/useSiteContent'
import { uiCopy, type Language } from './i18n/uiCopy'
import AdminPage from './pages/Admin'
import LandingPage from './pages/Landing'

import '@radix-ui/themes/styles.css'
import './App.css'

type Appearance = 'light' | 'dark'
type AccentColor = NonNullable<ThemeProps['accentColor']>
type GrayColor = NonNullable<ThemeProps['grayColor']>
type PanelBackground = NonNullable<ThemeProps['panelBackground']>
type Radius = NonNullable<ThemeProps['radius']>
type Scaling = NonNullable<ThemeProps['scaling']>

type ThemeState = {
  appearance: Appearance
  accentColor: AccentColor
  grayColor: GrayColor
  panelBackground: PanelBackground
  radius: Radius
  scaling: Scaling
}

const THEME_KEY = 'denuo-theme'
const LANGUAGE_KEY = 'denuo-language'

function ThemeStateSync({ onChange }: { onChange: (value: ThemeState) => void }) {
  const { appearance, accentColor, grayColor, panelBackground, radius, scaling } = useThemeContext()

  useEffect(() => {
    if (appearance === 'light' || appearance === 'dark') {
      onChange({
        appearance,
        accentColor,
        grayColor,
        panelBackground,
        radius,
        scaling,
      })
    }
  }, [appearance, accentColor, grayColor, panelBackground, radius, scaling, onChange])

  return null
}

function App() {
  const { content, loading, error, saveContent } = useSiteContent()
  const [themeState, setThemeState] = useState<ThemeState>(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const defaultAppearance: Appearance = prefersDark ? 'dark' : 'light'
    const stored = localStorage.getItem(THEME_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<ThemeState>
        return {
          appearance: parsed.appearance === 'light' || parsed.appearance === 'dark' ? parsed.appearance : defaultAppearance,
          accentColor: (parsed.accentColor as AccentColor) || 'jade',
          grayColor: (parsed.grayColor as GrayColor) || 'auto',
          panelBackground: (parsed.panelBackground as PanelBackground) || 'translucent',
          radius: (parsed.radius as Radius) || 'large',
          scaling: (parsed.scaling as Scaling) || '100%',
        }
      } catch (err) {
        console.warn('Unable to read saved theme; using defaults.', err)
      }
    }
    return {
      appearance: defaultAppearance,
      accentColor: 'jade',
      grayColor: 'auto',
      panelBackground: 'translucent',
      radius: 'large',
      scaling: '100%',
    }
  })
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem(LANGUAGE_KEY) as Language | null
    return stored === 'ja' ? 'ja' : 'en'
  })

  useEffect(() => {
    localStorage.setItem(THEME_KEY, JSON.stringify(themeState))
    document.documentElement.setAttribute('data-appearance', themeState.appearance)
  }, [themeState])

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language)
  }, [language])

  const handleThemeContextChange = (next: ThemeState) => {
    setThemeState((prev) => {
      if (
        prev.appearance === next.appearance &&
        prev.accentColor === next.accentColor &&
        prev.grayColor === next.grayColor &&
        prev.panelBackground === next.panelBackground &&
        prev.radius === next.radius &&
        prev.scaling === next.scaling
      ) {
        return prev
      }
      return next
    })
  }

  const openThemePanel = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }))
  }
  const toggleLanguage = () => setLanguage((prev) => (prev === 'en' ? 'ja' : 'en'))

  const copy = useMemo(() => uiCopy[language], [language])

  return (
    <Theme
      className="app-shell"
      appearance={themeState.appearance}
      accentColor={themeState.accentColor}
      grayColor={themeState.grayColor}
      panelBackground={themeState.panelBackground}
      radius={themeState.radius}
      scaling={themeState.scaling}
    >
      <ThemePanel defaultOpen={false} />
      <ThemeStateSync onChange={handleThemeContextChange} />
      <Routes>
        <Route
          path="/"
          element={
            <LandingPage
              content={content}
              loading={loading}
              error={error}
              onOpenThemePanel={openThemePanel}
              language={language}
              onToggleLanguage={toggleLanguage}
              copy={copy}
            />
          }
        />
        <Route
          path="/admin"
          element={
            <AdminPage
              content={content}
              onSave={saveContent}
              onOpenThemePanel={openThemePanel}
              language={language}
              onToggleLanguage={toggleLanguage}
              copy={copy}
            />
          }
        />
      </Routes>
    </Theme>
  )
}

export default App
