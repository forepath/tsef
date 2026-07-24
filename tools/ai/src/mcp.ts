#!/usr/bin/env node
/**
 * MCP server for @forepath/ai (.agenstra validate / transform).
 * Prefer these tools over hand-editing Cursor/OpenCode configs.
 */
import { createRequire } from 'module';
import * as path from 'path';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { resolveAgenstraDir, resolveWorkspaceRoot, registerMcpSkill, summarizeContext } from './lib/mcp';
import { readContext } from './reader';
import { transform } from './transform';
import { listToolNames } from './transformers';
import type { ToolName } from './types';
import { validateContext } from './validator';

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
  default: (value: unknown) => ZodType;
};
type ZodModule = {
  string: () => ZodType;
  boolean: () => ZodType;
  number: () => ZodType;
  array: (schema: unknown) => ZodType;
  enum: (values: [string, ...string[]]) => ZodType;
  record: (schema: unknown) => ZodType;
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

const TOOL_NAMES = listToolNames() as [ToolName, ...ToolName[]];
const server = new McpServer({
  name: 'ai',
  version: '1.0.0',
});

registerMcpSkill(server, 'ai');

server.tool(
  'ai_list_tools',
  'List supported @forepath/ai transform targets (cursor, opencode, github-copilot).',
  {},
  async () => {
    try {
      return textResult({ tools: listToolNames() });
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.tool(
  'ai_validate',
  'Read and validate workspace .agenstra context. Returns validation results without writing files.',
  {
    agenstraPath: z
      .string()
      .optional()
      .describe('Path to .agenstra or its parent directory (default: workspace .agenstra)'),
  },
  async ({ agenstraPath }: { agenstraPath?: string }) => {
    try {
      const agenstraDir = resolveAgenstraDir(resolveWorkspaceRoot(), agenstraPath);
      const context = readContext(agenstraDir);
      const validation = validateContext(context);

      return textResult({
        agenstraDir,
        success: !validation.some((v) => v.level === 'error'),
        validation,
      });
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.tool(
  'ai_read_context',
  'Structured summary of .agenstra (metadata, ids, counts) without dumping rule/skill/command bodies.',
  {
    agenstraPath: z
      .string()
      .optional()
      .describe('Path to .agenstra or its parent directory (default: workspace .agenstra)'),
  },
  async ({ agenstraPath }: { agenstraPath?: string }) => {
    try {
      const agenstraDir = resolveAgenstraDir(resolveWorkspaceRoot(), agenstraPath);
      const context = readContext(agenstraDir);

      return textResult({
        agenstraDir,
        summary: summarizeContext(context),
      });
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.tool(
  'ai_transform',
  'Transform .agenstra into tool configs (Cursor / OpenCode / GitHub Copilot). dryRun defaults to true — set dryRun=false to write files.',
  {
    targets: z.array(z.enum(TOOL_NAMES)).optional().describe('Transform targets (default: all supported tools)'),
    outputDir: z.string().optional().describe('Base output directory (default: workspace root ".")'),
    dryRun: z.boolean().optional().describe('If true (default), do not write files; return planned results only'),
    agenstraPath: z
      .string()
      .optional()
      .describe('Path to .agenstra or its parent directory (default: workspace .agenstra)'),
    strictValidation: z.boolean().optional().describe('Fail on validation errors (default true)'),
  },
  async ({
    targets,
    outputDir,
    dryRun,
    agenstraPath,
    strictValidation,
  }: {
    targets?: ToolName[];
    outputDir?: string;
    dryRun?: boolean;
    agenstraPath?: string;
    strictValidation?: boolean;
  }) => {
    try {
      const workspaceRoot = resolveWorkspaceRoot();
      const agenstraDir = resolveAgenstraDir(workspaceRoot, agenstraPath);
      const source = path.dirname(agenstraDir);
      const result = transform({
        source,
        target: targets && targets.length > 0 ? targets : listToolNames(),
        outputDir: outputDir ?? workspaceRoot,
        dryRun: dryRun !== false,
        strictValidation: strictValidation !== false,
      });

      return textResult({
        agenstraDir,
        dryRun: dryRun !== false,
        ...result,
      });
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

  console.error(`[ai-mcp] Failed: ${message}`);
  process.exit(1);
});
