import type { TestFramework } from '../motes/types.js';

/**
 * Best-effort classification of a test file's framework from its path
 * and contents.
 *
 * @traceId META-001
 */
export function classifyTestFile(filePath: string, fileSource: string): TestFramework {
  if (/\.cy\.[tj]sx?$/.test(filePath) || /\bcy\.\w+\(/.test(fileSource)) return 'cypress';
  if (/\b@playwright\/test\b/.test(fileSource) || /\b(test|expect)\(/.test(fileSource) && /from\s+['"]@playwright/.test(fileSource))
    return 'playwright';
  if (/\bfrom\s+['"]vitest['"]/.test(fileSource)) return 'vitest';
  if (/\bfrom\s+['"]@jest\/globals['"]/.test(fileSource) || /\bjest\.fn\(/.test(fileSource)) return 'jest';
  return 'unknown';
}
