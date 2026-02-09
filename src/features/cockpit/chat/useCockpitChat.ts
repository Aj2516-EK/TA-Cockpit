import { useEffect, useMemo, useRef } from 'react'
import { useChat, type UseChatHelpers } from '@ai-sdk/react'
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai'
import { readRef } from '../../../lib/ref'
import type { ClusterId, Metric } from '../model'
import type { CockpitUIMessage } from './tools'

export function useCockpitChat({
  activeCluster,
  metricSnapshot,
  onOpenFilters,
  onExpandMetric,
}: {
  activeCluster: ClusterId
  metricSnapshot: {
    activeCluster: ClusterId
    metrics: Array<Pick<Metric, 'id' | 'title' | 'valueText' | 'thresholdText' | 'rag'>>
  }
  onOpenFilters: () => void
  onExpandMetric: (metricId: string) => void
}) {
  const addToolOutputRef = useRef<null | UseChatHelpers<CockpitUIMessage>['addToolOutput']>(null)
  const contextRef = useRef({ activeCluster, metricSnapshot })

  useEffect(() => {
    contextRef.current = { activeCluster, metricSnapshot }
  }, [activeCluster, metricSnapshot])

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: () => {
          const ctx = readRef(contextRef)
          return {
            activeCluster: ctx.activeCluster,
            metricSnapshot: ctx.metricSnapshot,
            filters: null,
          }
        },
      }),
    [],
  )

  const chat = useChat<CockpitUIMessage>({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,

    // Run client-side tools that should auto-execute.
    // Note: Always check toolCall.dynamic first for proper TS narrowing.
    async onToolCall({ toolCall }) {
      if (toolCall.dynamic) return
      const addToolOutput = readRef(addToolOutputRef)
      if (!addToolOutput) return

      if (toolCall.toolName === 'openFilters') {
        onOpenFilters()
        addToolOutput({
          tool: 'openFilters',
          toolCallId: toolCall.toolCallId,
          output: 'opened',
        })
        return
      }

      if (toolCall.toolName === 'expandMetric') {
        onExpandMetric(toolCall.input.metricId)
        addToolOutput({
          tool: 'expandMetric',
          toolCallId: toolCall.toolCallId,
          output: 'expanded',
        })
      }
    },
  })

  useEffect(() => {
    addToolOutputRef.current = chat.addToolOutput
  }, [chat.addToolOutput])

  return chat
}
