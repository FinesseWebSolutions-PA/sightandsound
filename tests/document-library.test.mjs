import assert from "node:assert/strict";
import test from "node:test";
import { folderTrail, folderLabel, isFolderDescendant } from "../src/lib/document-library.ts";
const folder = (id, name, parent_id = null) => ({
  id,
  name,
  parent_id,
  project_id: "p",
  scene_id: null,
  deleted_at: null,
});
const folders = [folder("a", "Design"), folder("b", "Plans", "a"), folder("c", "Reference")];
test("nested folder navigation returns a full stable breadcrumb path", () => {
  assert.deepEqual(
    folderTrail(folders, "b").map((f) => f.id),
    ["a", "b"],
  );
  assert.equal(folderLabel(folders, "b"), "Design / Plans");
  assert.equal(folderLabel(folders, null), "Files");
});
test("move destinations exclude the folder itself and its descendants", () => {
  assert.equal(isFolderDescendant(folders, "b", "a"), true);
  assert.equal(isFolderDescendant(folders, "a", "a"), true);
  assert.equal(isFolderDescendant(folders, "c", "a"), false);
});
test("a damaged folder chain cannot hang the browser", () => {
  const broken = [folder("a", "A", "b"), folder("b", "B", "a")];
  assert.equal(folderTrail(broken, "a").length, 2);
  assert.deepEqual(folderTrail(folders, "missing"), []);
});

import { approvedDocumentVersions } from "../src/lib/document-library.ts";
test("later change requests revoke an old approved label for the same version", () => {
  const reviews = [
    { document_id: "d", version: 1, decision: "approved", created_at: "2026-09-01" },
    { document_id: "d", version: 1, decision: "changes_requested", created_at: "2026-09-02" },
    { document_id: "d", version: 2, decision: "approved", created_at: "2026-09-03" },
    { document_id: "d", version: 3, decision: "requested", created_at: "2026-09-04" },
  ];
  assert.deepEqual(approvedDocumentVersions(reviews, "d"), [2]);
});
