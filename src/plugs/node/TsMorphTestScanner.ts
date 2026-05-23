import fastGlob from 'fast-glob';
import { Project, SyntaxKind, Node } from 'ts-morph';
import type { CallExpression, Identifier, PropertyAccessExpression } from 'ts-morph';
import type { TestCase, TraceabilityConfig } from '../../motes/types.js';
import type { TestScanner } from '../../sockets/TestScanner.js';
import { parseTraceIds } from '../../sparks/parseTraceIds.js';
import { parseJsdocTags } from '../../sparks/parseJsdocTags.js';
import { classifyTestFile } from '../../sparks/classifyTestFile.js';

const TEST_FN_NAMES = new Set(['test', 'it']);

/** Plug: scans test files using ts-morph for accurate AST-based extraction. */
export class TsMorphTestScanner implements TestScanner {
  async scan(rootDir: string, config: TraceabilityConfig): Promise<readonly TestCase[]> {
    const files = await fastGlob([...config.testGlobs], {
      cwd: rootDir,
      ignore: [...config.exclude],
      absolute: true,
      dot: false,
    });

    if (files.length === 0) return [];

    const project = new Project({
      useInMemoryFileSystem: false,
      skipAddingFilesFromTsConfig: true,
      compilerOptions: {
        allowJs: true,
        jsx: 4 satisfies number, // ts.JsxEmit.ReactJSX value at runtime; ts-morph forwards to TS.
      },
    });

    const outerPattern = new RegExp(config.traceIdPattern, 'g');
    const results: TestCase[] = [];

    for (const filePath of files) {
      let source: string;
      try {
        source = (await project.addSourceFileAtPath(filePath)).getFullText();
      } catch {
        continue;
      }
      const sourceFile = project.getSourceFile(filePath);
      if (!sourceFile) continue;

      const framework = classifyTestFile(filePath, source);

      sourceFile.forEachDescendant((node) => {
        if (node.getKind() !== SyntaxKind.CallExpression) return;
        const call = node.asKind(SyntaxKind.CallExpression) as CallExpression;
        const expr = call.getExpression();

        const callName = extractTestCallName(expr);
        if (!callName || !TEST_FN_NAMES.has(callName)) return;

        const args = call.getArguments();
        const first = args[0];
        if (!first || !Node.isStringLiteral(first) && !Node.isNoSubstitutionTemplateLiteral(first)) return;
        const description = first.getLiteralText();

        const { line } = sourceFile.getLineAndColumnAtPos(call.getStart());

        const traceIds = parseTraceIds(description, outerPattern);

        const commentRange = call
          .getLeadingCommentRanges()
          .find((c) => c.getText().startsWith('/**'));
        const commentText = commentRange ? commentRange.getText().slice(3, -2) : '';
        const tags = commentText
          ? parseJsdocTags(commentText, config.jsdocTags.optional)
          : {};

        results.push({
          filePath: filePath.replace(/\\/g, '/'),
          line,
          framework,
          description,
          traceIds,
          tags,
        });
      });

      project.removeSourceFile(sourceFile);
    }

    return results;
  }
}

function extractTestCallName(expr: Node): string | undefined {
  if (Node.isIdentifier(expr)) return (expr as Identifier).getText();
  if (Node.isPropertyAccessExpression(expr)) {
    const p = expr as PropertyAccessExpression;
    return p.getName();
  }
  return undefined;
}
