export const applicationQueryKeys = {
  all: ['applications'] as const,
  detail: (id: string) => ['applications', id] as const,
  events: (id: string) => ['applications', id, 'events'] as const,
}
