import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const appTheme = defineConfig({
  globalCss: {
    '::selection': {
      bg: 'purple.muted',
      color: 'fg',
    },
  },
  theme: {
    semanticTokens: {
      colors: {
        bg: {
          DEFAULT: { value: { _light: '#ffffff', _dark: '#13111a' } },
          subtle: { value: { _light: '#f8f6fc', _dark: '#0f0d15' } },
          muted: { value: { _light: '#f0ecf7', _dark: '#1d1926' } },
          emphasized: { value: { _light: '#e5deef', _dark: '#2b2538' } },
          panel: { value: { _light: '#ffffff', _dark: '#17131f' } },
        },
        fg: {
          DEFAULT: { value: { _light: '#201b29', _dark: '#f5f3fa' } },
          muted: { value: { _light: '#665f70', _dark: '#aaa4b5' } },
          subtle: { value: { _light: '#8a8294', _dark: '#827b8f' } },
        },
        border: {
          DEFAULT: { value: { _light: '#e4deeb', _dark: '#2f293b' } },
          muted: { value: { _light: '#eeeaf3', _dark: '#241f2e' } },
          emphasized: { value: { _light: '#d1c7dd', _dark: '#453b57' } },
        },
      },
    },
  },
})

export const appSystem = createSystem(defaultConfig, appTheme)
