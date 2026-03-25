import type { Command } from 'commander';
import { loadFile } from '../../loaders/file-loader.js';
import { LintEngine } from '../../core/engine.js';
import { allRules } from '../../rules/index.js';
import { formatTerminal } from '../formatters/terminal.js';
import type { Config } from '../../core/rule.js';

export function registerCheckCommand(program: Command): void {
  program
    .command('check <input>')
    .description('Check MCP tool schemas for compatibility issues')
    .option('--format <format>', 'Output format: terminal|json|markdown', 'terminal')
    .option('--no-color', 'Disable terminal colors')
    .action(async (input: string, options: { format: string; color: boolean }) => {
      try {
        const tools = await loadFile(input);
        const config: Config = {};
        const engine = new LintEngine(allRules, config);
        const diagnostics = engine.lint(tools);

        process.stdout.write(formatTerminal(diagnostics, !options.color));

        const hasErrors = diagnostics.some(d => d.severity === 'error');
        process.exit(hasErrors ? 1 : 0);
      } catch (err) {
        process.stderr.write(`Error: ${(err as Error).message}\n`);
        process.exit(2);
      }
    });
}
