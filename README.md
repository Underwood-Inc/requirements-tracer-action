# Requirements Tracer

Link every automated test to a requirement ID in a YAML registry, audit that link in CI, and publish a searchable HTML report on every pull request.

One repository ships three surfaces: **npm CLI**, **GitHub Action**, and **TypeScript source** for contributors.

Published by [Underwood-Inc](https://github.com/Underwood-Inc).

| Surface | Install / use |
|---------|----------------|
| **GitHub Action** | `uses: Underwood-Inc/requirements-tracer-action@v0.1.3` |
| **npm CLI** | [`@underwoodinc/requirements-tracer`](https://www.npmjs.com/package/@underwoodinc/requirements-tracer) `@0.1.3` |
| **Programmatic API** | `@underwoodinc/requirements-tracer/load-registry` |
| **Reference adopter** | [hello-desktop](https://github.com/Underwood-Inc/hello-desktop) |

Full documentation: **[docs/onboarding.md](./docs/onboarding.md)** (start here) · [docs/index.md](./docs/index.md)

---

## How it works

1. **`requirements-registry.yaml`** (or co-located shards via `registryGlobs`) lists every requirement ID, kind, and title.
2. **`.traceability.yaml`** configures test globs, trace-ID regex, output paths, and branding.
3. Tests reference IDs in the **description string**: `test('[FR-001] loads home view', …)`.
4. **`trace audit`** cross-checks tests ↔ registry (missing IDs, unknown IDs, kind mismatches, orphans).
5. **`trace report`** writes a self-contained **`index.html`** + **`summary.json`**.
6. In CI, the Action adds **inline PR annotations**, uploads the report, and posts a **PR comment** with a direct artifact download link.

Requirement kinds (`FR`, `NFR`, `SEC`, `BR`, and custom keys like `META`, `A11Y`) are first-class — not FR-only.

---

## Quick start (15 minutes)

### 1. Install the CLI

```bash
npm install -D @underwoodinc/requirements-tracer@0.1.3
```

### 2. Add a registry

```yaml
# requirements-registry.yaml
schema_version: 1
requirements:
  FR-001:
    kind: FR
    title: Application loads home view
    status: active
  SEC-001:
    kind: SEC
    title: Session cookie is HttpOnly
    status: active
    priority: critical
```

For large products, split shards and merge with `registryGlobs` in `.traceability.yaml` — see [docs/configuration.md](./docs/configuration.md).

### 3. Add config

```yaml
# .traceability.yaml
schema_version: 1

traceIdPattern: "\\[((?:[A-Z][A-Z0-9]*-)+\\d+)(?:,\\s*((?:[A-Z][A-Z0-9]*-)+\\d+))*\\]"
requireTraceId: error

kinds:
  FR:  { label: Functional }
  SEC: { label: Security }

testGlobs:
  - "**/*.test.ts"
  - "**/*.spec.ts"

output:
  reportDir: traceability-report
  reportEntry: index.html

branding:
  projectName: my-app
  docsUrl: https://github.com/Underwood-Inc/requirements-tracer-action/tree/main/docs
```

### 4. Tag tests

```typescript
test('[FR-001] loads home view', () => { /* … */ });
test('[SEC-001] session cookie is HttpOnly', () => { /* … */ });
```

### 5. Run locally

```bash
npx trace audit --root .
npx trace report --root .
# open traceability-report/index.html
```

Add scripts to `package.json`:

```json
{
  "scripts": {
    "trace:audit": "trace audit --root . --config .traceability.yaml",
    "trace:report": "trace report --root . --config .traceability.yaml",
    "trace:scan": "trace scan --root . --config .traceability.yaml"
  }
}
```

---

## GitHub Actions (recommended)

```yaml
permissions:
  contents: read
  pull-requests: write   # PR comments
  checks: write          # line annotations on the diff

jobs:
  traceability:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: Underwood-Inc/requirements-tracer-action@v0.1.3
        with:
          tracer-package: '@underwoodinc/requirements-tracer@0.1.3'
          token: ${{ secrets.GITHUB_TOKEN }}
```

The Action runs, in order: **audit** (with `TRACE_ANNOTATIONS=github`) → **report** → **upload-artifact@v7** → **PR comment** (with direct `artifact-url`) → fail if audit had errors.

### Action inputs

| Input | Default | Purpose |
|-------|---------|---------|
| `working-directory` | `.` | Passed to `--root` |
| `config-path` | `.traceability.yaml` | Relative to working-directory |
| `registry-path` | `requirements-registry.yaml` | Legacy monolith path; shards use `registryGlobs` in config |
| `tracer-package` | *(empty)* | **Recommended:** `@underwoodinc/requirements-tracer@0.1.3` |
| `tracer-path` | `dist/frames/cli.js` | Vendored CLI from repo root; ignored when `tracer-package` is set |
| `build-tracer` | `false` | Run `pnpm build:tracer` before audit (fork contributors only) |
| `strict` | `false` | Promote orphan / deprecated / unknown-tag warnings to errors |
| `post-comment` | `true` | Set `false` if you post your own PR summary |
| `report-dir` | `traceability-report` | Must match `.traceability.yaml` → `output.reportDir` |
| `artifact-name` | `traceability-report` | Uploaded artifact name |
| `token` | `github.token` | Needs `pull-requests: write` when `post-comment` is true |
| `node-version` | `22` | Node for `npx` |

### Custom PR comments

If your workflow already posts a tailored summary (e.g. combined with coverage or valuation reports), disable the built-in comment and keep audit + report:

```yaml
- uses: Underwood-Inc/requirements-tracer-action@v0.1.3
  with:
    tracer-package: '@underwoodinc/requirements-tracer@0.1.3'
    post-comment: 'false'
    report-dir: reports/trace-report   # match output.reportDir in .traceability.yaml
    artifact-name: my-trace-report
    token: ${{ secrets.GITHUB_TOKEN }}
```

Read `summary.json` from the report directory for machine-readable counts (`tests_scanned`, `coverage_pct`, `by_kind`, `untested_ids`, …).

Details: [docs/ci-integration.md](./docs/ci-integration.md)

---

## CLI reference

| Command | Purpose | Exit code |
|---------|---------|-----------|
| `trace scan --root .` | JSON list of parsed test cases | `0` |
| `trace audit --root .` | Validate trace IDs; print findings | `1` if errors |
| `trace report --root .` | Write HTML + `summary.json` | `0` on success |
| `trace comment --root . --new` | Post PR comment (CI only) | `0` on success |

Flags: `--config .traceability.yaml`, `--registry requirements-registry.yaml`, `--strict`.

Environment (CI): `TRACE_ANNOTATIONS=github` (audit), `TRACE_ARTIFACT_URL` (comment), `GITHUB_TOKEN`, `GITHUB_PR_NUMBER`.

---

## Programmatic API

Load and merge registry shards from Node scripts (Vite plugins, report generators, etc.):

```javascript
import {
  loadRequirementsRegistrySync,
  registryToJsonDocument,
} from '@underwoodinc/requirements-tracer/load-registry';

const registry = loadRequirementsRegistrySync({
  rootDir: process.cwd(),
  registryGlobs: ['requirements/*.yaml', 'src/**/*.fr.yaml'],
});

console.log(Object.keys(registry.requirements).length);
```

---

## Report outputs

Written to `output.reportDir` from `.traceability.yaml` (default `traceability-report/`):

| File | Purpose |
|------|---------|
| `index.html` | Self-contained searchable report (`@fr`, `@untested`, `#tags`, quoted search) |
| `summary.json` | Machine-readable counts for CI comments and automation |
| `audit.json` | Raw audit findings |

---

## Documentation

| Guide | Description |
|-------|-------------|
| [docs/onboarding.md](./docs/onboarding.md) | Adoption — kinds, trace ID shapes, report search tokens |
| [docs/index.md](./docs/index.md) | Overview, audit rules, lifecycle |
| [docs/ci-integration.md](./docs/ci-integration.md) | Annotations, PR comments, Action wiring |
| [docs/configuration.md](./docs/configuration.md) | `.traceability.yaml` and registry schema |
| [docs/jsdoc-tags.md](./docs/jsdoc-tags.md) | Optional JSDoc on tests |
| [docs/architecture.md](./docs/architecture.md) | Source layout (contributors) |

---

## Development (this repository)

```bash
npm install
npm test
npm run build
node dist/frames/cli.js audit --root /path/to/adopter --config .traceability.yaml
```

Requires **Node.js 22+**. Published npm `files` include `dist/` only; build before packing.

```
action.yml    # GitHub Action (composite)
docs/         # Framework documentation
src/          # CLI source (TypeScript)
test/         # Vitest tests
dist/         # Build output (npm publish)
```

---

## License

MIT — see [LICENSE](./LICENSE).
