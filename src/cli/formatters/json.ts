import type { Diagnostic } from '../../core/diagnostic.js';

export function formatJson(diagnostics: Diagnostic[]): string {
  return JSON.stringify(diagnostics, null, 2) + '\n';
}
