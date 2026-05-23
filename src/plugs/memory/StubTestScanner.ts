import type { TestScanner } from '../../sockets/TestScanner.js';
import type { TestCase } from '../../motes/types.js';

/** Plug (in-memory): stubs scan() with a predetermined list of TestCases. */
export class StubTestScanner implements TestScanner {
  constructor(private readonly cases: readonly TestCase[]) {}

  async scan(): Promise<readonly TestCase[]> {
    return this.cases;
  }
}
