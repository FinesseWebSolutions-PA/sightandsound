import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import {
  tourSteps,
  tourPath,
  parseTourProgress,
  tourKey,
  tourSession,
  TOUR_VERSION,
} from "../src/lib/product-tour.ts";
test("quick start and full tour have unique stable steps and valid set routes", () => {
  assert.equal(tourSteps.filter((s) => s.quick).length, 8);
  assert.equal(tourSteps.length, 19);
  assert.equal(new Set(tourSteps.map((s) => s.id)).size, 19);
  for (const s of tourSteps) {
    assert.ok(s.points.length >= 2);
    const path = tourPath(s.route, "p", "s");
    assert.ok(path.startsWith("/"));
    if (path.includes("/sets"))
      assert.equal(new URL(path, "https://example.com").searchParams.get("set"), "s");
  }
  assert.equal(tourPath("overview"), "/productions");
  assert.equal(tourPath("conversation", "p", "s"), "/projects/p/sets?set=s&section=conversation");
});
test("resume accepts only known steps, modes and tour versions", () => {
  const value = { version: TOUR_VERSION, status: "paused", mode: "full", step: "approval" };
  assert.deepEqual(parseTourProgress(JSON.stringify(value)), value);
  for (const bad of [
    null,
    "bad",
    "null",
    JSON.stringify({ ...value, step: "removed" }),
    JSON.stringify({ ...value, version: 0 }),
    JSON.stringify({ ...value, status: "running" }),
    JSON.stringify({ ...value, mode: "other" }),
  ])
    assert.equal(parseTourProgress(bad), null);
  assert.notEqual(tourKey("person-a"), tourKey("person-b"));
});
test("tour prevents passive read receipts while ordinary browsing still records reads", () => {
  const source = ts.transpileModule(
    readFileSync(new URL("../src/lib/conversation-read.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  const saved = new Map();
  let events = 0;
  const context = {
    exports: {},
    require: () => ({ tourSession }),
    localStorage: { getItem: (k) => saved.get(k) ?? null, setItem: (k, v) => saved.set(k, v) },
    window: { dispatchEvent: () => events++ },
    Event: class {},
    Map,
    Date,
    Number,
  };
  vm.runInNewContext(source, context);
  try {
    tourSession.active = true;
    context.exports.markConversationRead("person", "thread", "2026-09-14T10:00:00Z");
    assert.equal(saved.size, 0);
    assert.equal(events, 0);
    tourSession.active = false;
    context.exports.markConversationRead("person", "thread", "2026-09-14T10:00:00Z");
    assert.equal(saved.size, 1);
    assert.equal(events, 1);
  } finally {
    tourSession.active = false;
  }
});
