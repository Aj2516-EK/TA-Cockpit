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

export function useCockpitChat({
  activeCluster,
  metricSnapshot,
  insightContext,
  filters,
  metricTrends,
  onOpenFilters,
  onExpandMetric,
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
  useEffect(() => {
    for (const m of messages) {
      if (m.role !== 'assistant') continue
      for (const part of m.parts) {
        if (part.type !== 'tool-openFilters' && part.type !== 'tool-expandMetric') continue
        if (part.state !== 'input-available') continue
        if (handledToolCallIdsRef.current.has(part.toolCallId)) continue

        handledToolCallIdsRef.current.add(part.toolCallId)

        if (part.type === 'tool-openFilters') {
          onOpenFilters()
          addToolOutput({
            tool: 'openFilters',
            toolCallId: part.toolCallId,
            output: 'opened',
          })
        } else {
          onExpandMetric(part.input.metricId)
          addToolOutput({
            tool: 'expandMetric',
            toolCallId: part.toolCallId,
            output: 'expanded',
          })
        }
      }
    }
  }, [messages, addToolOutput, onOpenFilters, onExpandMetric])

  return chat
}
