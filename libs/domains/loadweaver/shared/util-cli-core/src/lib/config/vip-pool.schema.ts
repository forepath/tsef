import { z } from 'zod';

export const vipBackendTargetSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('node'),
    nodeId: z.string().min(1),
    port: z.number().int().min(1).max(65535),
  }),
  z.object({
    type: z.literal('host'),
    host: z.string().min(1),
    port: z.number().int().min(1).max(65535),
  }),
  z.object({
    type: z.literal('swarm'),
    service: z.string().min(1),
    port: z.number().int().min(1).max(65535),
  }),
]);

export const vipListenerSchema = z.object({
  port: z.number().int().min(1).max(65535),
  protocol: z.enum(['tcp', 'http']).default('tcp'),
  backends: z.array(vipBackendTargetSchema).min(1),
});

export const vipPoolHealthCheckSchema = z
  .object({
    type: z.enum(['tcp', 'http']).default('tcp'),
    port: z.number().int().min(1).max(65535).optional(),
    path: z.string().min(1).default('/'),
  })
  .default({ type: 'tcp', path: '/' });

export const vipPoolSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[A-Za-z0-9_-]+$/, 'Pool name must be alphanumeric, underscore, or hyphen'),
  address: z.string().min(1),
  interface: z.string().optional(),
  routerId: z.number().int().min(1).max(255).optional(),
  authPass: z.string().min(1).max(8).optional(),
  healthCheck: vipPoolHealthCheckSchema,
  listeners: z.array(vipListenerSchema).default([]),
});

export type VipBackendTarget = z.infer<typeof vipBackendTargetSchema>;
export type VipListener = z.infer<typeof vipListenerSchema>;
export type VipPool = z.infer<typeof vipPoolSchema>;
export type VipPoolHealthCheck = z.infer<typeof vipPoolHealthCheckSchema>;
