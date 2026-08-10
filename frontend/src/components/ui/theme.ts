import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const appTheme = defineConfig({
  globalCss: {
    '::selection': {
      bg: 'purple.muted',
      color: 'fg',
    },
  },
  theme: {
    tokens: {
      fonts: {
        body: { value: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
        heading: { value: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
      },
      radii: {
        card: { value: '14px' },
      },
      shadows: {
        card: { value: '0 1px 2px rgba(17, 14, 25, 0.04), 0 8px 24px rgba(17, 14, 25, 0.04)' },
      },
    },
    semanticTokens: {
      colors: {
        bg: {
          DEFAULT: { value: { _light: '#ffffff', _dark: '#181720' } },
          subtle: { value: { _light: '#f7f8fc', _dark: '#0d0d12' } },
          muted: { value: { _light: '#f0f1f6', _dark: '#121119' } },
          emphasized: { value: { _light: '#e9e8ef', _dark: '#302d39' } },
          panel: { value: { _light: '#ffffff', _dark: '#181720' } },
          elevated: { value: { _light: '#ffffff', _dark: '#201e29' } },
        },
        fg: {
          DEFAULT: { value: { _light: '#17151f', _dark: '#f5f3f8' } },
          muted: { value: { _light: '#686474', _dark: '#b3afbc' } },
          subtle: { value: { _light: '#8c8798', _dark: '#85808d' } },
        },
        border: {
          DEFAULT: { value: { _light: '#e5e3ea', _dark: '#302d39' } },
          muted: { value: { _light: '#efedf2', _dark: '#24222c' } },
          emphasized: { value: { _light: '#cbc7d2', _dark: '#494552' } },
        },
      },
    },
  },
})

export const appSystem = createSystem(defaultConfig, appTheme)
