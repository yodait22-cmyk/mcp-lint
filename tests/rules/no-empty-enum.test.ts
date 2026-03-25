import { describe, it, expect } from 'vitest';
import { noEmptyEnum } from '../../src/rules/no-empty-enum.js';
import type { MCPTool, RuleContext } from '../../src/core/rule.js';

const ctx: RuleContext = { config: {} };
const makeTool = (inputSchema: MCPTool['inputSchema']): MCPTool => ({
  name: 'test-tool', description: 'Test', inputSchema,
});

describe('no-empty-enum', () => {
  it('returns no diagnostics for valid enum', () => {
    const tool = makeTool({
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'inactive'] },
      },
    });
    expect(noEmptyEnum.check(tool, ctx)).toHaveLength(0);
  });

  it('detects empty enum on a property', () => {
    const tool = makeTool({
      type: 'object',
      properties: {
        status: { type: 'string', enum: [] },
      },
    });
    const diagnostics = noEmptyEnum.check(tool, ctx);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].ruleId).toBe('no-empty-enum');
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[0].path).toBe('inputSchema.properties.status');
  });

  it('detects empty enum at root level', () => {
    const tool = makeTool({ type: 'string', enum: [] });
    const diagnostics = noEmptyEnum.check(tool, ctx);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].path).toBe('inputSchema');
  });

  it('fix removes the enum field', () => {
    const tool = makeTool({ type: 'string', enum: [] });
    const [diag] = noEmptyEnum.check(tool, ctx);
    const fixed = diag.fix!.apply({ type: 'string', enum: [] });
    expect(fixed).not.toHaveProperty('enum');
    expect(fixed.type).toBe('string');
  });

  it('does not flag non-empty enum', () => {
    const tool = makeTool({ type: 'string', enum: [null] });
    expect(noEmptyEnum.check(tool, ctx)).toHaveLength(0);
  });
});
