export const applicationQueryKeys = {
  all: ['applications'] as const,
  board: ['applications', 'board'] as const,
  options: ['applications', 'options'] as const,
  discovery: (query: object) => ['applications', 'discovery', query] as const,
  detail: (id: string) => ['applications', id] as const,
  events: (id: string) => ['applications', id, 'events'] as const,
}

export const sprintQueryKeys = {
  all: ['sprints'] as const,
  current: ['sprints', 'current'] as const,
  archived: ['sprints', 'archived'] as const,
  history: ['sprints', 'history'] as const,
}
