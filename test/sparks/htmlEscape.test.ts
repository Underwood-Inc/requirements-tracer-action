import { test, expect } from 'vitest';
import { htmlEscape } from '../../src/sparks/htmlEscape.js';

  /**
   * @description Proves escapes ampersands first.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage sparks/htmlEscape
   */
  test('[META-001] escapes ampersands first', () => {
  expect(htmlEscape('A & B')).toBe('A &amp; B');
});

  /**
   * @description Proves escapes angle brackets and quotes.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage sparks/htmlEscape
   */
  test('[META-001] escapes angle brackets and quotes', () => {
  expect(htmlEscape('<a href="b">"c"</a>')).toBe('&lt;a href=&quot;b&quot;&gt;&quot;c&quot;&lt;/a&gt;');
});

  /**
   * @description Proves escapes single quotes for attribute safety.
   * @owner code / Strixun
   * @kind META
   * @priority high
   * @coverage sparks/htmlEscape
   */
  test('[META-001] escapes single quotes for attribute safety', () => {
  expect(htmlEscape("'hi'")).toBe('&#39;hi&#39;');
});
