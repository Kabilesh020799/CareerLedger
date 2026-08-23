export function isHttpOrHttpsUrl(value: string | null | undefined): value is string {
  if (!value) return false

  try {
    const protocol = new URL(value).protocol
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}
