export type RouterMode = 'browser' | 'hash'

export function resolveRouterMode(value: string | undefined): RouterMode {
  return value === 'hash' ? 'hash' : 'browser'
}
