import { describe, it, expect } from 'vitest';
import { noRecursiveRefs } from '../../src/rules/no-recursive-refs.js';
import type { MCPTool, RuleContext } from '../../src/core/rule.js';

const ctx: RuleContext = { config: {} };
const makeTool = (inputSchema: MCPTool['inputSchema']): MCPTool => ({
  name: 'test-tool', description: 'Test', inputSchema,
});

describe('no-recursive-refs', () => {
  it('returns no diagnostics for schema without refs', () => {
    const tool = makeTool({
      type: 'object',
      properties: { q: { type: 'string' } },
    });
    expect(noRecursiveRefs.check(tool, ctx)).toHaveLength(0);
  });

  it('returns no diagnostics for non-recursive internal ref', () => {
    const tool = makeTool({
      type: 'object',
      $defs: {
        Address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            city: { type: 'string' },
          },
        },
      },
      properties: {
        address: { $ref: '#/$defs/Address' },
      },
    });
    expect(noRecursiveRefs.check(tool, ctx)).toHaveLength(0);
  });

  it('detects direct self-recursive ref', () => {
    const tool = makeTool({
      type: 'object',
      $defs: {
        Node: {
          type: 'object',
          properties: {
            value: { type: 'string' },
            children: {
              type: 'array',
              items: { $ref: '#/$defs/Node' },
            },
          },
        },
      },
      properties: {
        root: { $ref: '#/$defs/Node' },
      },
    });
    const diagnostics = noRecursiveRefs.check(tool, ctx);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].ruleId).toBe('no-recursive-refs');
    expect(diagnostics[0].severity).toBe('error');
  });

  it('detects mutual recursion (A -> B -> A)', () => {
    const tool = makeTool({
      type: 'object',
      $defs: {
        A: { $ref: '#/$defs/B' },
        B: { $ref: '#/$defs/A' },
      },
      properties: {
        root: { $ref: '#/$defs/A' },
      },
    });
    const diagnostics = noRecursiveRefs.check(tool, ctx);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].ruleId).toBe('no-recursive-refs');
  });

  it('detects cycle in unreachable definition', () => {
    const tool = makeTool({
      type: 'object',
      $defs: {
        Loop: { $ref: '#/$defs/Loop' },
      },
      properties: { q: { type: 'string' } },
    });
    const diagnostics = noRecursiveRefs.check(tool, ctx);
    expect(diagnostics).toHaveLength(1);
  });
});
