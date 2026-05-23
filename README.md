# Requirements Tracer

One repo: **CLI source**, **npm package**, and **GitHub Action**.

Published by [Underwood-Inc](https://github.com/Underwood-Inc).

| Surface | Install / use |
|---------|----------------|
| **GitHub Action** | `uses: Underwood-Inc/requirements-tracer-action@v0.1.1` |
| **npm CLI** | `npm install -D @underwoodinc/requirements-tracer` |
| **Local CLI** | `npm run build && npx trace audit --root .` |

## GitHub Actions (recommended)

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

Your project needs `requirements-registry.yaml`, `.traceability.yaml`, and tests tagged like `test('[FR-001] loads home view', …)`.

## CLI commands

```bash
trace audit --root .
trace report --root .
trace scan --root .
trace comment --root . --new
```

## Development

```bash
npm install
npm test
npm run build
```

Requires Node.js 22+.

## Layout

```
action.yml    # GitHub Action (composite)
src/          # CLI source (TypeScript)
test/         # Vitest tests
dist/         # build output (npm publish)
```

## License

MIT
