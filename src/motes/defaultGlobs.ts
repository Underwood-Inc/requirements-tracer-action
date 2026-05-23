/**
 * Default test glob patterns covering Jest, Vitest, Cypress, and Playwright.
 * Used when `.traceability.yaml` does not provide `testGlobs`.
 */
export const DEFAULT_TEST_GLOBS: readonly string[] = [
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
  'cypress/**/*.cy.ts',
  'cypress/**/*.cy.tsx',
  'tests/e2e/**/*.spec.ts',
  'e2e/**/*.spec.ts',
];

export const DEFAULT_EXCLUDES: readonly string[] = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.next/**',
  '**/build/**',
  '**/coverage/**',
  '**/traceability-report/**',
];
