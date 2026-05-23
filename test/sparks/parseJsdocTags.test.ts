import { test, expect } from 'vitest';
import { parseJsdocTags } from '../../src/sparks/parseJsdocTags.js';

const OPTIONAL = ['description', 'owner', 'kind', 'priority', 'linked', 'coverage', 'external'];

  /**
   * @description Proves returns empty object when no tags are present.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage sparks/parseJsdocTags
   */
  test('[META-001] returns empty object when no tags are present', () => {
  const result = parseJsdocTags('Just a description with no tags.', OPTIONAL);
  expect(result).toEqual({
    description: undefined,
    owner: undefined,
    kind: undefined,
    priority: undefined,
    linked: undefined,
    coverage: undefined,
    external: undefined,
    unknown: undefined,
  });
});

  /**
   * @description Proves parses a single @description tag.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage sparks/parseJsdocTags
   */
  test('[META-001] parses a single @description tag', () => {
  const body = `
 * @description verifies the loading state behaviour.
 `;
  const result = parseJsdocTags(body, OPTIONAL);
  expect(result.description).toBe('verifies the loading state behaviour.');
});

  /**
   * @description Proves parses @owner, @kind, @priority together.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage sparks/parseJsdocTags
   */
  test('[META-001] parses @owner, @kind, @priority together', () => {
  const body = `
 * @owner growth-experiments
 * @kind FR
 * @priority high
 `;
  const result = parseJsdocTags(body, OPTIONAL);
  expect(result.owner).toBe('growth-experiments');
  expect(result.kind).toBe('FR');
  expect(result.priority).toBe('high');
});

  /**
   * @description Proves parses comma-separated @linked tokens into an array.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage sparks/parseJsdocTags
   */
  test('[META-001] parses comma-separated @linked tokens into an array', () => {
  const body = `
 * @linked JIRA-1234, ADR-007 GH-#456
 `;
  const result = parseJsdocTags(body, OPTIONAL);
  expect(result.linked).toEqual(['JIRA-1234', 'ADR-007', 'GH-#456']);
});

  /**
   * @description Proves records unknown tags separately for the auditor.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage sparks/parseJsdocTags
   */
  test('[META-001] records unknown tags separately for the auditor', () => {
  const body = `
 * @reviewer alice
 * @owner team-x
 `;
  const result = parseJsdocTags(body, OPTIONAL);
  expect(result.owner).toBe('team-x');
  expect(result.unknown).toEqual([{ name: 'reviewer', value: 'alice' }]);
});

  /**
   * @description Proves ignores invalid priority values.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage sparks/parseJsdocTags
   */
  test('[META-001] ignores invalid priority values', () => {
  const body = `
 * @priority maybe
 `;
  const result = parseJsdocTags(body, OPTIONAL);
  expect(result.priority).toBeUndefined();
});
