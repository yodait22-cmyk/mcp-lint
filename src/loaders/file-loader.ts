import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { MCPTool } from '../core/rule.js';

export async function loadFile(filePath: string): Promise<MCPTool[]> {
  let content: string;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch (err) {
    throw new Error(`Cannot read file "${filePath}": ${(err as NodeJS.ErrnoException).message}`);
  }

  const ext = extname(filePath).toLowerCase();
  let data: unknown;

  try {
    if (ext === '.yaml' || ext === '.yml') {
      data = parseYaml(content);
    } else {
      data = JSON.parse(content);
    }
  } catch (err) {
    throw new Error(`Failed to parse "${filePath}": ${(err as Error).message}`);
  }

  if (!Array.isArray(data)) {
    throw new Error(`Expected an array of MCP tools in "${filePath}", got ${typeof data}`);
  }

  return data as MCPTool[];
}
