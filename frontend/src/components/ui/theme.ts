import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'
import { palette } from './palette'

const appTheme = defineConfig({
  globalCss: {
    '::selection': {
      bg: 'brand.muted',
      color: 'fg',
    },
    ':focus-visible': {
      outlineColor: 'brand.focusRing',
    },
  },
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: palette.brand[50] },
          100: { value: palette.brand[100] },
          200: { value: palette.brand[200] },
          300: { value: palette.brand[300] },
          400: { value: palette.brand[400] },
          500: { value: palette.brand[500] },
          600: { value: palette.brand[600] },
          700: { value: palette.brand[700] },
          800: { value: palette.brand[800] },
          900: { value: palette.brand[900] },
          950: { value: palette.brand[950] },
        },
      },
      fonts: {
        body: { value: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
        heading: { value: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
      },
      radii: {
        card: { value: '14px' },
      },
      shadows: {
        card: { value: `0 1px 2px ${palette.alpha.cardShadow}, 0 8px 24px ${palette.alpha.cardShadow}` },
      },
    },
    semanticTokens: {
      colors: {
        brand: {
          contrast: { value: palette.light.panel },
          fg: { value: { _light: '{colors.brand.700}', _dark: '{colors.brand.300}' } },
          subtle: { value: { _light: '{colors.brand.50}', _dark: palette.alpha.brandSubtleDark } },
          muted: { value: { _light: '{colors.brand.100}', _dark: palette.alpha.brandMutedDark } },
          emphasized: { value: { _light: '{colors.brand.200}', _dark: palette.alpha.brandEmphasizedDark } },
          solid: { value: { _light: '{colors.brand.700}', _dark: '{colors.brand.600}' } },
          focusRing: { value: { _light: '{colors.brand.500}', _dark: '{colors.brand.400}' } },
        },
        bg: {
          DEFAULT: { value: { _light: palette.light.background, _dark: palette.dark.background } },
          subtle: { value: { _light: palette.light.backgroundSubtle, _dark: palette.dark.backgroundSubtle } },
          muted: { value: { _light: palette.light.backgroundMuted, _dark: palette.dark.backgroundMuted } },
          emphasized: { value: { _light: palette.light.backgroundEmphasized, _dark: palette.dark.backgroundEmphasized } },
          panel: { value: { _light: palette.light.panel, _dark: palette.dark.panel } },
          elevated: { value: { _light: palette.light.elevated, _dark: palette.dark.elevated } },
        },
        fg: {
          DEFAULT: { value: { _light: palette.light.text, _dark: palette.dark.text } },
          muted: { value: { _light: palette.light.textMuted, _dark: palette.dark.textMuted } },
          subtle: { value: { _light: palette.light.textSubtle, _dark: palette.dark.textSubtle } },
        },
        border: {
          DEFAULT: { value: { _light: palette.light.border, _dark: palette.dark.border } },
          muted: { value: { _light: palette.light.borderMuted, _dark: palette.dark.borderMuted } },
          emphasized: { value: { _light: palette.light.borderEmphasized, _dark: palette.dark.borderEmphasized } },
        },
      },
    },
  },
})

export const appSystem = createSystem(defaultConfig, appTheme)
