import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationService } from '../services/application.service'
import type { Application, ApplicationStatus, CurrentSprint } from '../types/application'
import { applicationQueryKeys } from './applicationQueryKeys'
import { dashboardQueryKeys } from './dashboardQueryKeys'
import { useFeedback } from '../components/ui/feedback-context'

type MoveApplicationVariables = {
  id: string
  status: ApplicationStatus
}

type MoveApplicationContext = {
  previousBoard?: CurrentSprint
}

export function useMoveApplication() {
  const queryClient = useQueryClient()
  const feedback = useFeedback()

  return useMutation<Application, Error, MoveApplicationVariables, MoveApplicationContext>({
    mutationFn: ({ id, status }) => applicationService.update(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: applicationQueryKeys.board })
      const previousBoard = queryClient.getQueryData<CurrentSprint>(
        applicationQueryKeys.board,
      )

      queryClient.setQueryData<CurrentSprint>(
        applicationQueryKeys.board,
        (board) => board
          ? {
              ...board,
              applications: board.applications.map((application) =>
                application.id === id ? { ...application, status } : application,
              ),
            }
          : board,
      )

      return { previousBoard }
    },
    onError: (_error, _variables, context) => {
      feedback.show('Status update failed', { description: 'The application was returned to its previous status.', status: 'error' })
      if (context?.previousBoard) {
        queryClient.setQueryData<CurrentSprint>(
          applicationQueryKeys.board,
          context.previousBoard,
        )
      }
    },
    onSuccess: (application) => {
      feedback.show('Status updated', { description: `${application.company} moved to ${application.status.toLowerCase()}.` })
      queryClient.setQueryData(
        applicationQueryKeys.detail(application.id),
        application,
      )
    },
    onSettled: (_application, _error, variables) => Promise.all([
      queryClient.invalidateQueries({ queryKey: applicationQueryKeys.all }),
      queryClient.invalidateQueries({
        queryKey: applicationQueryKeys.events(variables.id),
      }),
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all }),
    ]),
  })
}
