import { describe, it, expect } from 'vitest';
import { LintEngine } from '../../src/core/engine.js';
import type { Rule, MCPTool } from '../../src/core/rule.js';

const mockRule: Rule = {
  id: 'mock-rule',
  severity: 'error',
  description: 'Mock rule for testing',
  clients: ['claude'],
  check: (tool) => [{
    ruleId: 'mock-rule',
    severity: 'error',
    message: 'Mock error',
    toolName: tool.name,
    path: 'inputSchema',
    clients: ['claude'],
  }],
};

const mockTool: MCPTool = {
  name: 'test-tool',
  description: 'Test',
  inputSchema: { type: 'object' },
};

describe('LintEngine', () => {
  it('runs rules and returns diagnostics', () => {
    const engine = new LintEngine([mockRule], {});
    expect(engine.lint([mockTool])).toHaveLength(1);
  });

  it('returns empty array when no tools', () => {
    const engine = new LintEngine([mockRule], {});
    expect(engine.lint([])).toHaveLength(0);
  });

  it('returns empty array when no rules', () => {
    const engine = new LintEngine([], {});
    expect(engine.lint([mockTool])).toHaveLength(0);
  });

  it('skips ignored tools', () => {
    const engine = new LintEngine([mockRule], { ignore: ['test-tool'] });
    expect(engine.lint([mockTool])).toHaveLength(0);
  });

  it('does not skip tools not in ignore list', () => {
    const engine = new LintEngine([mockRule], { ignore: ['other-tool'] });
    expect(engine.lint([mockTool])).toHaveLength(1);
  });

  it('skips rule when severity is off', () => {
    const engine = new LintEngine([mockRule], { rules: { 'mock-rule': 'off' } });
    expect(engine.lint([mockTool])).toHaveLength(0);
  });

  it('overrides severity from config', () => {
    const engine = new LintEngine([mockRule], { rules: { 'mock-rule': 'warning' } });
    const result = engine.lint([mockTool]);
    expect(result[0].severity).toBe('warning');
  });

  it('runs multiple rules against multiple tools', () => {
    const rule2: Rule = { ...mockRule, id: 'mock-rule-2' };
    const tool2: MCPTool = { ...mockTool, name: 'tool-2' };
    const engine = new LintEngine([mockRule, rule2], {});
    expect(engine.lint([mockTool, tool2])).toHaveLength(4);
  });
});
