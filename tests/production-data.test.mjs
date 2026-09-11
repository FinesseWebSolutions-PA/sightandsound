import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Run the real data layer against a small Supabase transport double. No live
// records are written by these tests.
const source = readFileSync(new URL("../src/lib/production-data.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function dataLayer({ failTable } = {}) {
  const calls = [];
  const supabase = {
    from(table) {
      const query = { table, operations: [], single: false };
      calls.push(query);
      const builder = new Proxy(
        {},
        {
          get(_, method) {
            if (method === "then") {
              return (resolve, reject) =>
                Promise.resolve({
                  data: query.single
                    ? { id: "item", project_id: "production", owner_id: null, created_by: null }
                    : [],
                  count: 0,
                  error: failTable === table ? { message: "Connection interrupted" } : null,
                }).then(resolve, reject);
            }
            return (...args) => {
              query.operations.push({ method, args });
              if (method === "single" || method === "maybeSingle") query.single = true;
              return builder;
            };
          },
        },
      );
      return builder;
    },
    async rpc(name, args) {
      calls.push({ rpc: name, args });
      return { data: [], error: null };
    },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      assert.equal(name, "@/integrations/supabase/client");
      return { supabase };
    },
    console,
  });
  return { api: exports, calls };
}

test("loading a portfolio only reads data and does not recalculate any schedule", async () => {
  const { api, calls } = dataLayer();
  const result = await api.loadProductionData();
  assert.equal(result.projects.length, 0);
  assert.equal(calls.filter((call) => call.rpc).length, 0);
  const writes = calls
    .flatMap((call) => call.operations ?? [])
    .filter(({ method }) => ["insert", "update", "delete", "upsert"].includes(method));
  assert.equal(writes.length, 0);
});

test("read failures are reported so the portfolio can offer a retry", async () => {
  const { api } = dataLayer({ failTable: "tasks" });
  await assert.rejects(api.loadProductionData(), /Connection interrupted/);
});

for (const [name, save] of [
  ["work status", (api) => api.writeTaskStatus("task", "in_progress", "actor")],
  ["milestone date", (api) => api.writeMilestoneDate("milestone", "2026-10-15", "actor")],
  [
    "production window",
    (api) =>
      api.writeProductionSettings(
        "production",
        {
          name: "Demo",
          status: "active",
          ownerId: null,
          startDate: "2026-09-01",
          targetCloseDate: "2026-12-01",
          portalUrl: "",
        },
        "actor",
      ),
  ],
  [
    "set dates",
    (api) => api.writeSceneFields("set", "production", { due_date: "2026-10-15" }, "actor"),
  ],
  ["removed set", (api) => api.removeScene("set", "production", "actor")],
]) {
  test(`${name} recalculates only the affected production after saving`, async () => {
    const { api, calls } = dataLayer();
    await save(api);
    const calculations = calls.filter((call) => call.rpc);
    assert.equal(calculations.length, 1);
    assert.equal(calculations[0].rpc, "compute_project_schedule");
    assert.equal(calculations[0].args.p_project_id, "production");
  });
}

test("a rejected milestone save does not recalculate a schedule", async () => {
  const { api, calls } = dataLayer({ failTable: "milestones" });
  await assert.rejects(
    api.writeMilestoneDate("milestone", "2026-10-15", "actor"),
    /Connection interrupted/,
  );
  assert.equal(calls.filter((call) => call.rpc).length, 0);
});

test("approval writes carry the exact previewed version and named reviewer", async () => {
  const { api, calls } = dataLayer();
  await api.writeApproval(
    "doc",
    "requested",
    "Check dimensions",
    "author",
    "version-seen",
    "reviewer",
  );
  const call = calls.find((c) => c.rpc === "review_document");
  assert.deepEqual(JSON.parse(JSON.stringify(call.args)), {
    p_document: "doc",
    p_version: "version-seen",
    p_decision: "requested",
    p_note: "Check dimensions",
    p_actor: "author",
    p_reviewer: "reviewer",
  });
  assert.equal(
    calls.filter((c) => c.table === "document_versions").length,
    0,
    "approval must not silently choose a newer version",
  );
});
test("filing a shared attachment uses an atomic repeat-safe database operation", async () => {
  const { api, calls } = dataLayer();
  await api.saveAttachmentToDocs({
    attachmentId: "attachment",
    folder: "folder",
    title: "Plan",
    fileName: "plan.pdf",
    actorId: "person",
    requiresApproval: false,
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].rpc, "file_conversation_attachment");
  assert.equal(calls[0].args.p_folder, "folder");
});
test("message edits remain limited to their original author", async () => {
  const { api, calls } = dataLayer();
  await api.writeCommentEdit("message", "Updated 👍", "author");
  const update = calls.find((c) => c.table === "comments");
  assert(
    update.operations.some(
      (o) => o.method === "eq" && o.args[0] === "author_id" && o.args[1] === "author",
    ),
  );
  await assert.rejects(api.writeCommentEdit("message", "  ", "author"), /Write a message/);
});

test("a reaction removal that affects no rows is reported instead of silently succeeding", async () => {
  const { api } = dataLayer();
  await assert.rejects(api.removeCommentReaction("reaction", "actor"), /could not be removed/);
});
