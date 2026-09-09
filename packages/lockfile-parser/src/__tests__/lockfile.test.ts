import { describe, it, expect } from "vitest";
import { parseNpmLockfile } from "../npm.js";
import { parseYarnLockfile } from "../yarn.js";
import { parsePnpmLockfile } from "../pnpm.js";

describe("Lockfile Deep Parser", () => {
  const samplePkgJson = JSON.stringify({
    name: "my-test-app",
    version: "1.0.0",
    dependencies: {
      lodash: "^4.17.21",
      axios: "^1.6.0",
    },
    devDependencies: {
      typescript: "^5.0.0",
    },
  });

  describe("NPM v2/v3 Lockfile", () => {
    it("should correctly parse npm lockfile v2/v3", () => {
      const lockJson = JSON.stringify({
        name: "my-test-app",
        version: "1.0.0",
        lockfileVersion: 3,
        packages: {
          "": {
            name: "my-test-app",
            version: "1.0.0",
            dependencies: { lodash: "^4.17.21", axios: "^1.6.0" },
            devDependencies: { typescript: "^5.0.0" },
          },
          "node_modules/lodash": {
            version: "4.17.21",
            resolved: "https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz",
          },
          "node_modules/axios": {
            version: "1.6.2",
            dependencies: { "follow-redirects": "^1.15.0" },
          },
          "node_modules/follow-redirects": {
            version: "1.15.4",
          },
          "node_modules/typescript": {
            version: "5.3.3",
            dev: true,
          },
        },
      });

      const tree = parseNpmLockfile(lockJson, samplePkgJson);
      expect(tree.directDependenciesCount).toBe(3);
      expect(tree.transitiveDependenciesCount).toBe(1);
      expect(tree.nodes["lodash"]).toBeDefined();
      expect(tree.nodes["lodash"].version).toBe("4.17.21");
      expect(tree.nodes["lodash"].isTransitive).toBe(false);

      expect(tree.nodes["follow-redirects"]).toBeDefined();
      expect(tree.nodes["follow-redirects"].isTransitive).toBe(true);
      expect(tree.nodes["follow-redirects"].parents).toContain("axios");
    });
  });

  describe("Yarn Classic Lockfile", () => {
    it("should parse classic yarn.lock", () => {
      const yarnLock = `
# yarn lockfile v1

axios@^1.6.0:
  version "1.6.2"
  resolved "https://registry.yarnpkg.com/axios/-/axios-1.6.2.tgz"
  dependencies:
    follow-redirects "^1.15.0"

follow-redirects@^1.15.0:
  version "1.15.4"
  resolved "https://registry.yarnpkg.com/follow-redirects/-/follow-redirects-1.15.4.tgz"

lodash@^4.17.21:
  version "4.17.21"
  resolved "https://registry.yarnpkg.com/lodash/-/lodash-4.17.21.tgz"
`;
      const tree = parseYarnLockfile(yarnLock, samplePkgJson);
      expect(tree.nodes["axios"]).toBeDefined();
      expect(tree.nodes["axios"].version).toBe("1.6.2");
      expect(tree.nodes["follow-redirects"]).toBeDefined();
      expect(tree.nodes["follow-redirects"].isTransitive).toBe(true);
      expect(tree.nodes["follow-redirects"].parents).toContain("axios");
    });
  });

  describe("pnpm Lockfile", () => {
    it("should parse pnpm-lock.yaml v6/v9 format", () => {
      const pnpmLock = `
lockfileVersion: '6.0'

importers:
  .:
    dependencies:
      lodash:
        specifier: ^4.17.21
        version: 4.17.21
      axios:
        specifier: ^1.6.0
        version: 1.6.2
    devDependencies:
      typescript:
        specifier: ^5.0.0
        version: 5.3.3

packages:
  /axios@1.6.2:
    resolution: {integrity: sha512-xxx}
    dependencies:
      follow-redirects: 1.15.4
    dev: false

  /follow-redirects@1.15.4:
    resolution: {integrity: sha512-yyy}
    dev: false

  /lodash@4.17.21:
    resolution: {integrity: sha512-zzz}
    dev: false

  /typescript@5.3.3:
    resolution: {integrity: sha512-aaa}
    dev: true
`;
      const tree = parsePnpmLockfile(pnpmLock, samplePkgJson);
      expect(tree.nodes["lodash"]).toBeDefined();
      expect(tree.nodes["lodash"].version).toBe("4.17.21");
      expect(tree.nodes["follow-redirects"]).toBeDefined();
      expect(tree.nodes["follow-redirects"].isTransitive).toBe(true);
      expect(tree.nodes["follow-redirects"].parents).toContain("axios");
    });
  });
});
