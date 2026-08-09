export const applicationQueryKeys = {
  all: ['applications'] as const,
  board: ['applications', 'board'] as const,
  discovery: (query: object) => ['applications', 'discovery', query] as const,
  detail: (id: string) => ['applications', id] as const,
  events: (id: string) => ['applications', id, 'events'] as const,
}
