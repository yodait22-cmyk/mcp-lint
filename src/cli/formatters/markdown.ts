import type { Diagnostic } from '../../core/diagnostic.js';

const SEVERITY_BADGE: Record<string, string> = {
  error: '🔴 error',
  warning: '🟡 warning',
  info: '🔵 info',
};

export function formatMarkdown(diagnostics: Diagnostic[]): string {
  const lines: string[] = ['# MCP Lint Report', ''];

  const errors = diagnostics.filter((d) => d.severity === 'error').length;
  const warnings = diagnostics.filter((d) => d.severity === 'warning').length;
  const infos = diagnostics.filter((d) => d.severity === 'info').length;

  if (diagnostics.length === 0) {
    lines.push('✅ **No issues found.**', '');
    return lines.join('\n');
  }

  lines.push('## Summary', '');
  const summaryParts: string[] = [];
  if (errors > 0) summaryParts.push(`**${errors} error${errors !== 1 ? 's' : ''}**`);
  if (warnings > 0) summaryParts.push(`**${warnings} warning${warnings !== 1 ? 's' : ''}**`);
  if (infos > 0) summaryParts.push(`**${infos} info**`);
  lines.push(summaryParts.join(', '), '');

  const byTool = new Map<string, Diagnostic[]>();
  for (const d of diagnostics) {
    const list = byTool.get(d.toolName) ?? [];
    list.push(d);
    byTool.set(d.toolName, list);
  }

  lines.push('## Issues', '');

  for (const [toolName, toolDiags] of byTool) {
    lines.push(`### \`${toolName}\``, '');
    lines.push('| Severity | Rule | Path | Message |');
    lines.push('|----------|------|------|---------|');
    for (const d of toolDiags) {
      const badge = SEVERITY_BADGE[d.severity] ?? d.severity;
      const msg = d.message.replace(/\|/g, '\\|');
      lines.push(`| ${badge} | \`${d.ruleId}\` | \`${d.path}\` | ${msg} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
