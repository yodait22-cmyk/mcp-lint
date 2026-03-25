import type { Rule, MCPTool, RuleContext } from '../core/rule.js';
import type { Diagnostic } from '../core/diagnostic.js';
import { walkSchema } from '../utils/schema-walker.js';

const UNSUPPORTED_KEYWORDS = [
  'if', 'then', 'else',
  'oneOf', 'anyOf', 'allOf', 'not',
  'patternProperties', 'additionalItems',
  'dependencies', '$dynamicRef',
] as const;

export const validJsonSchemaSubset: Rule = {
  id: 'valid-json-schema-subset',
  severity: 'error',
  description: 'MCP tool schemas should use a simple JSON Schema subset. Advanced keywords are not reliably supported.',
  clients: ['claude', 'cursor', 'gemini', 'vscode'],

  check(tool: MCPTool, _context: RuleContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    walkSchema(tool.inputSchema, (schema, path) => {
      const diagnosticPath = path ? `inputSchema.${path}` : 'inputSchema';

      for (const keyword of UNSUPPORTED_KEYWORDS) {
        if (keyword in schema) {
          diagnostics.push({
            ruleId: 'valid-json-schema-subset',
            severity: 'error',
            message: `Keyword "${keyword}" at "${diagnosticPath}" is not in the MCP-supported JSON Schema subset and is not reliably supported across clients.`,
            toolName: tool.name,
            path: diagnosticPath,
            clients: ['claude', 'cursor', 'gemini', 'vscode'],
          });
        }
      }

      if (typeof schema.$ref === 'string' && !schema.$ref.startsWith('#')) {
        diagnostics.push({
          ruleId: 'valid-json-schema-subset',
          severity: 'error',
          message: `External $ref "${schema.$ref}" at "${diagnosticPath}" is not supported. Only internal refs (#/...) are allowed.`,
          toolName: tool.name,
          path: diagnosticPath,
          clients: ['claude', 'cursor', 'gemini', 'vscode'],
        });
      }
    });

    return diagnostics;
  },
};
