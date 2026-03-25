import type { Rule, MCPTool, RuleContext } from '../core/rule.js';
import type { Diagnostic } from '../core/diagnostic.js';

export const descriptionExists: Rule = {
  id: 'description-exists',
  severity: 'warning',
  description: 'Tools and parameters should have descriptions for better LLM tool-use quality.',
  clients: ['claude', 'cursor', 'gemini', 'vscode'],

  check(tool: MCPTool, _context: RuleContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    if (!tool.description || tool.description.trim() === '') {
      diagnostics.push({
        ruleId: 'description-exists',
        severity: 'warning',
        message: `Tool "${tool.name}" is missing a description. All clients use descriptions for prompt construction.`,
        toolName: tool.name,
        path: 'description',
        clients: ['claude', 'cursor', 'gemini', 'vscode'],
      });
    }

    if (tool.inputSchema.properties) {
      for (const [propName, propSchema] of Object.entries(tool.inputSchema.properties)) {
        if (!propSchema.description || propSchema.description.trim() === '') {
          diagnostics.push({
            ruleId: 'description-exists',
            severity: 'warning',
            message: `Parameter "${propName}" in tool "${tool.name}" is missing a description.`,
            toolName: tool.name,
            path: `inputSchema.properties.${propName}`,
            clients: ['claude', 'cursor', 'gemini', 'vscode'],
          });
        }
      }
    }

    return diagnostics;
  },
};
