#!/usr/bin/env node
/**
 * MCP server for @forepath/code generators (list / schema / generate).
 * Prefer these tools over inventing app/lib layout by hand.
 */
import { createRequire } from 'module';
import * as path from 'path';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { getGeneratorSchema, listGenerators, resolveWorkspaceRoot, runGenerate, registerMcpSkill } from './lib/mcp';

/**
 * MCP SDK 1.18 validates tool args with Zod v3 (`_parse`). The workspace often
 * hoists Zod v4 at the root, so load the SDK's nested Zod v3 explicitly.
 */
type ZodType = {
  optional: () => ZodType;
  describe: (text: string) => ZodType;
  int: () => ZodType;
  positive: () => ZodType;
  max: (n: number) => ZodType;
};
type ZodModule = {
  string: () => ZodType;
  boolean: () => ZodType;
  number: () => ZodType;
  array: (schema: unknown) => ZodType;
  enum: (values: [string, ...string[]]) => ZodType;
  record: (keySchema: unknown, valueSchema?: unknown) => ZodType;
  unknown: () => ZodType;
};

function loadZodV3(): ZodModule {
  const require = createRequire(__filename);
  try {
    const mod = require('zod/v3') as ZodModule;
    const probe = mod.string() as { _parse?: unknown };
    if (typeof probe._parse === 'function') {
      return mod;
    }
  } catch {
    // continue
  }

  try {
    const sdkPkgJson = require.resolve('@modelcontextprotocol/sdk/package.json');
    let dir = path.dirname(sdkPkgJson);
    for (let i = 0; i < 6; i++) {
      try {
        const zodPath = require.resolve('zod', { paths: [dir] });
        const mod = require(zodPath) as ZodModule;
        const probe = mod.string() as { _parse?: unknown };
        if (typeof probe._parse === 'function') {
          return mod;
        }
      } catch {
        // keep walking
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {
    // continue
  }

  throw new Error('Unable to load Zod v3 for MCP tool schemas. Install zod@3 or ensure zod/v3 is resolvable.');
}

const z = loadZodV3();

function textResult(payload: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
  };
}

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ error: message }, null, 2) }],
    isError: true,
  };
}

const server = new McpServer({
  name: 'code',
  version: '1.0.0',
});

registerMcpSkill(server, 'code');

server.tool(
  'code_list_generators',
  'List @forepath/code Nx generators (backend, frontend, lib, domain, mcp, …) with descriptions.',
  {},
  async () => {
    try {
      return textResult({
        generators: listGenerators().map((g) => ({
          name: g.name,
          description: g.description,
        })),
      });
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.tool(
  'code_generator_schema',
  'Return the JSON schema for one @forepath/code generator. Read this before calling code_generate.',
  {
    generator: z.string().describe('Generator name, e.g. backend, frontend, lib, domain'),
  },
  async ({ generator }: { generator: string }) => {
    try {
      return textResult(getGeneratorSchema(generator));
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.tool(
  'code_generate',
  'Run nx generate @forepath/code:<generator>. Mutating runs require confirm=true. Use dryRun=true to preview. Prefer code_generator_schema first. Note: init is heavyweight.',
  {
    generator: z.string().describe('Generator name from code_list_generators'),
    options: z.record(z.unknown()).optional().describe('Generator options as key/value pairs (mapped to --flag=value)'),
    confirm: z.boolean().optional().describe('Must be true to apply changes (ignored when dryRun=true)'),
    dryRun: z.boolean().optional().describe('Pass --dry-run to Nx (no file writes)'),
  },
  async ({
    generator,
    options,
    confirm,
    dryRun,
  }: {
    generator: string;
    options?: Record<string, unknown>;
    confirm?: boolean;
    dryRun?: boolean;
  }) => {
    try {
      const result = runGenerate({
        generator,
        options,
        confirm: confirm === true,
        dryRun: dryRun === true,
        workspaceRoot: resolveWorkspaceRoot(),
      });
      if (result.skipped) {
        return {
          ...textResult(result),
          isError: true,
        };
      }
      return result.ok ? textResult(result) : { ...textResult(result), isError: true };
    } catch (error) {
      return errorResult(error);
    }
  },
);

const transport = new StdioServerTransport();

(async () => {
  await server.connect(transport);
})().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[code-mcp] Failed: ${message}`);
  process.exit(1);
});
