import { test, expect } from 'vitest';
import { mergeRegistryShards } from '../../src/motes/mergeRegistryShards.js';
import { parseRegistryDocument } from '../../src/motes/parseRegistryDocument.js';

  /**
   * @description Proves duplicate requirement IDs across shards fail the merge.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage motes/mergeRegistryShards
   */
  test('[META-001] mergeRegistryShards rejects duplicate requirement IDs', () => {
    const row = `
requirements:
  FR-001:
    kind: FR
    title: One
`;
    const a = parseRegistryDocument(row, 'a.fr.yaml');
    const b = parseRegistryDocument(row, 'b.fr.yaml');
    expect(() =>
      mergeRegistryShards([
        { path: 'a.fr.yaml', requirements: a.requirements },
        { path: 'b.fr.yaml', requirements: b.requirements },
      ]),
    ).toThrow(/Duplicate requirement FR-001/);
  });

  /**
   * @description Proves filename kind suffix must match row kind when enforced.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage motes/mergeRegistryShards
   */
  test('[META-002] mergeRegistryShards enforces filename kind suffix', () => {
    const doc = parseRegistryDocument(
      `
requirements:
  SEC-001:
    kind: SEC
    title: Secret
`,
      'wrong.fr.yaml',
    );
    expect(() =>
      mergeRegistryShards([{ path: 'wrong.fr.yaml', requirements: doc.requirements }], {
        enforceFilenameKind: true,
      }),
    ).toThrow(/expects kind FR/);
  });

  /**
   * @description Proves multiple shards merge into one registry map.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage motes/mergeRegistryShards
   */
  test('[META-001] mergeRegistryShards combines disjoint shard maps', () => {
    const fr = parseRegistryDocument(
      `
requirements:
  FR-001:
    kind: FR
    title: Functional
`,
      'feature.fr.yaml',
    );
    const meta = parseRegistryDocument(
      `
requirements:
  META-001:
    kind: META
    title: Meta
`,
      'meta.yaml',
    );
    const merged = mergeRegistryShards([
      { path: 'feature.fr.yaml', requirements: fr.requirements },
      { path: 'requirements/meta.yaml', requirements: meta.requirements },
    ]);
    expect(merged.schema_version).toBe(1);
    expect(Object.keys(merged.requirements).sort()).toEqual(['FR-001', 'META-001']);
  });
