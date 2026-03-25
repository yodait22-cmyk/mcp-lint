#!/usr/bin/env node
import { Command } from 'commander';
import { registerCheckCommand } from './cli/commands/check.js';
import { registerFixCommand } from './cli/commands/fix.js';
import { registerInitCommand } from './cli/commands/init.js';

const program = new Command();

program
  .name('mcp-lint')
  .description('Lint MCP server tool schemas for cross-client compatibility')
  .version('0.1.0');

registerCheckCommand(program);
registerFixCommand(program);
registerInitCommand(program);

program.parse();
