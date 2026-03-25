import type { Rule, MCPTool, RuleContext, JSONSchema } from '../core/rule.js';
import type { Diagnostic } from '../core/diagnostic.js';

function detectCycle(
  schema: JSONSchema,
  allDefs: Record<string, JSONSchema>,
  chain: Set<string>,
): boolean {
  if (!schema || typeof schema !== 'object') return false;

  if (typeof schema.$ref === 'string') {
    const match = schema.$ref.match(/^#\/(?:\$defs|definitions)\/(.+)$/);
    if (match) {
      const defName = match[1];
      if (chain.has(defName)) return true;
      const def = allDefs[defName];
      if (def) {
        return detectCycle(def, allDefs, new Set([...chain, defName]));
      }
    }
    return false;
  }

  const subs: (JSONSchema | undefined)[] = [
    ...(schema.properties ? Object.values(schema.properties) : []),
    ...(Array.isArray(schema.items) ? schema.items : schema.items ? [schema.items] : []),
    ...(schema.anyOf ?? []),
    ...(schema.oneOf ?? []),
    ...(schema.allOf ?? []),
    schema.not,
    schema.if,
    schema.then,
    schema.else,
  ];

  return subs.filter((s): s is JSONSchema => s != null).some((s) =>
    detectCycle(s, allDefs, chain),
  );
}

export const noRecursiveRefs: Rule = {
  id: 'no-recursive-refs',
  severity: 'error',
  description: 'Circular $ref causes infinite loops or crashes in most MCP clients.',
  clients: ['claude', 'cursor', 'gemini', 'vscode'],

  check(tool: MCPTool, _context: RuleContext): Diagnostic[] {
    const schema = tool.inputSchema;
    const allDefs: Record<string, JSONSchema> = {
      ...(schema.$defs ?? {}),
      ...(schema.definitions ?? {}),
    };

    // Check from root
    if (detectCycle(schema, allDefs, new Set())) {
      return [{
        ruleId: 'no-recursive-refs',
        severity: 'error',
        message: `Tool "${tool.name}" schema contains a circular $ref that could cause infinite loops or crashes in MCP clients.`,
        toolName: tool.name,
        path: 'inputSchema',
        clients: ['claude', 'cursor', 'gemini', 'vscode'],
      }];
    }

    // Check definitions not reachable from root
    for (const [defName, def] of Object.entries(allDefs)) {
      if (detectCycle(def, allDefs, new Set([defName]))) {
        return [{
          ruleId: 'no-recursive-refs',
          severity: 'error',
          message: `Definition "$defs.${defName}" in tool "${tool.name}" contains a circular $ref.`,
          toolName: tool.name,
          path: `inputSchema.$defs.${defName}`,
          clients: ['claude', 'cursor', 'gemini', 'vscode'],
        }];
      }
    }

    return [];
  },
};
