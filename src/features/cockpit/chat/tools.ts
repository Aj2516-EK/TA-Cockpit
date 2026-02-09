import { z } from 'zod'
import type { InferUITools, ToolSet, UIDataTypes, UIMessage } from 'ai'

// ToolSet used for type-safe tool parts on the client.
// Must match tool names defined in /api/chat.
export const cockpitTools = {
  retrieveDocs: {
    description: 'Retrieve metric definitions and actions',
    inputSchema: z.object({
      query: z.string(),
      k: z.number().int().min(1).max(12).optional(),
    }),
    // For typing: server-side tool returns an array of KB documents.
    execute: async () =>
      [] as Array<{
        id: string
        title: string
        cluster: string
        text: string
      }>,
  },
  openFilters: {
    description: 'Open the filters panel in the UI',
    inputSchema: z.object({}),
    // For typing: client-side tool returns a short status string.
    execute: async () => 'opened',
  },
  expandMetric: {
    description: 'Expand a metric tile in the UI by metricId',
    inputSchema: z.object({
      metricId: z.string(),
    }),
    execute: async () => 'expanded',
  },
  askForConfirmation: {
    description: 'Ask the user for confirmation',
    inputSchema: z.object({
      message: z.string(),
    }),
    execute: async () => 'Approved',
  },
} satisfies ToolSet

export type CockpitUITools = InferUITools<typeof cockpitTools>
export type CockpitUIMessage = UIMessage<never, UIDataTypes, CockpitUITools>
