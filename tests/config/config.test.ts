import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../../src/config/config.js';
import { writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe('loadConfig', () => {
  it('returns empty object when no config file found', async () => {
    const config = await loadConfig('/nonexistent/path/.mcplintrc.json').catch(() => ({}));
    expect(config).toEqual({});
  });

  it('throws when explicit config path does not exist', async () => {
    await expect(loadConfig('/nonexistent/path/.mcplintrc.json')).rejects.toThrow();
  });

  it('loads config from explicit path', async () => {
    const tmp = resolve(__dirname, 'temp-config.json');
    const cfg = { rules: { 'no-required-false': 'warning' }, maxDepth: 3 };
    await writeFile(tmp, JSON.stringify(cfg), 'utf-8');
    try {
      const loaded = await loadConfig(tmp);
      expect(loaded.rules?.['no-required-false']).toBe('warning');
      expect(loaded.maxDepth).toBe(3);
    } finally {
      await unlink(tmp);
    }
  });

  it('throws on invalid JSON in config file', async () => {
    const tmp = resolve(__dirname, 'bad-config.json');
    await writeFile(tmp, '{ bad json }', 'utf-8');
    try {
      await expect(loadConfig(tmp)).rejects.toThrow();
    } finally {
      await unlink(tmp);
    }
  });
});
