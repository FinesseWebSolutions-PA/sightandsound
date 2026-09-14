import test from "node:test";
import assert from "node:assert/strict";
import { createReturnHistory } from "../src/lib/return-history.ts";
const loc = (href, key, index) => ({ href, state: { __TSR_key: key, __TSR_index: index } });
const origin = loc("/projects/p/sets?set=s&section=overview", "set", 2);
const file = loc("/projects/p/documents?document=d&version=v", "file", 3);
test("file opened from set overview has a real Back destination", () => {
  const history = createReturnHistory(() => undefined);
  history.remember(origin, file);
  assert.equal(history.canReturn(file), true);
  assert.equal(history.canReturn(loc(file.href, "different", 3)), false);
});
test("direct links and replace navigation use the fallback", () => {
  const history = createReturnHistory(() => undefined);
  history.remember(undefined, file);
  assert.equal(history.canReturn(file), false);
  history.remember(origin, loc(file.href, "replace", 2));
  assert.equal(history.canReturn(loc(file.href, "replace", 2)), false);
  history.remember(loc("https://outside.example", "external", 2), file);
  assert.equal(history.canReturn(file), false);
});
test("origin survives reload but does not apply to a changed URL or history entry", () => {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  createReturnHistory(() => storage).remember(origin, file);
  const reloaded = createReturnHistory(() => storage);
  assert.equal(reloaded.canReturn(file), true);
  assert.equal(reloaded.canReturn(loc("/projects/p/documents", "file", 3)), false);
  assert.equal(reloaded.canReturn(loc(file.href, "file", 4)), false);
});
test("Back and Forward preserve an existing origin, and denied storage uses memory", () => {
  const history = createReturnHistory(() => {
    throw new Error("Storage blocked");
  });
  history.remember(origin, file);
  history.remember(file, origin);
  history.remember(origin, file);
  assert.equal(history.canReturn(file), true);
  assert.equal(history.canReturn(origin), false);
});
