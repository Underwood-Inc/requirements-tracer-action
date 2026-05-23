# Requirements Tracer

One repo: **CLI source**, **npm package**, and **GitHub Action**.

Published by [Underwood-Inc](https://github.com/Underwood-Inc).

| Surface | Install / use |
|---------|----------------|
| **GitHub Action** | `uses: Underwood-Inc/requirements-tracer-action@v0.1.2` |
| **npm CLI** | [@underwoodinc/requirements-tracer](https://www.npmjs.com/package/@underwoodinc/requirements-tracer) `@0.1.2` |
| **Local CLI** | `npm run build && npx trace audit --root .` |
| **Reference adopter** | [hello-desktop](https://github.com/Underwood-Inc/hello-desktop) |

## Documentation

| Guide | Description |
|-------|-------------|
| **[docs/index.md](./docs/index.md)** | Framework overview, audit rules, lifecycle |
| **[docs/onboarding.md](./docs/onboarding.md)** | Adoption guide — kinds, quick start, report search |
| **[docs/ci-integration.md](./docs/ci-integration.md)** | GitHub Actions, **line annotations**, PR comments |
| **[docs/configuration.md](./docs/configuration.md)** | `.traceability.yaml` and registry schema |
| **[docs/jsdoc-tags.md](./docs/jsdoc-tags.md)** | Optional JSDoc tag vocabulary |
| **[docs/architecture.md](./docs/architecture.md)** | Internal CLI layout (contributors) |

Legacy link: [docs/ONBOARDING.md](./docs/onboarding.md) (same guide; uppercase path for older links).

## GitHub Actions (recommended)

Your project needs `requirements-registry.yaml`, `.traceability.yaml`, and tests tagged like `test('[FR-001] loads home view', …)`.

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

      - uses: Underwood-Inc/requirements-tracer-action@v0.1.2
        with:
          tracer-package: '@underwoodinc/requirements-tracer@0.1.2'
          token: ${{ secrets.GITHUB_TOKEN }}
```

See [docs/ci-integration.md](./docs/ci-integration.md) for monorepo setups, `--strict`, and annotation details.

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
docs/         # Traceability framework documentation
src/          # CLI source (TypeScript)
test/         # Vitest tests
dist/         # build output (npm publish)
```

## License

MIT — see [LICENSE](./LICENSE).
