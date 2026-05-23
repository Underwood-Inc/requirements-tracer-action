# Publishing `@underwoodinc/requirements-tracer` to npm

The **npm package page** shows whatever `README.md` ships in the published tarball — it is **not** synced from GitHub automatically.

---

## Recommended: publish from this repository (root)

```bash
npm install
npm test
npm run build
npm publish --access public
```

This uses:

- `package.json` → `"version": "0.1.3"` (bump before each release)
- `README.md` at repo root → **npm Documentation tab** (full GitHub readme)
- `dist/` → compiled CLI (`trace` bin)

Requires npm login as an `@underwoodinc` maintainer and OTP when prompted.

---

## Alternative: publish from monorepo staging folder

If you still use the `__CODE` monorepo copy:

```bash
cd tools/requirements-tracer
npm run build
# copy dist → publish/dist, sync publish/package.json + publish/README.md
cd publish
npm publish --access public
```

The monorepo `publish/README.md` is an **npm-focused** readme (shorter, deep-links to `docs/` on GitHub). Use it when publishing from `publish/` only.

---

## After npm publish

1. **Git tag** (Action consumers pin `@v0.1.3`):

   ```bash
   git tag v0.1.3
   git push origin v0.1.3
   ```

2. **GitHub Release** — optional notes pointing to [docs/onboarding.md](./onboarding.md).

3. **Adopters** — update `tracer-package: '@underwoodinc/requirements-tracer@0.1.3'` and `uses: Underwood-Inc/requirements-tracer-action@v0.1.3`.

---

## Dry run

```bash
npm pack
# inspect underwoodinc-requirements-tracer-0.1.3.tgz — README.md should be present
```
