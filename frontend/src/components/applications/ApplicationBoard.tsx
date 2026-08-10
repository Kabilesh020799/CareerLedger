import { Badge, Button, Flex, Heading, Link as ChakraLink, Stack, Text } from '@chakra-ui/react'
import { useMemo, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  applicationStatuses,
  type Application,
  type ApplicationStatus,
} from '../../types/application'
import {
  applicationStatusLabels,
  groupApplicationsByStatus,
} from '../../utils/applicationBoard'
import { CustomSelect } from '../ui/CustomSelect'

type ApplicationBoardProps = {
  applications: Application[]
  movingApplicationId?: string
  onMove: (id: string, status: ApplicationStatus) => void
}

export function ApplicationBoard({
  applications,
  movingApplicationId,
  onMove,
}: ApplicationBoardProps) {
  const grouped = useMemo(
    () => groupApplicationsByStatus(applications),
    [applications],
  )
  const [draggedApplicationId, setDraggedApplicationId] = useState<string>()
  const [dropTarget, setDropTarget] = useState<ApplicationStatus>()
  const [mobileStatus, setMobileStatus] = useState<ApplicationStatus>('APPLIED')

  const finishDrag = () => {
    setDraggedApplicationId(undefined)
    setDropTarget(undefined)
  }

  const drop = (event: DragEvent, status: ApplicationStatus) => {
    event.preventDefault()
    const id = event.dataTransfer.getData('text/plain') || draggedApplicationId
    const application = applications.find((candidate) => candidate.id === id)

    if (application && application.status !== status) onMove(application.id, status)
    finishDrag()
  }

  return (
    <Stack gap="4">
      <Flex aria-label="Choose board status" display={{ base: 'flex', md: 'none' }} gap="2" overflowX="auto" pb="1" role="tablist">
        {applicationStatuses.map((status) => <Button aria-selected={mobileStatus === status} flexShrink="0" key={status} role="tab" size="sm" variant={mobileStatus === status ? 'solid' : 'outline'} colorPalette={mobileStatus === status ? 'purple' : 'gray'} onClick={() => setMobileStatus(status)}>{applicationStatusLabels[status]} <Badge ml="1" variant="subtle">{grouped[status].length}</Badge></Button>)}
      </Flex>
      <Flex
      align="stretch"
      gap="4"
      maxW="full"
      overflowX={{ base: 'hidden', md: 'auto' }}
      overscrollBehaviorX="contain"
      pb="4"
      role="group"
      aria-label="Application status board"
      scrollSnapType="x proximity"
      tabIndex={0}
      w="full"
    >
      {applicationStatuses.map((status) => {
        const statusApplications = grouped[status]
        const label = applicationStatusLabels[status]
        const isDropTarget = dropTarget === status

        return (
          <Stack
            as="section"
            aria-label={`${label} applications`}
            bg={isDropTarget ? 'purple.subtle' : 'bg.muted'}
            borderColor={isDropTarget ? 'purple.emphasized' : 'transparent'}
            borderRadius="xl"
            borderWidth="2px"
            flex="0 0 17rem"
            display={{ base: mobileStatus === status ? 'flex' : 'none', md: 'flex' }}
            gap="3"
            key={status}
            minH={{ base: 'auto', md: '24rem' }}
            p="3"
            transition="background 0.15s ease, border-color 0.15s ease"
            scrollSnapAlign="start"
            w={{ base: 'full', md: 'auto' }}
            onDragEnter={() => setDropTarget(status)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => drop(event, status)}
          >
            <Flex align="center" justify="space-between" px="1">
              <Heading as="h3" size="sm">{label}</Heading>
              <Badge colorPalette="purple" variant="subtle">
                {statusApplications.length}
              </Badge>
            </Flex>

            {statusApplications.length === 0 && (
              <Text color="fg.subtle" fontSize="sm" px="1">No applications</Text>
            )}

            {statusApplications.map((application) => (
              <ApplicationBoardCard
                application={application}
                disabled={Boolean(movingApplicationId)}
                isMoving={movingApplicationId === application.id}
                key={application.id}
                onDragEnd={finishDrag}
                onDragStart={(event) => {
                  const cardBounds = event.currentTarget.getBoundingClientRect()
                  const dragClientX = Number.isFinite(event.clientX)
                    ? event.clientX
                    : cardBounds.left
                  const dragClientY = Number.isFinite(event.clientY)
                    ? event.clientY
                    : cardBounds.top
                  const pointerX = Math.max(
                    0,
                    Math.min(dragClientX - cardBounds.left, cardBounds.width),
                  )
                  const pointerY = Math.max(
                    0,
                    Math.min(dragClientY - cardBounds.top, cardBounds.height),
                  )
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData('text/plain', application.id)
                  event.dataTransfer.setDragImage(
                    event.currentTarget,
                    pointerX,
                    pointerY,
                  )
                  setDraggedApplicationId(application.id)
                }}
                onMove={onMove}
              />
            ))}
          </Stack>
        )
      })}
      </Flex>
    </Stack>
  )
}

type ApplicationBoardCardProps = {
  application: Application
  disabled: boolean
  isMoving: boolean
  onDragStart: (event: DragEvent) => void
  onDragEnd: () => void
  onMove: (id: string, status: ApplicationStatus) => void
}

function ApplicationBoardCard({
  application,
  disabled,
  isMoving,
  onDragStart,
  onDragEnd,
  onMove,
}: ApplicationBoardCardProps) {
  return (
    <Stack
      as="article"
      aria-label={`${application.company}, ${application.jobTitle}`}
      bg="bg.panel"
      borderColor="border"
      borderRadius="lg"
      borderWidth="1px"
      cursor={disabled ? 'wait' : 'grab'}
      draggable={!disabled}
      gap="3"
      opacity={isMoving ? 0.65 : 1}
      p="4"
      shadow="sm"
      onDragEnd={onDragEnd}
      onDragStart={onDragStart}
    >
      <Stack gap="1">
        <ChakraLink asChild fontWeight="semibold" color="purple.fg">
          <Link to={`/applications/${application.id}`}>{application.company}</Link>
        </ChakraLink>
        <Text color="fg" fontSize="sm">{application.jobTitle}</Text>
        {application.location && (
          <Text color="fg.subtle" fontSize="xs">{application.location}</Text>
        )}
      </Stack>

      <CustomSelect aria-label={`Move ${application.company} to status`} disabled={disabled} options={applicationStatuses.map((status) => ({ label: applicationStatusLabels[status], value: status }))} value={application.status} onChange={(value) => onMove(application.id, value as ApplicationStatus)} />
    </Stack>
  )
}
