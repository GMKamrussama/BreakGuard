import type { ImportSpecifierInfo, MethodCallSite, FileUsageRecord } from "@breakguard/core-types";

export interface ExtractedFileImports {
  packageName: string;
  imports: ImportSpecifierInfo[];
  calls: MethodCallSite[];
}

/**
 * Extracts package name from import specifier string
 * e.g. "lodash" -> "lodash"
 * e.g. "lodash/get" -> "lodash"
 * e.g. "@tanstack/react-query" -> "@tanstack/react-query"
 * e.g. "@tanstack/react-query/sub/module" -> "@tanstack/react-query"
 * e.g. "./local-file" -> null (relative)
 */
export function extractPackageName(importSource: string): string | null {
  if (
    importSource.startsWith(".") ||
    importSource.startsWith("/") ||
    importSource.startsWith("#") ||
    importSource.startsWith("node:")
  ) {
    return null;
  }

  if (importSource.startsWith("@/")) {
    return null; // Next.js / Vite path alias
  }

  const parts = importSource.split("/");
  if (importSource.startsWith("@")) {
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return importSource;
  }

  return parts[0] || null;
}

/**
 * Pre-computes line offset indices from source code for fast byte-span to line mapping
 */
export class LineLocator {
  private lineOffsets: number[] = [0];

  constructor(source: string) {
    for (let i = 0; i < source.length; i++) {
      if (source[i] === "\n") {
        this.lineOffsets.push(i + 1);
      }
    }
  }

  public getLineAndColumn(offset: number): { line: number; column: number } {
    if (offset <= 0) return { line: 1, column: 1 };

    let low = 0;
    let high = this.lineOffsets.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.lineOffsets[mid] <= offset) {
        if (mid === this.lineOffsets.length - 1 || this.lineOffsets[mid + 1] > offset) {
          return {
            line: mid + 1,
            column: offset - this.lineOffsets[mid] + 1,
          };
        }
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return { line: 1, column: 1 };
  }
}
