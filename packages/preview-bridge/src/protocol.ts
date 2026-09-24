import { z } from 'zod'

/** Messages a framed demo sends to the Lumira player. */
export const DemoMessage = z.discriminatedUnion('type', [
  z.object({
    source: z.literal('lumira-demo'),
    v: z.literal(1),
    type: z.literal('ready'),
    path: z.string().max(2000),
    title: z.string().max(300),
    themes: z.array(z.enum(['light', 'dark'])).optional(),
  }),
  z.object({
    source: z.literal('lumira-demo'),
    v: z.literal(1),
    type: z.literal('navigate'),
    path: z.string().max(2000),
    title: z.string().max(300),
  }),
  z.object({
    source: z.literal('lumira-demo'),
    v: z.literal(1),
    type: z.literal('error'),
    message: z.string().max(500),
  }),
])
export type DemoMessage = z.infer<typeof DemoMessage>

/** Messages the player sends to a demo. */
export const HostMessage = z.discriminatedUnion('type', [
  z.object({
    source: z.literal('lumira-host'),
    v: z.literal(1),
    type: z.literal('set-theme'),
    theme: z.enum(['light', 'dark']),
  }),
  z.object({
    source: z.literal('lumira-host'),
    v: z.literal(1),
    type: z.literal('navigate'),
    path: z.string().startsWith('/').max(2000),
  }),
])
export type HostMessage = z.infer<typeof HostMessage>

type Without<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never
export type HostMessageInput = Without<HostMessage, 'source' | 'v'>
export type DemoMessageInput = Without<DemoMessage, 'source' | 'v'>
