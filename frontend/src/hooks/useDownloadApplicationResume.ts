import { useMutation } from '@tanstack/react-query'
import { applicationService } from '../services/application.service'

type DownloadApplicationResumeInput = {
  applicationId: string
  fileName: string
}

export function useDownloadApplicationResume() {
  return useMutation({
    mutationFn: ({ applicationId }: DownloadApplicationResumeInput) =>
      applicationService.downloadResume(applicationId),
    onSuccess: (resume, { fileName }) => {
      const url = URL.createObjectURL(resume)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    },
  })
}
