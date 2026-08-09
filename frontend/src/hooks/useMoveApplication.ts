import { useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationService } from '../services/application.service'
import type { Application, ApplicationStatus } from '../types/application'
import { applicationQueryKeys } from './applicationQueryKeys'

type MoveApplicationVariables = {
  id: string
  status: ApplicationStatus
}

type MoveApplicationContext = {
  previousBoard?: Application[]
}

export function useMoveApplication() {
  const queryClient = useQueryClient()

  return useMutation<Application, Error, MoveApplicationVariables, MoveApplicationContext>({
    mutationFn: ({ id, status }) => applicationService.update(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: applicationQueryKeys.board })
      const previousBoard = queryClient.getQueryData<Application[]>(
        applicationQueryKeys.board,
      )

      queryClient.setQueryData<Application[]>(
        applicationQueryKeys.board,
        (applications) => applications?.map((application) =>
          application.id === id ? { ...application, status } : application,
        ),
      )

      return { previousBoard }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(
          applicationQueryKeys.board,
          context.previousBoard,
        )
      }
    },
    onSuccess: (application) => {
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
    ]),
  })
}
