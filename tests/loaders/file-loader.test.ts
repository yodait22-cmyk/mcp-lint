import { describe, it, expect } from 'vitest';
import { loadFile } from '../../src/loaders/file-loader.js';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixtures = resolve(__dirname, '../fixtures');

describe('loadFile', () => {
  it('loads valid JSON file', async () => {
    const tools = await loadFile(resolve(fixtures, 'valid/minimal-tool.json'));
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('search');
    expect(tools[0].description).toBe('Search for items matching the query');
  });

  it('loads valid YAML file', async () => {
    const tools = await loadFile(resolve(fixtures, 'valid/minimal-tool.yaml'));
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('search');
  });

  it('returns empty array for empty tools list', async () => {
    const tools = await loadFile(resolve(fixtures, 'edge-cases/no-tools.json'));
    expect(tools).toHaveLength(0);
  });

  it('throws on non-existent file', async () => {
    await expect(loadFile('/nonexistent/path/tools.json')).rejects.toThrow('Cannot read file');
  });

  it('throws when file is not an array', async () => {
    const { writeFile, unlink } = await import('node:fs/promises');
    const tmp = resolve(fixtures, 'edge-cases/not-array.json');
    await writeFile(tmp, JSON.stringify({ name: 'single-tool' }));
    try {
      await expect(loadFile(tmp)).rejects.toThrow('Expected an array');
    } finally {
      await unlink(tmp);
    }
  });

  it('throws on malformed JSON', async () => {
    const { writeFile, unlink } = await import('node:fs/promises');
    const tmp = resolve(fixtures, 'edge-cases/malformed.json');
    await writeFile(tmp, '{ invalid json }');
    try {
      await expect(loadFile(tmp)).rejects.toThrow('Failed to parse');
    } finally {
      await unlink(tmp);
    }
  });
});
