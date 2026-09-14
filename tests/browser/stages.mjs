import { pathToFileURL } from "node:url";
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
if (!process.env.STAGE_REVIEW_PASSWORD)
  throw new Error("Set STAGE_REVIEW_PASSWORD to the locally configured access code.");
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const project = "1c34d14d-d89f-4139-9846-9e04bc2ffc60";
const uuid = (n) => `10000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
let scene, otherScene, sceneReady;
const ready = new Promise((r) => (sceneReady = r));
let stages = [],
  tasks = [],
  nextId = 100;
const errors = [],
  mutations = [];
const department = uuid(1),
  metal = uuid(2);
page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/rest/v1/**", async (route) => {
  const req = route.request(),
    url = new URL(req.url()),
    table = url.pathname.split("/").at(-1),
    method = req.method();
  if (method === "OPTIONS") return route.continue();
  const fulfill = (data, extra = {}) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
      ...extra,
    });
  if (table === "scenes" && method === "GET") {
    const response = await route.fetch();
    const data = await response.json();
    if (!scene) {
      const own = data
        .filter((s) => s.project_id === project)
        .sort((a, b) => a.sort_order - b.sort_order);
      scene = own[0];
      otherScene = own[1];
      stages = [
        {
          id: uuid(10),
          scene_id: scene.id,
          project_id: project,
          name: "Engineering",
          sort_order: 1,
        },
        { id: uuid(11), scene_id: scene.id, project_id: project, name: "Metal", sort_order: 2 },
      ];
      const task = (n, title, stage, dept, extra = {}) => ({
        id: uuid(n),
        project_id: project,
        scene_id: scene.id,
        stage_id: stage,
        department_id: dept,
        parent_task_id: null,
        title,
        status: "not_started",
        start_date: "2026-10-01",
        due_date: "2026-10-10",
        forecast_start: "2026-10-01",
        forecast_finish: "2026-10-10",
        created_at: "2026-09-14T00:00:00Z",
        ...extra,
      });
      tasks = [
        task(20, "Design drive system", uuid(10), department, { status: "in_progress" }),
        task(21, "Early CNC work", uuid(11), metal),
        task(22, "Independent inspection", null, department),
        task(23, "Other set frame", null, metal, { scene_id: otherScene.id }),
      ];
      sceneReady();
    }
    return fulfill(data);
  }
  if (table === "departments" && method === "GET")
    return fulfill([
      { id: department, name: "Engineering" },
      { id: metal, name: "Metal" },
    ]);
  if (table === "set_stages") {
    await ready;
    return fulfill(stages);
  }
  if (table === "task_dependencies")
    return fulfill([
      {
        id: uuid(70),
        project_id: project,
        task_id: uuid(21),
        depends_on_task_id: uuid(20),
        type: "start_to_start",
        lag_hours: 0,
        hard_constraint: true,
      },
    ]);
  if (table === "tasks") {
    await ready;
    const match = (t) =>
      [...url.searchParams].every(
        ([key, value]) => !value.startsWith("eq.") || String(t[key]) === value.slice(3),
      );
    if (method === "HEAD")
      return route.fulfill({
        status: 200,
        headers: { "content-range": `0-${tasks.length - 1}/${tasks.length}` },
      });
    if (method === "POST") {
      const body = req.postDataJSON();
      const row = { ...body, id: uuid(nextId++), created_at: new Date().toISOString() };
      if (row.parent_task_id)
        row.stage_id = tasks.find((t) => t.id === row.parent_task_id)?.stage_id ?? null;
      tasks.push(row);
      mutations.push("task-created");
      return fulfill(row);
    }
    if (method === "PATCH") {
      const body = req.postDataJSON();
      const affected = tasks.filter(match);
      for (const t of affected) {
        Object.assign(t, body);
        if ("stage_id" in body)
          for (const c of tasks.filter((c) => c.parent_task_id === t.id)) c.stage_id = t.stage_id;
      }
      mutations.push("task-updated");
      return fulfill(req.headers().accept?.includes("object") ? affected[0] : affected);
    }
    const selected = tasks.filter(match);
    return fulfill(req.headers().accept?.includes("object") ? (selected[0] ?? null) : selected);
  }
  if (table === "manage_set_stage") {
    const p = req.postDataJSON();
    let id = p.p_id;
    if (p.p_action === "save") {
      if (id) stages.find((s) => s.id === id).name = p.p_name;
      else {
        id = uuid(nextId++);
        stages.push({
          id,
          scene_id: p.p_scene,
          project_id: project,
          name: p.p_name,
          sort_order: stages.length + 1,
        });
      }
    } else if (p.p_action === "delete") stages = stages.filter((s) => s.id !== id);
    mutations.push("stage-" + p.p_action);
    return fulfill(id);
  }
  if (method !== "GET" && method !== "HEAD") {
    mutations.push(`isolated:${table}`);
    return fulfill([]);
  }
  return route.continue();
});
await page.goto("http://127.0.0.1:4173/productions");
await page.getByPlaceholder("Access code").fill(process.env.STAGE_REVIEW_PASSWORD);
await page.getByRole("button", { name: "Enter demo", exact: true }).click();
await page.getByRole("button", { name: "I’ll explore on my own", exact: true }).click();
await ready;
const setUrl = `http://127.0.0.1:4173/projects/${project}/sets?set=${scene.id}&section=tasks`;
await page.goto(setUrl);
await page.getByRole("heading", { name: "Tasks on this set", exact: true }).waitFor();
await page.getByRole("button", { name: "Add stage", exact: true }).click();
await page.getByRole("textbox", { name: "Stage name" }).fill("Metal — final assembly");
await page.getByRole("button", { name: "Save stage", exact: true }).click();
const later = page.getByRole("region", { name: "Metal — final assembly", exact: true });
await later.waitFor();
await later.getByRole("button", { name: "+ Task", exact: true }).click();
const editor = page.getByRole("dialog", { name: "Add work item" });
await editor.getByLabel("Title", { exact: true }).fill("Return for installation");
assert.equal(await editor.getByLabel("Set", { exact: true }).inputValue(), scene.id);
await page.waitForFunction(
  (id) => document.querySelector('select[aria-label="Stage"]')?.value === id,
  stages.find((s) => s.name === "Metal — final assembly").id,
);
await editor.getByLabel("Planned start").fill("2026-11-01");
await editor.getByLabel("Planned finish").fill("2026-11-03");
await editor.getByRole("button", { name: "Add work item", exact: true }).click();
await later.getByRole("button", { name: "Return for installation", exact: true }).waitFor();
await later.getByRole("button", { name: "+ Subtask", exact: true }).click();
await editor.getByLabel("Title", { exact: true }).fill("Install final brackets");
assert.equal(await editor.getByLabel("Set", { exact: true }).isDisabled(), true);
assert.equal(await editor.getByLabel("Stage", { exact: true }).isDisabled(), true);
await editor.getByRole("button", { name: "Add work item", exact: true }).click();
await later.getByRole("button", { name: "Install final brackets", exact: true }).waitFor();
await page.getByRole("textbox", { name: "Search set tasks" }).fill("Install final brackets");
assert.equal(
  await page.getByRole("button", { name: "Install final brackets", exact: true }).count(),
  1,
);
assert.equal(
  await page.getByRole("button", { name: "Return for installation", exact: true }).count(),
  0,
);
await page.getByRole("button", { name: "Clear filters", exact: true }).click();
await page.getByLabel("Filter tasks by status").selectOption("blocked");
assert.match(
  await page.getByRole("region", { name: "Tasks on this set", exact: true }).innerText(),
  /Showing 0 of 5 tasks/,
);
await page.getByRole("button", { name: "Clear filters", exact: true }).click();
await page.screenshot({ path: "/tmp/ss-stages-set.png", fullPage: true });
await page.goto(`http://127.0.0.1:4173/projects/${project}/timeline`);
await page.getByRole("region", { name: "Stages and tasks timeline" }).waitFor();
await page.getByRole("button", { name: "Expand all", exact: true }).click();
await page.getByLabel("Group timeline").selectOption("departments");
await page.getByRole("button", { name: "Expand all", exact: true }).click();
await page.getByLabel("Timeline department").selectOption(metal);
assert.equal(await page.getByRole("button", { name: "Early CNC work", exact: true }).count(), 1);
await page.getByLabel("Timeline department").selectOption("");
await page.getByLabel("Group timeline").selectOption("sets");
await page.screenshot({ path: "/tmp/ss-stages-timeline.png", fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "/tmp/ss-stages-timeline-mobile.png" });
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
await page.goto(setUrl);
await page.getByRole("heading", { name: "Tasks on this set", exact: true }).waitFor();
assert.equal(
  await page.getByRole("button", { name: "Install final brackets", exact: true }).count(),
  1,
);
await page.screenshot({ path: "/tmp/ss-stages-set-mobile.png", fullPage: true });
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

await page.setViewportSize({ width: 1440, height: 1000 });
await page.getByRole("button", { name: "Edit Return for installation", exact: true }).click();
const edit = page.getByRole("dialog", { name: "Edit Return for installation", exact: true });
await edit.getByLabel("Stage", { exact: true }).selectOption(uuid(10));
await edit.getByRole("button", { name: "Save changes", exact: true }).click();
await page
  .getByRole("region", { name: "Engineering", exact: true })
  .getByRole("button", { name: "Install final brackets", exact: true })
  .waitFor();
await page.getByRole("button", { name: "Add stage", exact: true }).click();
await page.getByRole("textbox", { name: "Stage name" }).fill("Temporary stage");
await page.getByRole("button", { name: "Save stage", exact: true }).click();
await page.getByRole("button", { name: "Rename Temporary stage", exact: true }).click();
await page.getByRole("textbox", { name: "Stage name" }).fill("Renamed empty stage");
await page.getByRole("button", { name: "Save stage", exact: true }).click();
await page
  .getByRole("region", { name: "Renamed empty stage", exact: true })
  .getByRole("button", { name: "Remove empty stage", exact: true })
  .click();
await page.waitForFunction(
  () => !document.querySelector('section[aria-label="Renamed empty stage"]'),
);
await page.evaluate(() => {
  localStorage.setItem("ss-demo-role", "viewer");
  localStorage.removeItem("ss-demo-person");
});
await page.reload();
await page.getByRole("button", { name: "I’ll explore on my own", exact: true }).click();
await page.getByRole("heading", { name: "Tasks on this set", exact: true }).waitFor();
assert.equal(await page.getByRole("button", { name: "Add stage", exact: true }).count(), 0);
assert.equal(
  await page.getByRole("button", { name: "Edit Return for installation", exact: true }).count(),
  0,
);
assert.deepEqual(errors, []);
console.log(
  "Passed isolated browser flows: create stage/task/subtask, inheritance, filters retaining subtasks, start-to-start release, production/department timeline, reload, mobile layout. No live mutations.",
  mutations,
);
await browser.close();
