import { describe, it, expect } from 'vitest';
import { validJsonSchemaSubset } from '../../src/rules/valid-json-schema-subset.js';
import type { MCPTool, RuleContext } from '../../src/core/rule.js';

const ctx: RuleContext = { config: {} };
const makeTool = (inputSchema: MCPTool['inputSchema']): MCPTool => ({
  name: 'test-tool', description: 'Test', inputSchema,
});

describe('valid-json-schema-subset', () => {
  it('returns no diagnostics for simple valid schema', () => {
    const tool = makeTool({
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number', enum: [10, 20, 50] },
      },
      required: ['query'],
    });
    expect(validJsonSchemaSubset.check(tool, ctx)).toHaveLength(0);
  });

  it('returns no diagnostics for internal $ref', () => {
    const tool = makeTool({
      type: 'object',
      $defs: { Foo: { type: 'string' } },
      properties: { bar: { $ref: '#/$defs/Foo' } },
    });
    expect(validJsonSchemaSubset.check(tool, ctx)).toHaveLength(0);
  });

  it('detects oneOf', () => {
    const tool = makeTool({
      type: 'object',
      properties: {
        val: { oneOf: [{ type: 'string' }, { type: 'number' }] },
      },
    });
    const diagnostics = validJsonSchemaSubset.check(tool, ctx);
    expect(diagnostics.some(d => d.message.includes('oneOf'))).toBe(true);
  });

  it('detects if/then/else', () => {
    const tool = makeTool({
      type: 'object',
      if: { properties: { mode: { const: 'advanced' } } },
      then: { required: ['extra'] },
    });
    const diagnostics = validJsonSchemaSubset.check(tool, ctx);
    expect(diagnostics.some(d => d.message.includes('"if"'))).toBe(true);
    expect(diagnostics.some(d => d.message.includes('"then"'))).toBe(true);
  });

  it('detects external $ref', () => {
    const tool = makeTool({
      type: 'object',
      properties: {
        addr: { $ref: 'https://example.com/schemas/address.json' },
      },
    });
    const diagnostics = validJsonSchemaSubset.check(tool, ctx);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain('External $ref');
  });

  it('detects $dynamicRef', () => {
    const tool = makeTool({ $dynamicRef: '#meta' });
    const diagnostics = validJsonSchemaSubset.check(tool, ctx);
    expect(diagnostics.some(d => d.message.includes('$dynamicRef'))).toBe(true);
  });
});
