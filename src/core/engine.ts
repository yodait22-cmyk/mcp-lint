import type { Rule, MCPTool, Config, RuleContext } from './rule.js';
import type { Diagnostic } from './diagnostic.js';
import type { Severity } from './severity.js';

export class LintEngine {
  constructor(
    private readonly rules: Rule[],
    private readonly config: Config,
  ) {}

  lint(tools: MCPTool[]): Diagnostic[] {
    const context: RuleContext = { config: this.config };
    const diagnostics: Diagnostic[] = [];

    for (const tool of tools) {
      if (this.config.ignore?.includes(tool.name)) continue;

      for (const rule of this.rules) {
        const severityOverride = this.config.rules?.[rule.id];
        if (severityOverride === 'off') continue;

        const ruleDiagnostics = rule.check(tool, context);

        for (const diag of ruleDiagnostics) {
          diagnostics.push(
            severityOverride
              ? { ...diag, severity: severityOverride as Severity }
              : diag,
          );
        }
      }
    }

    return diagnostics;
  }
}
