import chalk from 'chalk';
import type { Diagnostic } from '../../core/diagnostic.js';

const ICONS = { error: '✖', warning: '⚠', info: 'ℹ' } as const;

export function formatTerminal(diagnostics: Diagnostic[], noColor = false): string {
  if (noColor) chalk.level = 0;

  if (diagnostics.length === 0) {
    return chalk.green('✔ No issues found.\n');
  }

  const byTool = new Map<string, Diagnostic[]>();
  for (const d of diagnostics) {
    const list = byTool.get(d.toolName) ?? [];
    list.push(d);
    byTool.set(d.toolName, list);
  }

  const lines: string[] = [''];

  for (const [toolName, toolDiags] of byTool) {
    lines.push(chalk.bold(toolName));
    for (const d of toolDiags) {
      const icon = d.severity === 'error'
        ? chalk.red(ICONS.error)
        : d.severity === 'warning'
          ? chalk.yellow(ICONS.warning)
          : chalk.blue(ICONS.info);

      const msgColor = d.severity === 'error'
        ? chalk.red
        : d.severity === 'warning'
          ? chalk.yellow
          : chalk.blue;

      lines.push(`  ${icon} ${msgColor(d.message)}`);
      lines.push(`    ${chalk.gray(d.path)}  ${chalk.dim(`[${d.ruleId}]`)}`);
    }
    lines.push('');
  }

  const errors = diagnostics.filter(d => d.severity === 'error').length;
  const warnings = diagnostics.filter(d => d.severity === 'warning').length;
  const infos = diagnostics.filter(d => d.severity === 'info').length;

  const summary: string[] = [];
  if (errors > 0) summary.push(chalk.red(`${errors} error${errors !== 1 ? 's' : ''}`));
  if (warnings > 0) summary.push(chalk.yellow(`${warnings} warning${warnings !== 1 ? 's' : ''}`));
  if (infos > 0) summary.push(chalk.blue(`${infos} info`));

  lines.push(summary.join(', '));
  lines.push('');

  return lines.join('\n');
}
