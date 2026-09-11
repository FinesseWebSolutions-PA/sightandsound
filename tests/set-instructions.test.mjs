import assert from "node:assert/strict";
import test from "node:test";
import { instructionVersions } from "../src/lib/set-instructions.ts";
const versions = [
  { id: "v1", document_id: "d", version: 1 },
  { id: "v2", document_id: "d", version: 2 },
];
const approved = { document_id: "d", version: 1, decision: "approved", created_at: "2026-09-01" };
test("new drafts never inherit approval from the previous instruction revision", () => {
  const state = instructionVersions("d", versions, [approved]);
  assert.equal(state.currentApproved, false);
  assert.equal(state.latest.id, "v2");
  assert.equal(state.lastApproved.id, "v1");
});
test("latest approval opens the exact approved revision", () => {
  const state = instructionVersions("d", versions, [approved, { ...approved, version: 2 }]);
  assert.equal(state.currentApproved, true);
  assert.equal(state.lastApproved.id, "v2");
});
test("a revoked approval is not offered as a usable instruction", () => {
  const state = instructionVersions("d", versions, [
    approved,
    { ...approved, decision: "changes_requested", created_at: "2026-09-02" },
  ]);
  assert.equal(state.currentApproved, false);
  assert.equal(state.lastApproved, undefined);
});
test("missing versions and approvals from other files do not imply approval", () => {
  assert.equal(instructionVersions("missing", versions, [approved]).currentApproved, false);
  assert.equal(
    instructionVersions("d", versions, [{ ...approved, document_id: "other" }]).lastApproved,
    undefined,
  );
});
