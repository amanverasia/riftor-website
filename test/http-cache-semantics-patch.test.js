import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const CachePolicy = require("http-cache-semantics");

function canReuseStaleResponse(responseHeaders) {
  const policy = new CachePolicy(
    { url: "/session", method: "GET", headers: {} },
    { status: 200, headers: { age: "3600", ...responseHeaders } },
  );
  return policy.satisfiesWithoutRevalidation({
    url: "/session",
    method: "GET",
    headers: { "cache-control": "max-stale=86400" },
  });
}

test("max-stale cannot bypass shared Set-Cookie, proxy-revalidate, or no-cache prohibitions", () => {
  assert.equal(canReuseStaleResponse({
    "cache-control": "max-age=60",
    "set-cookie": "session=private",
  }), false);

  assert.equal(canReuseStaleResponse({
    "cache-control": "max-age=60, proxy-revalidate",
  }), false);

  assert.equal(canReuseStaleResponse({
    "cache-control": "no-cache",
  }), false);
});

test("max-stale remains available for shareable expired responses", () => {
  assert.equal(canReuseStaleResponse({
    "cache-control": "max-age=60",
  }), true);

  assert.equal(canReuseStaleResponse({
    "cache-control": "public, max-age=60",
    "set-cookie": "session=public",
  }), true);
});
