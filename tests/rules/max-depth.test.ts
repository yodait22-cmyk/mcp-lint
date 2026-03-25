import { describe, it, expect } from 'vitest';
import { maxDepth } from '../../src/rules/max-depth.js';
import type { MCPTool, RuleContext } from '../../src/core/rule.js';

const ctx: RuleContext = { config: {} };
const ctxCustom = (limit: number): RuleContext => ({ config: { maxDepth: limit } });
const makeTool = (inputSchema: MCPTool['inputSchema']): MCPTool => ({
  name: 'test-tool', description: 'Test', inputSchema,
});

describe('max-depth', () => {
  it('returns no diagnostics for shallow schema', () => {
    const tool = makeTool({
      type: 'object',
      properties: {
        q: { type: 'string' },
        n: { type: 'number' },
      },
    });
    expect(maxDepth.check(tool, ctx)).toHaveLength(0);
  });

  it('returns no diagnostics at exactly the limit (depth = 5)', () => {
    const tool = makeTool({
      type: 'object',
      properties: {
        a: {
          type: 'object',
          properties: {
            b: {
              type: 'object',
              properties: {
                c: {
                  type: 'object',
                  properties: {
                    d: {
                      type: 'object',
                      properties: {
                        e: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    expect(maxDepth.check(tool, ctx)).toHaveLength(0);
  });

  it('warns when schema exceeds default depth of 5', () => {
    const tool = makeTool({
      type: 'object',
      properties: {
        a: {
          type: 'object',
          properties: {
            b: {
              type: 'object',
              properties: {
                c: {
                  type: 'object',
                  properties: {
                    d: {
                      type: 'object',
                      properties: {
                        e: {
                          type: 'object',
                          properties: { f: { type: 'string' } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    const diagnostics = maxDepth.check(tool, ctx);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].ruleId).toBe('max-depth');
    expect(diagnostics[0].severity).toBe('warning');
  });

  it('respects custom maxDepth from config', () => {
    const tool = makeTool({
      type: 'object',
      properties: {
        a: { type: 'object', properties: { b: { type: 'string' } } },
      },
    });
    expect(maxDepth.check(tool, ctxCustom(1))).toHaveLength(1);
    expect(maxDepth.check(tool, ctxCustom(2))).toHaveLength(0);
  });
});
