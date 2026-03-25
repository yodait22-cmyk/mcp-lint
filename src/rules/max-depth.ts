import type { Rule, MCPTool, RuleContext, JSONSchema } from '../core/rule.js';
import type { Diagnostic } from '../core/diagnostic.js';

function getMaxDepth(schema: JSONSchema, depth = 0): number {
  if (!schema || typeof schema !== 'object') return depth;

  let max = depth;

  if (schema.properties) {
    for (const value of Object.values(schema.properties)) {
      max = Math.max(max, getMaxDepth(value, depth + 1));
    }
  }

  if (schema.items) {
    if (Array.isArray(schema.items)) {
      for (const item of schema.items) {
        max = Math.max(max, getMaxDepth(item, depth + 1));
      }
    } else {
      max = Math.max(max, getMaxDepth(schema.items, depth + 1));
    }
  }

  for (const kw of ['anyOf', 'oneOf', 'allOf'] as const) {
    const arr = schema[kw];
    if (Array.isArray(arr)) {
      for (const s of arr) {
        max = Math.max(max, getMaxDepth(s, depth + 1));
      }
    }
  }

  if (schema.not) max = Math.max(max, getMaxDepth(schema.not, depth + 1));
  if (schema.if) max = Math.max(max, getMaxDepth(schema.if, depth + 1));
  if (schema.then) max = Math.max(max, getMaxDepth(schema.then, depth + 1));
  if (schema.else) max = Math.max(max, getMaxDepth(schema.else, depth + 1));

  return max;
}

export const maxDepth: Rule = {
  id: 'max-depth',
  severity: 'warning',
  description: 'Deeply nested schemas confuse LLMs and increase token consumption.',
  clients: ['claude', 'cursor', 'gemini', 'vscode'],

  check(tool: MCPTool, context: RuleContext): Diagnostic[] {
    const limit = context.config.maxDepth ?? 5;
    const depth = getMaxDepth(tool.inputSchema);

    if (depth > limit) {
      return [{
        ruleId: 'max-depth',
        severity: 'warning',
        message: `Tool "${tool.name}" schema has nesting depth of ${depth}, which exceeds the limit of ${limit}. Keep schemas flat for better LLM comprehension.`,
        toolName: tool.name,
        path: 'inputSchema',
        clients: ['claude', 'cursor', 'gemini', 'vscode'],
      }];
    }

    return [];
  },
};
