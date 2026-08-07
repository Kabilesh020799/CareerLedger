export const applicationQueryKeys = {
  all: ['applications'] as const,
  detail: (id: string) => ['applications', id] as const,
}
