# Requirements Tracer — GitHub Action

Composite GitHub Action that runs the **requirements-tracer** CLI in CI:

1. **Audit** — scan tests for trace IDs and validate them against your requirements registry
2. **Report** — generate a self-contained HTML traceability report
3. **Artifact** — upload the report for download from the Actions run
4. **Comment** — post a new PR summary comment on pull requests

Published by [Underwood-Inc](https://github.com/Underwood-Inc).

**Published repo:** https://github.com/Underwood-Inc/requirements-tracer-action — tag `v0.1.1`.

This folder is the source copy in the monorepo; CI consumers use `Underwood-Inc/requirements-tracer-action@v0.1.1`, not `./packages/...`.

## Quick start

Your project directory needs:

- `requirements-registry.yaml` — source of truth for requirement IDs
- `.traceability.yaml` — globs, kinds, output paths
- Tests whose descriptions include trace IDs, e.g. `test('[FR-001] loads home view', …)`

### With published npm CLI (recommended)

```yaml
permissions:
  contents: read
  pull-requests: write
  checks: write

jobs:
  traceability:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: Underwood-Inc/requirements-tracer-action@v0.1.1
        with:
          tracer-package: '@underwoodinc/requirements-tracer@0.1.1'
          token: ${{ secrets.GITHUB_TOKEN }}
```

### With a vendored / monorepo tracer checkout

```yaml
      - uses: actions/checkout@v6

      - uses: pnpm/action-setup@v6
        with:
          version: 10

      - uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - uses: Underwood-Inc/requirements-tracer-action@v0.1.1
        with:
          working-directory: apps/my-app
          tracer-path: tools/requirements-tracer/dist/frames/cli.js
          build-tracer: 'true'
          token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `working-directory` | `.` | Root passed to `--root` (contains config + registry). |
| `config-path` | `.traceability.yaml` | Relative to `working-directory`. |
| `registry-path` | `requirements-registry.yaml` | Relative to `working-directory`. |
| `tracer-path` | `tools/requirements-tracer/dist/frames/cli.js` | Path to `cli.js` from repo root. Ignored when `tracer-package` is set. |
| `tracer-package` | *(empty)* | npm package for `npx` (optional `@version` suffix). |
| `build-tracer` | `false` | Run `pnpm build:tracer` at repo root before audit. |
| `strict` | `false` | Pass `--strict` (orphan / deprecated / unknown-tag warnings → errors). |
| `post-comment` | `true` | Post PR comment on `pull_request` events. |
| `artifact-name` | `traceability-report` | Uploaded artifact name. |
| `report-dir` | `traceability-report` | Report folder relative to `working-directory`. |
| `token` | `github.token` | Token for PR comments. |
| `node-version` | `22` | Node.js version (tracer requires Node ≥ 22). |

## Outputs

| Output | Description |
|--------|-------------|
| `audit-outcome` | `success` or `failure` from the audit step. |

## License

MIT — see [LICENSE](./LICENSE).
