import { describe, it, expect } from 'vitest';
import { noUnsupportedFormats } from '../../src/rules/no-unsupported-formats.js';
import type { MCPTool, RuleContext } from '../../src/core/rule.js';

const ctx: RuleContext = { config: {} };
const makeTool = (inputSchema: MCPTool['inputSchema']): MCPTool => ({
  name: 'test-tool', description: 'Test', inputSchema,
});

describe('no-unsupported-formats', () => {
  it('returns no diagnostics for supported formats', () => {
    const tool = makeTool({
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        url: { type: 'string', format: 'uri' },
        date: { type: 'string', format: 'date' },
        time: { type: 'string', format: 'date-time' },
      },
    });
    expect(noUnsupportedFormats.check(tool, ctx)).toHaveLength(0);
  });

  it('warns for uri-reference format', () => {
    const tool = makeTool({
      type: 'object',
      properties: {
        link: { type: 'string', format: 'uri-reference' },
      },
    });
    const diagnostics = noUnsupportedFormats.check(tool, ctx);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].ruleId).toBe('no-unsupported-formats');
    expect(diagnostics[0].severity).toBe('warning');
    expect(diagnostics[0].path).toBe('inputSchema.properties.link');
  });

  it('warns for all unsupported formats', () => {
    const unsupported = [
      'uri-reference', 'iri', 'iri-reference',
      'idn-email', 'idn-hostname',
      'json-pointer', 'relative-json-pointer', 'regex',
    ];
    for (const format of unsupported) {
      const tool = makeTool({ type: 'string', format });
      const diagnostics = noUnsupportedFormats.check(tool, ctx);
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toContain(format);
    }
  });

  it('fix removes the format field', () => {
    const tool = makeTool({ type: 'string', format: 'iri' });
    const [diag] = noUnsupportedFormats.check(tool, ctx);
    const fixed = diag.fix!.apply({ type: 'string', format: 'iri' });
    expect(fixed).not.toHaveProperty('format');
    expect(fixed.type).toBe('string');
  });
});
