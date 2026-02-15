import { useEffect, useId, useMemo, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai'
import type { ClusterId, Metric } from '../model'
import type { CockpitUIMessage } from './tools'
import type { InsightContext } from '../runtime-data/insights'
import type { TrendPoint } from '../runtime-data/trends'
import type { Filters } from '../runtime-data/types'
import type { MetricAssignment } from '../runtime-data/assignments'

type ChatContextSnapshot = {
  activeCluster: ClusterId
  metricSnapshot: {
    activeCluster: ClusterId
    metrics: Array<
      Pick<Metric, 'id' | 'title' | 'valueText' | 'thresholdText' | 'rag' | 'supportingFacts'>
    >
  }
  insightContext: InsightContext | null
  filters: Filters
  metricTrends: Record<string, TrendPoint[]> | null
}

const chatContextStore = new Map<string, ChatContextSnapshot>()

function consumeLatestApprovedConfirmation(
  messages: ReturnType<typeof useChat<CockpitUIMessage>>['messages'],
  consumedConfirmationIds: Set<string>,
): boolean {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const message = messages[messageIndex]
    if (message.role !== 'assistant') continue
    for (let partIndex = message.parts.length - 1; partIndex >= 0; partIndex -= 1) {
      const part = message.parts[partIndex]
      if (part.type !== 'tool-askForConfirmation' || part.state !== 'output-available') continue
      if (consumedConfirmationIds.has(part.toolCallId)) continue
      if (String(part.output).toLowerCase() !== 'approved') continue
      consumedConfirmationIds.add(part.toolCallId)
      return true
    }
  }
  return false
}

export function useCockpitChat({
  activeCluster,
  metricSnapshot,
  insightContext,
  filters,
  metricTrends,
  onOpenFilters,
  onExpandMetric,
  onSwitchCluster,
  onApplyFilter,
  onAssignMetric,
}: {
  activeCluster: ClusterId
  metricSnapshot: {
    activeCluster: ClusterId
    metrics: Array<Pick<Metric, 'id' | 'title' | 'valueText' | 'thresholdText' | 'rag' | 'supportingFacts'>>
  }
  insightContext: InsightContext | null
  filters: Filters
  metricTrends: Record<string, TrendPoint[]> | null
  onOpenFilters: () => void
  onExpandMetric: (metricId: string) => void
  onSwitchCluster: (clusterId: ClusterId) => void
  onApplyFilter: (filters: Filters) => void
  onAssignMetric: (metricId: string, assignment: MetricAssignment) => void
}) {
  const contextStoreKey = useId()

  useEffect(() => {
    chatContextStore.set(contextStoreKey, {
      activeCluster,
      metricSnapshot,
      insightContext,
      filters,
      metricTrends,
    })
  }, [activeCluster, contextStoreKey, filters, insightContext, metricSnapshot, metricTrends])

  useEffect(() => {
    return () => {
      chatContextStore.delete(contextStoreKey)
    }
  }, [contextStoreKey])

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        // Keep dashboard context out of the user-visible chat history.
        // This is attached to every request server-side via the transport body.
        body: () => ({ ...(chatContextStore.get(contextStoreKey) ?? {}) }),
      }),
    [contextStoreKey],
  )

  const chat = useChat<CockpitUIMessage>({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  })

  // Auto-execute client-side tools by observing tool parts.
  // This avoids ref access in render-time callbacks (eslint react-hooks/refs).
  const { messages, addToolOutput } = chat
  const handledToolCallIdsRef = useRef<Set<string>>(new Set())
  const consumedConfirmationIdsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    for (const m of messages) {
      if (m.role !== 'assistant') continue
      for (const part of m.parts) {
        // Handle openFilters
        if (part.type === 'tool-openFilters' && part.state === 'input-available' && !handledToolCallIdsRef.current.has(part.toolCallId)) {
          handledToolCallIdsRef.current.add(part.toolCallId)
          onOpenFilters()
          addToolOutput({ tool: 'openFilters', toolCallId: part.toolCallId, output: 'opened' })
        }
        // Handle expandMetric
        if (part.type === 'tool-expandMetric' && part.state === 'input-available' && !handledToolCallIdsRef.current.has(part.toolCallId)) {
          handledToolCallIdsRef.current.add(part.toolCallId)
          onExpandMetric(part.input.metricId)
          addToolOutput({ tool: 'expandMetric', toolCallId: part.toolCallId, output: 'expanded' })
        }
        // Handle switchCluster
        if (part.type === 'tool-switchCluster' && part.state === 'input-available' && !handledToolCallIdsRef.current.has(part.toolCallId)) {
          handledToolCallIdsRef.current.add(part.toolCallId)
          const clusterId = part.input.clusterId
          onSwitchCluster(clusterId)
          addToolOutput({ tool: 'switchCluster', toolCallId: part.toolCallId, output: `switched to ${clusterId}` })
        }
        // Handle applyFilter
        if (part.type === 'tool-applyFilter' && part.state === 'input-available' && !handledToolCallIdsRef.current.has(part.toolCallId)) {
          handledToolCallIdsRef.current.add(part.toolCallId)
          const input = part.input
          if (input.action === 'clear') {
            onApplyFilter({})
          } else {
            const next: Filters = { ...filters }
            if ('businessUnit' in input) next.businessUnit = input.businessUnit as Filters['businessUnit']
            if ('location' in input) next.location = input.location as Filters['location']
            if ('source' in input) next.source = input.source as Filters['source']
            if ('roleName' in input) next.roleName = input.roleName as Filters['roleName']
            if ('candidateType' in input) next.candidateType = input.candidateType as Filters['candidateType']
            onApplyFilter(next)
          }
          addToolOutput({ tool: 'applyFilter', toolCallId: part.toolCallId, output: input.action === 'clear' ? 'filters cleared' : 'filters applied' })
        }
        // Handle assignMetric
        if (part.type === 'tool-assignMetric' && part.state === 'input-available' && !handledToolCallIdsRef.current.has(part.toolCallId)) {
          handledToolCallIdsRef.current.add(part.toolCallId)
          const { metricId, owner, email, note, targetDate } = part.input
          const hasApprovedConfirmation = consumeLatestApprovedConfirmation(messages, consumedConfirmationIdsRef.current)
          if (!hasApprovedConfirmation) {
            addToolOutput({
              tool: 'assignMetric',
              toolCallId: part.toolCallId,
              output: 'blocked: confirmation required before assignment',
            })
            continue
          }
          if (!metricId) {
            addToolOutput({
              tool: 'assignMetric',
              toolCallId: part.toolCallId,
              output: 'blocked: metric id missing',
            })
            continue
          }
          const assignment: MetricAssignment = {
            owner: owner ?? '',
            note: note ?? '',
            targetDate: targetDate ?? '',
            assignedAt: new Date().toISOString(),
            status: 'assigned',
            resolvedAt: null,
          }
          onAssignMetric(metricId, assignment)

          // Build mailto URL
          const metric = metricSnapshot.metrics.find((mt) => mt.id === metricId)
          const metricTitle = metric?.title ?? metricId ?? ''
          const metricValue = metric?.valueText ?? 'N/A'
          const metricTarget = metric?.thresholdText ?? 'N/A'
          const metricRag = metric?.rag ?? 'N/A'
          const subject = `[FIKRAH] Action Required: ${metricTitle}`
          const body = [
            'You have been assigned ownership of the following metric:',
            '',
            `Metric: ${metricTitle}`,
            `Current Value: ${metricValue}`,
            `Target: ${metricTarget}`,
            `Status: ${metricRag}`,
            '',
            `Action Required: ${note ?? ''}`,
            `Target Date: ${targetDate ?? ''}`,
            `Assigned By: Fikrah Advisor`,
            '',
            'Please review and take action.',
          ].join('\n')
          const mailtoUrl = `mailto:${encodeURIComponent(email ?? '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
          const popup = window.open(mailtoUrl, '_blank')
          if (!popup) window.location.href = mailtoUrl

          addToolOutput({ tool: 'assignMetric', toolCallId: part.toolCallId, output: 'assigned' })
        }
      }
    }
  }, [messages, addToolOutput, onOpenFilters, onExpandMetric, onSwitchCluster, onApplyFilter, onAssignMetric, metricSnapshot, filters])

  return chat
}
