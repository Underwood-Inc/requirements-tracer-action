import { test, expect } from 'vitest';
import { resolveLinkedToken } from '../../src/sparks/resolveLinkedToken.js';

const resolvers = [
  { prefix: 'JIRA-', template: 'https://example.atlassian.net/browse/JIRA-{id}' },
  { prefix: 'GH-#', template: 'https://github.com/org/repo/issues/{id}' },
];

  /**
   * @description Proves resolves a JIRA token to its full URL.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage sparks/resolveLinkedToken
   */
  test('[META-001] resolves a JIRA token to its full URL', () => {
  expect(resolveLinkedToken('JIRA-1234', resolvers))
    .toBe('https://example.atlassian.net/browse/JIRA-1234');
});

  /**
   * @description Proves resolves a GitHub-issue token to its full URL.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage sparks/resolveLinkedToken
   */
  test('[META-001] resolves a GitHub-issue token to its full URL', () => {
  expect(resolveLinkedToken('GH-#42', resolvers))
    .toBe('https://github.com/org/repo/issues/42');
});

  /**
   * @description Proves returns the original token when no resolver matches.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage sparks/resolveLinkedToken
   */
  test('[META-001] returns the original token when no resolver matches', () => {
  expect(resolveLinkedToken('FOO-1', resolvers)).toBe('FOO-1');
});
