import { describe, it, expect } from 'vitest';
import { descriptionExists } from '../../src/rules/description-exists.js';
import type { MCPTool, RuleContext } from '../../src/core/rule.js';

const ctx: RuleContext = { config: {} };

describe('description-exists', () => {
  it('returns no diagnostics when tool and all params have descriptions', () => {
    const tool: MCPTool = {
      name: 'search',
      description: 'Search for items',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          limit: { type: 'number', description: 'Max results' },
        },
      },
    };
    expect(descriptionExists.check(tool, ctx)).toHaveLength(0);
  });

  it('warns when tool description is missing', () => {
    const tool: MCPTool = {
      name: 'search',
      inputSchema: { type: 'object', properties: {} },
    };
    const diagnostics = descriptionExists.check(tool, ctx);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].path).toBe('description');
    expect(diagnostics[0].severity).toBe('warning');
  });

  it('warns when tool description is empty string', () => {
    const tool: MCPTool = {
      name: 'search',
      description: '   ',
      inputSchema: { type: 'object', properties: {} },
    };
    const diagnostics = descriptionExists.check(tool, ctx);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].path).toBe('description');
  });

  it('warns for each parameter missing description', () => {
    const tool: MCPTool = {
      name: 'search',
      description: 'Search',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          limit: { type: 'number' },
        },
      },
    };
    const diagnostics = descriptionExists.check(tool, ctx);
    expect(diagnostics).toHaveLength(2);
    expect(diagnostics.map(d => d.path)).toContain('inputSchema.properties.query');
    expect(diagnostics.map(d => d.path)).toContain('inputSchema.properties.limit');
  });

  it('returns no diagnostics for schema with no properties', () => {
    const tool: MCPTool = {
      name: 'ping',
      description: 'Ping the server',
      inputSchema: { type: 'object' },
    };
    expect(descriptionExists.check(tool, ctx)).toHaveLength(0);
  });
});
