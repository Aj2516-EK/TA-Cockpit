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
  assignMetric: {
    description: 'Assign an owner to a metric and open an email draft',
    inputSchema: z.object({
      metricId: z.string(),
      owner: z.string(),
      email: z.string(),
      note: z.string(),
      targetDate: z.string(),
    }),
    execute: async () => 'assigned',
  },
  switchCluster: {
    description: 'Navigate to a different dashboard cluster',
    inputSchema: z.object({
      clusterId: z.enum(['readiness', 'momentum', 'experience', 'diversity', 'economics']),
    }),
    execute: async () => 'switched',
  },
  applyFilter: {
    description: 'Apply or clear dashboard filters',
    inputSchema: z.object({
      action: z.enum(['apply', 'clear']),
      businessUnit: z.array(z.string()).optional(),
      location: z.array(z.string()).optional(),
      source: z.array(z.string()).optional(),
      roleName: z.array(z.string()).optional(),
      candidateType: z.array(z.string()).optional(),
    }),
    execute: async () => 'filters applied',
  },
} satisfies ToolSet

export type CockpitUITools = InferUITools<typeof cockpitTools>
export type CockpitUIMessage = UIMessage<never, UIDataTypes, CockpitUITools>
