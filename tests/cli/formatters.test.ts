import { describe, it, expect } from 'vitest';
import { formatJson } from '../../src/cli/formatters/json.js';
import { formatMarkdown } from '../../src/cli/formatters/markdown.js';
import { formatTerminal } from '../../src/cli/formatters/terminal.js';
import type { Diagnostic } from '../../src/core/diagnostic.js';

const errorDiag: Diagnostic = {
  ruleId: 'no-required-false',
  severity: 'error',
  message: 'required: false is invalid',
  toolName: 'search',
  path: 'inputSchema.properties.query',
  clients: ['claude'],
};

const warningDiag: Diagnostic = {
  ruleId: 'description-exists',
  severity: 'warning',
  message: 'Missing description',
  toolName: 'search',
  path: 'description',
  clients: ['claude'],
};

describe('formatJson', () => {
  it('outputs valid JSON array', () => {
    const output = formatJson([errorDiag]);
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].ruleId).toBe('no-required-false');
  });

  it('outputs empty array for no diagnostics', () => {
    const output = formatJson([]);
    expect(JSON.parse(output)).toEqual([]);
  });

  it('includes all diagnostic fields', () => {
    const parsed = JSON.parse(formatJson([errorDiag]));
    expect(parsed[0]).toMatchObject({
      ruleId: 'no-required-false',
      severity: 'error',
      toolName: 'search',
      path: 'inputSchema.properties.query',
    });
  });
});

describe('formatMarkdown', () => {
  it('outputs no-issues message when empty', () => {
    expect(formatMarkdown([])).toContain('No issues found');
  });

  it('includes tool name as heading', () => {
    const output = formatMarkdown([errorDiag]);
    expect(output).toContain('### `search`');
  });

  it('includes summary with counts', () => {
    const output = formatMarkdown([errorDiag, warningDiag]);
    expect(output).toContain('1 error');
    expect(output).toContain('1 warning');
  });

  it('includes rule id and path in table', () => {
    const output = formatMarkdown([errorDiag]);
    expect(output).toContain('no-required-false');
    expect(output).toContain('inputSchema.properties.query');
  });
});

describe('formatTerminal', () => {
  it('outputs success message when no diagnostics', () => {
    const output = formatTerminal([], true);
    expect(output).toContain('No issues found');
  });

  it('includes tool name', () => {
    const output = formatTerminal([errorDiag], true);
    expect(output).toContain('search');
  });

  it('includes rule id', () => {
    const output = formatTerminal([errorDiag], true);
    expect(output).toContain('no-required-false');
  });

  it('shows error count in summary', () => {
    const output = formatTerminal([errorDiag], true);
    expect(output).toContain('1 error');
  });

  it('shows error and warning counts', () => {
    const output = formatTerminal([errorDiag, warningDiag], true);
    expect(output).toContain('1 error');
    expect(output).toContain('1 warning');
  });
});
