#!/usr/bin/env node
import { Command } from 'commander';
import { registerCheckCommand } from './cli/commands/check.js';

const program = new Command();

program
  .name('mcp-lint')
  .description('Lint MCP server tool schemas for cross-client compatibility')
  .version('0.1.0');

registerCheckCommand(program);

program.parse();
