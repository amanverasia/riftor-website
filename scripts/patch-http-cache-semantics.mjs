import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

// Apply the fix for GHSA-ch52-4w7c-c8xp until upstream releases a patched version.
const require = createRequire(import.meta.url);
const packageJsonPath = require.resolve("http-cache-semantics/package.json");
const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));

if (packageJson.version !== "4.3.0") {
  throw new Error(`Expected http-cache-semantics 4.3.0, found ${packageJson.version}`);
}

const entryPath = require.resolve("http-cache-semantics");
const source = await readFile(entryPath, "utf8");
const before = `            if (allowsStaleWithoutRevalidation) {
                return this._evaluateRequestHitResult(undefined);
            }`;
const after = `            // max-stale cannot override response directives that prohibit stale reuse.
            const securityProhibitsStale = this._rescc['no-cache'] ||
                (this._isShared && (
                    (this._resHeaders['set-cookie'] && !this._rescc.public && !this._rescc.immutable) ||
                    this._rescc['proxy-revalidate']
                ));

            if (allowsStaleWithoutRevalidation && !securityProhibitsStale) {
                return this._evaluateRequestHitResult(undefined);
            }`;

if (!source.includes(after)) {
  if (source.split(before).length !== 2) {
    throw new Error("http-cache-semantics 4.3.0 max-stale code no longer matches the expected patch context");
  }

  await writeFile(entryPath, source.replace(before, after));
}
