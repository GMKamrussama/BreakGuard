import { describe, it, expect } from "vitest";
import { scanSourceCode, aggregateScanResults } from "../scanner.js";

describe("AST Scanner", () => {
  it("should extract named and default imports and call sites", () => {
    const code = `
      import React, { useState, useEffect } from 'react';
      import { debounce } from 'lodash';
      import axios from 'axios';

      export function MyComponent() {
        const [count, setCount] = useState(0);
        
        useEffect(() => {
          axios.get('/api/data');
          const debouncedFn = debounce(() => console.log('test'), 200);
          debouncedFn();
        }, []);

        return <div>{count}</div>;
      }
    `;

    const usageMap = scanSourceCode({
      filePath: "src/components/MyComponent.tsx",
      code,
    });

    expect(usageMap.has("react")).toBe(true);
    expect(usageMap.has("lodash")).toBe(true);
    expect(usageMap.has("axios")).toBe(true);

    const reactUsage = usageMap.get("react")!;
    expect(reactUsage.imports.some((i) => i.importedName === "useState")).toBe(true);
    expect(reactUsage.calls.some((c) => c.methodName === "useState")).toBe(true);

    const lodashUsage = usageMap.get("lodash")!;
    expect(lodashUsage.imports.some((i) => i.importedName === "debounce")).toBe(true);

    const axiosUsage = usageMap.get("axios")!;
    expect(axiosUsage.calls.some((c) => c.methodName.includes("get"))).toBe(true);
  });

  it("should detect ghost and unused dependencies", () => {
    const code = `
      import { format } from 'date-fns';
      format(new Date(), 'yyyy-MM-dd');
    `;

    const usageMap = scanSourceCode({
      filePath: "src/utils.ts",
      code,
    });

    // Known dependencies declared in package.json
    const knownDeps = ["lodash", "axios"];
    const aggregated = aggregateScanResults([usageMap], knownDeps, 5);

    // date-fns is imported but NOT in knownDeps => Ghost Dependency!
    expect(aggregated.ghostDependencies).toContain("date-fns");

    // lodash and axios are in knownDeps but never imported => Unused!
    expect(aggregated.unusedDependencies).toContain("lodash");
    expect(aggregated.unusedDependencies).toContain("axios");
  });
});
