import type { Command } from 'commander';
import { loadFile } from '../../loaders/file-loader.js';
import { LintEngine } from '../../core/engine.js';
import { allRules } from '../../rules/index.js';
import { formatTerminal } from '../formatters/terminal.js';
import { formatJson } from '../formatters/json.js';
import { formatMarkdown } from '../formatters/markdown.js';
import { loadConfig } from '../../config/config.js';
import type { Config, Severity } from '../../core/rule.js';
import type { Diagnostic } from '../../core/diagnostic.js';

const SEVERITY_ORDER: Record<Severity, number> = { error: 3, warning: 2, info: 1 };

function filterBySeverity(diagnostics: Diagnostic[], min: Severity): Diagnostic[] {
  return diagnostics.filter((d) => SEVERITY_ORDER[d.severity] >= SEVERITY_ORDER[min]);
}

export function registerCheckCommand(program: Command): void {
  program
    .command('check <input>')
    .description('Check MCP tool schemas for compatibility issues')
    .option('--format <format>', 'Output format: terminal|json|markdown', 'terminal')
    .option('--no-color', 'Disable terminal colors')
    .option('--config <path>', 'Path to .mcplintrc.json config file')
    .option('--severity <level>', 'Minimum severity to report: error|warning|info')
    .option('--ignore <tools>', 'Comma-separated tool names to skip')
    .option('--quiet', 'Only output errors (no warnings/info)')
    .action(async (
      input: string,
      options: {
        format: string;
        color: boolean;
        config?: string;
        severity?: string;
        ignore?: string;
        quiet?: boolean;
      },
    ) => {
      try {
        const fileConfig = await loadConfig(options.config);

        const config: Config = {
          ...fileConfig,
          ignore: [
            ...(fileConfig.ignore ?? []),
            ...(options.ignore ? options.ignore.split(',').map((s) => s.trim()) : []),
          ],
        };

        const tools = await loadFile(input);
        const engine = new LintEngine(allRules, config);
        let diagnostics = engine.lint(tools);

        const minSeverity: Severity = options.quiet
          ? 'error'
          : (options.severity as Severity | undefined) ?? 'info';

        diagnostics = filterBySeverity(diagnostics, minSeverity);

        let output: string;
        if (options.format === 'json') {
          output = formatJson(diagnostics);
        } else if (options.format === 'markdown') {
          output = formatMarkdown(diagnostics);
        } else {
          output = formatTerminal(diagnostics, !options.color);
        }

        process.stdout.write(output);

        const hasErrors = diagnostics.some((d) => d.severity === 'error');
        process.exit(hasErrors ? 1 : 0);
      } catch (err) {
        process.stderr.write(`Error: ${(err as Error).message}\n`);
        process.exit(2);
      }
    });
}
