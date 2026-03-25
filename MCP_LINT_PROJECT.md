# MCP-LINT — Project Specification

> CLI tool that validates MCP server tool schemas for cross-client compatibility.
> Detects issues, auto-fixes them, and outputs results in terminal, JSON, or Markdown.

---

## 1. Problem Statement

MCP (Model Context Protocol) servers expose tool schemas that are consumed by different AI clients: **Claude**, **Cursor**, **Gemini**, **VS Code (Copilot)**. Each client has different levels of JSON Schema support and quirks in how it parses tool definitions. A schema that works perfectly in Claude may silently break in Cursor or VS Code.

There is currently **no standard linting tool** that checks MCP tool schemas against known client compatibility issues. Server authors discover problems only after users report failures — often with no clear error message.

**mcp-lint** fills this gap: run one command, get a clear report of what's broken and where, with optional auto-fix.

---

## 2. Core Concept

```
mcp-lint check ./my-server/tools.json
mcp-lint check --server stdio -- node my-server.js
mcp-lint fix ./my-server/tools.json --output fixed-tools.json
```

**Input sources:**
- Static JSON/YAML file containing tool definitions (array of MCP `Tool` objects)
- Live MCP server via stdio or SSE transport (connect → `tools/list` → disconnect)

**Output formats:**
- **Terminal** (default): colored, human-readable report with severity indicators
- **JSON**: machine-readable array of diagnostics (for CI/CD pipelines)
- **Markdown**: formatted report (for PRs, docs, GitHub Actions summaries)

---

## 3. Architecture

```
mcp-lint/
├── src/
│   ├── index.ts                 # CLI entry point (Commander.js)
│   ├── cli/
│   │   ├── commands/
│   │   │   ├── check.ts         # `mcp-lint check` command
│   │   │   ├── fix.ts           # `mcp-lint fix` command
│   │   │   └── init.ts          # `mcp-lint init` (generate config)
│   │   └── formatters/
│   │       ├── terminal.ts      # Colored terminal output
│   │       ├── json.ts          # JSON diagnostic output
│   │       └── markdown.ts      # Markdown report output
│   ├── core/
│   │   ├── engine.ts            # Main lint engine - orchestrates rules
│   │   ├── rule.ts              # Rule interface/types
│   │   ├── severity.ts          # error | warning | info
│   │   ├── diagnostic.ts        # Diagnostic result type
│   │   └── fixer.ts             # Auto-fix engine
│   ├── rules/
│   │   ├── index.ts             # Rule registry (exports all rules)
│   │   ├── no-required-false.ts
│   │   ├── no-content-encoding.ts
│   │   ├── no-unsupported-formats.ts
│   │   ├── no-type-array-with-single.ts
│   │   ├── valid-json-schema-subset.ts
│   │   ├── description-exists.ts
│   │   ├── no-empty-enum.ts
│   │   ├── max-depth.ts
│   │   ├── no-recursive-refs.ts
│   │   └── client-specific/
│   │       ├── claude.ts        # Claude-specific schema issues
│   │       ├── cursor.ts        # Cursor-specific schema issues
│   │       ├── gemini.ts        # Gemini-specific schema issues
│   │       └── vscode.ts        # VS Code Copilot-specific schema issues
│   ├── loaders/
│   │   ├── file-loader.ts       # Load from JSON/YAML file
│   │   ├── stdio-loader.ts      # Connect to MCP server via stdio
│   │   └── sse-loader.ts        # Connect to MCP server via SSE
│   ├── config/
│   │   ├── config.ts            # Config file loading & defaults
│   │   └── schema.ts            # Config file JSON schema
│   └── utils/
│       ├── json-path.ts         # JSONPath utilities for diagnostics
│       └── schema-walker.ts     # Recursive schema traversal
├── tests/
│   ├── rules/                   # Unit tests per rule
│   │   ├── no-required-false.test.ts
│   │   ├── no-content-encoding.test.ts
│   │   └── ...
│   ├── core/
│   │   ├── engine.test.ts
│   │   └── fixer.test.ts
│   ├── loaders/
│   │   ├── file-loader.test.ts
│   │   └── stdio-loader.test.ts
│   ├── cli/
│   │   └── formatters.test.ts
│   └── fixtures/                # Test fixture schemas
│       ├── valid/
│       ├── invalid/
│       └── edge-cases/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .mcplintrc.json              # Example config
├── README.md
└── CHANGELOG.md
```

---

## 4. Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Language | **TypeScript** (strict mode) | Type safety, npm ecosystem |
| CLI framework | **Commander.js** | Mature, minimal, standard for Node CLIs |
| Testing | **Vitest** | Fast, TypeScript-native, good DX |
| Schema parsing | **ajv** (optional, for meta-validation) | Industry standard JSON Schema validator |
| YAML support | **yaml** package | For loading YAML tool definitions |
| MCP client | **@modelcontextprotocol/sdk** | Official SDK for stdio/SSE transport |
| Terminal output | **chalk** + **cli-table3** | Colored output + formatted tables |

---

## 5. Key Types

```typescript
// --- Severity ---
type Severity = 'error' | 'warning' | 'info';

// --- Diagnostic (single issue found) ---
interface Diagnostic {
  ruleId: string;           // e.g. "no-required-false"
  severity: Severity;
  message: string;          // Human-readable description
  toolName: string;         // Which MCP tool has the issue
  path: string;             // JSONPath to problematic schema node, e.g. "inputSchema.properties.query"
  clients: ClientId[];      // Which clients are affected
  fix?: Fix;                // Optional auto-fix
}

// --- Fix ---
interface Fix {
  description: string;
  apply: (schema: any) => any;  // Returns modified schema
}

// --- Rule ---
interface Rule {
  id: string;
  severity: Severity;       // Default severity (overridable via config)
  description: string;
  url?: string;             // Link to docs/explanation
  clients: ClientId[];      // Which clients this rule applies to
  check: (tool: MCPTool, context: RuleContext) => Diagnostic[];
}

// --- Client ---
type ClientId = 'claude' | 'cursor' | 'gemini' | 'vscode';

// --- MCP Tool (input) ---
interface MCPTool {
  name: string;
  description?: string;
  inputSchema: JSONSchema;
}

// --- Config (.mcplintrc.json) ---
interface Config {
  rules?: Record<string, Severity | 'off'>;  // Override rule severities
  clients?: ClientId[];                        // Filter to specific clients
  ignore?: string[];                           // Tool names to skip
}
```

---

## 6. Rules — Detailed Specification

### 6.1 Universal Rules (all clients)

#### `no-required-false`
- **Severity:** error
- **Detects:** `required: false` on individual properties (this is NOT valid JSON Schema — `required` is an array on the parent object, not a boolean on properties)
- **Example bad schema:**
  ```json
  {
    "properties": {
      "query": { "type": "string", "required": false }
    }
  }
  ```
- **Fix:** Remove `required: false` from the property. If the property name is in the parent's `required` array, remove it from there. If the parent has no `required` array, do nothing (property is already optional).
- **Why:** Some clients silently ignore this; others may throw or misinterpret optionality.

#### `no-content-encoding`
- **Severity:** error
- **Detects:** `contentEncoding` field in schema (e.g., `"contentEncoding": "base64"`)
- **Fix:** Remove `contentEncoding` field.
- **Why:** Not part of standard JSON Schema draft used by most MCP clients. Causes parse failures in strict validators.

#### `description-exists`
- **Severity:** warning
- **Detects:** Missing `description` on the tool itself or on individual parameters.
- **Fix:** None (cannot auto-generate meaningful descriptions).
- **Why:** All clients use descriptions for prompt construction. Missing descriptions degrade tool-use quality.

#### `no-empty-enum`
- **Severity:** error
- **Detects:** `"enum": []` — empty enum array.
- **Fix:** Remove the `enum` field.
- **Why:** An empty enum makes the parameter impossible to satisfy. Likely a bug.

#### `max-depth`
- **Severity:** warning
- **Detects:** Schema nesting deeper than 5 levels (configurable).
- **Fix:** None.
- **Why:** Deeply nested schemas confuse LLMs and increase token consumption. Keep flat.

#### `no-recursive-refs`
- **Severity:** error
- **Detects:** `$ref` that creates circular references.
- **Fix:** None.
- **Why:** Most MCP clients don't support recursive schemas. Causes infinite loops or crashes.

#### `valid-json-schema-subset`
- **Severity:** error
- **Detects:** Usage of JSON Schema keywords not in the MCP-supported subset: `$ref` (to external URIs), `if/then/else`, `oneOf`, `anyOf`, `allOf`, `not`, `patternProperties`, `additionalItems`, `dependencies`, `$dynamicRef`.
- **Fix:** Where possible, simplify (e.g., flatten `allOf` with single item). Otherwise, no fix.
- **Why:** MCP tool schemas should use a simple subset of JSON Schema. Advanced keywords are not reliably supported across clients.

#### `no-unsupported-formats`
- **Severity:** warning
- **Detects:** `"format"` values not widely supported: `"uri-reference"`, `"iri"`, `"iri-reference"`, `"idn-email"`, `"idn-hostname"`, `"json-pointer"`, `"relative-json-pointer"`, `"regex"`.
- **Fix:** Remove `format` field (leave as plain string).
- **Why:** Format validation is inconsistent. Most clients ignore unknown formats, but some may reject them.

### 6.2 Client-Specific Rules

#### `claude/no-type-array`
- **Severity:** warning
- **Clients:** `claude`
- **Detects:** `"type": ["string", "null"]` — array syntax for type.
- **Fix:** Convert to `"type": "string"` (drop null, or wrap in `anyOf` if nullable is important).
- **Why:** Claude's tool-use implementation may not handle type arrays correctly.

#### `cursor/no-default-without-type`
- **Severity:** error
- **Clients:** `cursor`
- **Detects:** Properties with `default` but no explicit `type`.
- **Fix:** Infer type from default value and add it.
- **Why:** Cursor requires explicit types when defaults are present.

#### `gemini/no-optional-without-default`
- **Severity:** warning
- **Clients:** `gemini`
- **Detects:** Optional parameters (not in `required`) without a `default` value.
- **Fix:** None (cannot guess defaults).
- **Why:** Gemini handles optional params better when defaults are explicit.

#### `vscode/max-params`
- **Severity:** warning
- **Clients:** `vscode`
- **Detects:** Tools with more than 15 parameters.
- **Fix:** None.
- **Why:** VS Code Copilot performance degrades with many parameters.

#### `gemini/no-nested-objects`
- **Severity:** warning
- **Clients:** `gemini`
- **Detects:** Object properties nested more than 2 levels deep.
- **Fix:** None (would require schema restructuring).
- **Why:** Gemini's function calling has limited support for deeply nested object parameters.

> **Note:** Client-specific rules are living documentation. As clients update their MCP support, rules should be updated accordingly. Each rule file should include a comment with the source/date of the compatibility information.

---

## 7. CLI Commands

### `mcp-lint check`

```bash
# Check a static file
mcp-lint check tools.json
mcp-lint check tools.yaml

# Check a live MCP server (stdio)
mcp-lint check --server stdio -- node my-server.js
mcp-lint check --server stdio -- python my_server.py

# Check a live MCP server (SSE)
mcp-lint check --server sse --url http://localhost:3000/sse

# Options
--format terminal|json|markdown    # Output format (default: terminal)
--clients claude,cursor,gemini     # Filter to specific clients
--severity error                   # Minimum severity to report
--config .mcplintrc.json           # Custom config path
--ignore "tool1,tool2"             # Skip specific tools
--no-color                         # Disable terminal colors
--quiet                            # Only output errors (no warnings/info)
```

**Exit codes:**
- `0` — No errors found (warnings/info don't count)
- `1` — Errors found
- `2` — Invalid input / configuration error

### `mcp-lint fix`

```bash
# Fix a static file (writes to stdout by default)
mcp-lint fix tools.json
mcp-lint fix tools.json --output fixed-tools.json
mcp-lint fix tools.json --in-place    # Overwrite original

# Options
--dry-run                          # Show what would be fixed without applying
--rules "no-required-false,..."    # Only apply specific fixes
```

### `mcp-lint init`

```bash
# Generate a default .mcplintrc.json in current directory
mcp-lint init
```

---

## 8. Configuration (`.mcplintrc.json`)

```json
{
  "$schema": "https://raw.githubusercontent.com/[repo]/main/config-schema.json",
  "rules": {
    "no-required-false": "error",
    "description-exists": "warning",
    "max-depth": "off",
    "claude/no-type-array": "error"
  },
  "clients": ["claude", "cursor", "gemini", "vscode"],
  "ignore": ["internal-debug-tool"],
  "maxDepth": 5
}
```

Config resolution order (first wins):
1. `--config` CLI flag
2. `.mcplintrc.json` in current directory
3. `.mcplintrc.json` in parent directories (up to home)
4. Built-in defaults

---

## 9. Development Phases

### Phase 1 — Core Engine + Universal Rules
**Goal:** Working CLI that checks static JSON files with universal rules and terminal output.

**Tasks:**
1. Project scaffolding: `package.json`, `tsconfig.json`, `vitest.config.ts`, directory structure
2. Implement `Rule` interface and `Diagnostic` type
3. Implement `engine.ts` — loads rules, runs them against tools, collects diagnostics
4. Implement `file-loader.ts` — reads JSON/YAML files, parses into `MCPTool[]`
5. Implement universal rules:
   - `no-required-false`
   - `no-content-encoding`
   - `description-exists`
   - `no-empty-enum`
   - `valid-json-schema-subset`
   - `no-unsupported-formats`
   - `max-depth`
   - `no-recursive-refs`
6. Implement `schema-walker.ts` — recursive schema traversal helper
7. Implement `terminal.ts` formatter — colored output with severity icons
8. Wire up `check` command in Commander.js
9. Write tests for each rule (at least 3 test cases per rule: valid, invalid, edge case)
10. Write test fixtures in `tests/fixtures/`

**Deliverable:** `mcp-lint check tools.json` works with terminal output.

### Phase 2 — Auto-Fix + All Output Formats + Config
**Goal:** Fix command, JSON/Markdown output, config file support.

**Tasks:**
1. Implement `fixer.ts` — applies `Fix` functions from diagnostics
2. Add `fix` property to applicable rules (no-required-false, no-content-encoding, no-empty-enum, cursor/no-default-without-type)
3. Implement `fix` CLI command
4. Implement `json.ts` formatter
5. Implement `markdown.ts` formatter
6. Implement `config.ts` — load `.mcplintrc.json`, merge with defaults
7. Implement `init` CLI command
8. Add `--format`, `--severity`, `--config`, `--ignore`, `--quiet` flags
9. Tests for fix engine, formatters, config loading

**Deliverable:** Full CLI with check, fix, init commands and all output formats.

### Phase 3 — Client-Specific Rules + Live Server Connection
**Goal:** Connect to running MCP servers, client-specific rule sets.

**Tasks:**
1. Implement client-specific rules:
   - `claude/no-type-array`
   - `cursor/no-default-without-type`
   - `gemini/no-optional-without-default`
   - `gemini/no-nested-objects`
   - `vscode/max-params`
2. Implement `stdio-loader.ts` — spawn process, MCP handshake, `tools/list`, collect, disconnect
3. Implement `sse-loader.ts` — HTTP connection to SSE MCP server
4. Add `--server` and `--url` flags to `check` command
5. Add `--clients` filter flag
6. Integration tests with mock MCP servers
7. README.md with full documentation
8. npm publish setup (`package.json` bin field, prepublish build)

**Deliverable:** Complete v1.0 — publishable to npm.

---

## 10. Testing Strategy

**Framework:** Vitest

**Test structure:**
- **Unit tests per rule:** Each rule file has a corresponding `.test.ts` with:
  - At least 1 valid schema (should produce 0 diagnostics)
  - At least 1 clearly invalid schema (should produce exact expected diagnostic)
  - At least 1 edge case (boundary condition, nested schema, etc.)
- **Engine tests:** Verify rule orchestration, deduplication, severity filtering
- **Fixer tests:** Verify fix application produces valid schemas, doesn't break other parts
- **Formatter tests:** Snapshot tests for terminal, JSON, Markdown output
- **Loader tests:** File parsing (JSON, YAML, malformed), stdio mock server
- **CLI integration tests:** End-to-end command execution with exit code verification

**Test fixtures** (`tests/fixtures/`):
```
fixtures/
├── valid/
│   ├── minimal-tool.json         # Bare minimum valid tool
│   ├── complex-tool.json         # Many params, nested, all valid
│   └── multi-tool.json           # File with multiple tools
├── invalid/
│   ├── required-false.json
│   ├── content-encoding.json
│   ├── empty-enum.json
│   ├── deep-nesting.json
│   ├── recursive-ref.json
│   └── mixed-issues.json         # Multiple different issues
└── edge-cases/
    ├── empty-file.json
    ├── no-tools.json
    ├── unicode-descriptions.json
    └── large-schema.json
```

**Coverage target:** 90%+ line coverage on `src/core/` and `src/rules/`.

---

## 11. npm Package Configuration

```json
{
  "name": "mcp-lint",
  "version": "0.1.0",
  "description": "Lint MCP server tool schemas for cross-client compatibility",
  "bin": {
    "mcp-lint": "./dist/index.js"
  },
  "main": "./dist/core/engine.js",
  "types": "./dist/core/engine.d.ts",
  "files": ["dist/"],
  "keywords": ["mcp", "model-context-protocol", "lint", "schema", "validation", "claude", "cursor", "gemini", "vscode"],
  "license": "MIT",
  "engines": { "node": ">=18" },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src/",
    "prepublishOnly": "npm run build && npm run test"
  }
}
```

**Also export as library** — developers can use mcp-lint programmatically:

```typescript
import { lint, fix } from 'mcp-lint';

const diagnostics = await lint(tools, { clients: ['claude', 'cursor'] });
const fixedTools = await fix(tools);
```

---

## 12. README Structure

1. **Hero section** — one-liner, badges (npm, CI, coverage)
2. **Problem** — why this exists (2-3 sentences)
3. **Quick start** — `npx mcp-lint check tools.json`
4. **Installation** — npm global, npx, local dev dependency
5. **Usage** — check, fix, init with examples
6. **Rules reference** — table of all rules with severity, clients, fixable status
7. **Configuration** — `.mcplintrc.json` example
8. **CI/CD integration** — GitHub Actions example
9. **Programmatic API** — import and use as library
10. **Contributing** — how to add new rules

---

## 13. CI/CD GitHub Actions Example (for users of mcp-lint)

```yaml
# .github/workflows/mcp-lint.yml
name: MCP Schema Lint
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npx mcp-lint check ./src/tools.json --format json > lint-results.json
      - run: npx mcp-lint check ./src/tools.json --format markdown >> $GITHUB_STEP_SUMMARY
```

---

## 14. Constraints & Decisions

- **No runtime dependencies on specific MCP server implementations** — mcp-lint is client-side only
- **Rules are deterministic** — same input always produces same diagnostics, no network calls in rules
- **Auto-fix is conservative** — only fixes that are 100% safe (no semantic changes). If a fix might change behavior, it's not auto-fixable
- **Schema validation, not runtime testing** — mcp-lint checks the schema definition, not actual tool behavior
- **Node.js >= 18** — uses native fetch, structured clone, etc.

---

## 15. Future Ideas (Post v1.0)

- **VS Code extension** — inline diagnostics in schema files
- **Watch mode** — re-lint on file change
- **Custom rule API** — plugin system for user-defined rules
- **MCP Hub integration** — lint schemas from the MCP server registry
- **Schema diff** — compare two versions and show compatibility changes
- **Severity auto-tuning** — based on which clients user actually targets
