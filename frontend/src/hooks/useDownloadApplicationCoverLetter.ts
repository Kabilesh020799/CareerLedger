import { useMutation } from '@tanstack/react-query'
import { applicationService } from '../services/application.service'

type DownloadApplicationCoverLetterInput = {
  applicationId: string
  fileName: string
}

/** Downloads a cover letter and saves it using the generated application filename. */
export function useDownloadApplicationCoverLetter() {
  return useMutation({
    mutationFn: ({ applicationId }: DownloadApplicationCoverLetterInput) =>
      applicationService.downloadCoverLetter(applicationId),
    onSuccess: (coverLetter, { fileName }) => {
      const url = URL.createObjectURL(coverLetter)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName
      anchor.click()
      URL.revokeObjectURL(url)
    },
  })
}
