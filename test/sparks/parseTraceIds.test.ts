import { test, expect } from 'vitest';
import { parseTraceIds } from '../../src/sparks/parseTraceIds.js';
import { DEFAULT_TRACE_ID_PATTERN } from '../../src/motes/traceIdPattern.js';

  /**
   * @description Proves returns an empty list for a description without trace IDs.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage sparks/parseTraceIds
   */
  test('[META-001] returns an empty list for a description without trace IDs', () => {
  expect(parseTraceIds('returns the total', DEFAULT_TRACE_ID_PATTERN)).toEqual([]);
});

  /**
   * @description Proves extracts a single trace ID from the start of the description.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage sparks/parseTraceIds
   */
  test('[META-001] extracts a single trace ID from the start of the description', () => {
  expect(parseTraceIds('[FR-001] shows loading state', DEFAULT_TRACE_ID_PATTERN)).toEqual(['FR-001']);
});

  /**
   * @description Proves extracts multiple comma-separated trace IDs.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage sparks/parseTraceIds
   */
  test('[META-001] extracts multiple comma-separated trace IDs', () => {
  expect(parseTraceIds('[FR-001, BR-001] does the thing', DEFAULT_TRACE_ID_PATTERN)).toEqual(['FR-001', 'BR-001']);
});

  /**
   * @description Proves deduplicates repeated IDs.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage sparks/parseTraceIds
   */
  test('[META-001] deduplicates repeated IDs', () => {
  expect(
    parseTraceIds('[FR-001] does thing [FR-001] again', DEFAULT_TRACE_ID_PATTERN),
  ).toEqual(['FR-001']);
});

  /**
   * @description Proves supports non-global regex inputs by re-compiling.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage sparks/parseTraceIds
   */
  test('[META-001] supports non-global regex inputs by re-compiling', () => {
  const pattern = /\[([A-Z]+-\d+)\]/;
  expect(parseTraceIds('[FR-007] thing', pattern)).toEqual(['FR-007']);
});

  /**
   * @description Proves extracts multi-segment IDs such as FR-CD-040.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage sparks/parseTraceIds
   */
  test('[META-001] extracts multi-segment IDs such as FR-CD-040', () => {
  expect(parseTraceIds('[FR-CD-040] HUD search matches lore', DEFAULT_TRACE_ID_PATTERN)).toEqual([
    'FR-CD-040',
  ]);
  expect(
    parseTraceIds('[FR-CD-031, FR-CD-040] corpus snapshot', DEFAULT_TRACE_ID_PATTERN),
  ).toEqual(['FR-CD-031', 'FR-CD-040']);
});

  /**
   * @description Proves extracts kind prefixes that include digits (e.g. A11Y-CD-001).
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage sparks/parseTraceIds
   */
  test('[META-001] extracts A11Y-style IDs with digits in the kind prefix', () => {
  expect(
    parseTraceIds('[A11Y-CD-001] region-chips set aria-pressed', DEFAULT_TRACE_ID_PATTERN),
  ).toEqual(['A11Y-CD-001']);
});
