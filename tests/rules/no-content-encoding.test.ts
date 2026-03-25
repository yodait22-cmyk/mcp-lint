import { describe, it, expect } from 'vitest';
import { noContentEncoding } from '../../src/rules/no-content-encoding.js';
import type { MCPTool, RuleContext } from '../../src/core/rule.js';

const ctx: RuleContext = { config: {} };
const makeTool = (inputSchema: MCPTool['inputSchema']): MCPTool => ({
  name: 'test-tool', description: 'Test', inputSchema,
});

describe('no-content-encoding', () => {
  it('returns no diagnostics for clean schema', () => {
    const tool = makeTool({ type: 'object', properties: { data: { type: 'string' } } });
    expect(noContentEncoding.check(tool, ctx)).toHaveLength(0);
  });

  it('detects contentEncoding on a string property', () => {
    const tool = makeTool({
      type: 'object',
      properties: {
        data: { type: 'string', contentEncoding: 'base64' },
      },
    });
    const diagnostics = noContentEncoding.check(tool, ctx);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].ruleId).toBe('no-content-encoding');
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[0].path).toBe('inputSchema.properties.data');
  });

  it('detects contentEncoding at root schema level', () => {
    const tool = makeTool({ type: 'string', contentEncoding: 'base64' });
    const diagnostics = noContentEncoding.check(tool, ctx);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].path).toBe('inputSchema');
  });

  it('detects multiple contentEncoding violations', () => {
    const tool = makeTool({
      type: 'object',
      properties: {
        a: { type: 'string', contentEncoding: 'base64' },
        b: { type: 'string', contentEncoding: 'base16' },
      },
    });
    expect(noContentEncoding.check(tool, ctx)).toHaveLength(2);
  });

  it('fix removes contentEncoding from schema', () => {
    const tool = makeTool({ type: 'string', contentEncoding: 'base64' });
    const [diag] = noContentEncoding.check(tool, ctx);
    const fixed = diag.fix!.apply({ type: 'string', contentEncoding: 'base64' });
    expect(fixed).not.toHaveProperty('contentEncoding');
    expect(fixed.type).toBe('string');
  });
});
