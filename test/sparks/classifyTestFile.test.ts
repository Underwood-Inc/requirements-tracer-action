import { test, expect } from 'vitest';
import { classifyTestFile } from '../../src/sparks/classifyTestFile.js';

  /**
   * @description Proves classifies *.cy.ts as cypress.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage sparks/classifyTestFile
   */
  test('[META-001] classifies *.cy.ts as cypress', () => {
  expect(classifyTestFile('app/login.cy.ts', '')).toBe('cypress');
});

  /**
   * @description Proves classifies imports from vitest as vitest.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage sparks/classifyTestFile
   */
  test('[META-001] classifies imports from vitest as vitest', () => {
  expect(classifyTestFile('src/foo.test.ts', "import { test } from 'vitest';\ntest('x', () => {});")).toBe('vitest');
});

  /**
   * @description Proves classifies @jest/globals imports as jest.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage sparks/classifyTestFile
   */
  test('[META-001] classifies @jest/globals imports as jest', () => {
  const src = "import { test } from '@jest/globals';\ntest('x', () => {});";
  expect(classifyTestFile('src/foo.test.ts', src)).toBe('jest');
});

  /**
   * @description Proves classifies @playwright/test imports as playwright.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage sparks/classifyTestFile
   */
  test('[META-001] classifies @playwright/test imports as playwright', () => {
  const src = "import { test, expect } from '@playwright/test';\ntest('x', () => {});";
  expect(classifyTestFile('e2e/foo.spec.ts', src)).toBe('playwright');
});

  /**
   * @description Proves falls back to unknown when no signal is present.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage sparks/classifyTestFile
   */
  test('[META-001] falls back to unknown when no signal is present', () => {
  expect(classifyTestFile('src/foo.test.ts', "test('x', () => {});")).toBe('unknown');
});
