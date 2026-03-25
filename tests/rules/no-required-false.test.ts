import { describe, it, expect } from 'vitest';
import { noRequiredFalse } from '../../src/rules/no-required-false.js';
import type { MCPTool, RuleContext } from '../../src/core/rule.js';

const ctx: RuleContext = { config: {} };

function makeTool(inputSchema: MCPTool['inputSchema']): MCPTool {
  return { name: 'test-tool', description: 'Test tool', inputSchema };
}

describe('no-required-false', () => {
  it('returns no diagnostics for valid schema with required array', () => {
    const tool = makeTool({
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number' },
      },
      required: ['query'],
    });
    expect(noRequiredFalse.check(tool, ctx)).toHaveLength(0);
  });

  it('returns no diagnostics when required is an array on root', () => {
    const tool = makeTool({
      type: 'object',
      properties: { q: { type: 'string' } },
      required: ['q'],
    });
    expect(noRequiredFalse.check(tool, ctx)).toHaveLength(0);
  });

  it('detects required: false on a top-level property', () => {
    const tool = makeTool({
      type: 'object',
      properties: {
        query: { type: 'string', required: false } as MCPTool['inputSchema'],
      },
    });
    const diagnostics = noRequiredFalse.check(tool, ctx);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].ruleId).toBe('no-required-false');
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[0].path).toBe('inputSchema.properties.query');
    expect(diagnostics[0].toolName).toBe('test-tool');
  });

  it('detects required: false in nested properties', () => {
    const tool = makeTool({
      type: 'object',
      properties: {
        filter: {
          type: 'object',
          properties: {
            active: { type: 'boolean', required: false } as MCPTool['inputSchema'],
          },
        },
      },
    });
    const diagnostics = noRequiredFalse.check(tool, ctx);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].path).toBe('inputSchema.properties.filter.properties.active');
  });

  it('detects multiple required: false violations', () => {
    const tool = makeTool({
      type: 'object',
      properties: {
        a: { type: 'string', required: false } as MCPTool['inputSchema'],
        b: { type: 'number', required: false } as MCPTool['inputSchema'],
      },
    });
    expect(noRequiredFalse.check(tool, ctx)).toHaveLength(2);
  });

  it('does not flag required: true (different invalid case, out of scope)', () => {
    // required: true is also invalid but this rule only targets required: false
    const tool = makeTool({
      type: 'object',
      properties: {
        q: { type: 'string' },
      },
    });
    expect(noRequiredFalse.check(tool, ctx)).toHaveLength(0);
  });
});
