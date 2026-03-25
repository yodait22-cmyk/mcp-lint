import type { JSONSchema } from '../core/rule.js';

export type SchemaVisitor = (schema: JSONSchema, path: string) => void;

function walkInternal(
  schema: JSONSchema,
  visitor: SchemaVisitor,
  path: string,
  visited: WeakSet<JSONSchema>,
): void {
  if (!schema || typeof schema !== 'object') return;
  if (visited.has(schema)) return;
  visited.add(schema);

  visitor(schema, path);

  if (schema.properties) {
    for (const [key, value] of Object.entries(schema.properties)) {
      const childPath = path ? `${path}.properties.${key}` : `properties.${key}`;
      walkInternal(value, visitor, childPath, visited);
    }
  }

  if (schema.items) {
    if (Array.isArray(schema.items)) {
      schema.items.forEach((item, i) => {
        const childPath = path ? `${path}.items[${i}]` : `items[${i}]`;
        walkInternal(item, visitor, childPath, visited);
      });
    } else {
      walkInternal(schema.items, visitor, path ? `${path}.items` : 'items', visited);
    }
  }

  for (const kw of ['anyOf', 'oneOf', 'allOf'] as const) {
    const arr = schema[kw];
    if (Array.isArray(arr)) {
      arr.forEach((s, i) => {
        const childPath = path ? `${path}.${kw}[${i}]` : `${kw}[${i}]`;
        walkInternal(s, visitor, childPath, visited);
      });
    }
  }

  if (schema.not) walkInternal(schema.not, visitor, path ? `${path}.not` : 'not', visited);
  if (schema.if) walkInternal(schema.if, visitor, path ? `${path}.if` : 'if', visited);
  if (schema.then) walkInternal(schema.then, visitor, path ? `${path}.then` : 'then', visited);
  if (schema.else) walkInternal(schema.else, visitor, path ? `${path}.else` : 'else', visited);

  if (schema.patternProperties) {
    for (const [pattern, value] of Object.entries(schema.patternProperties)) {
      const childPath = path ? `${path}.patternProperties.${pattern}` : `patternProperties.${pattern}`;
      walkInternal(value, visitor, childPath, visited);
    }
  }
}

export function walkSchema(schema: JSONSchema, visitor: SchemaVisitor, path = ''): void {
  walkInternal(schema, visitor, path, new WeakSet());
}
