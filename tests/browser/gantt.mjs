import { pathToFileURL } from "node:url";
const { chromium } = await import(pathToFileURL(process.argv[3]).href);
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { makeDatabase } from "../db/gantt-editing.mjs";
const db = await makeDatabase();
const id = (n) => `30000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const project = "1c34d14d-d89f-4139-9846-9e04bc2ffc60",
  admin = "da16ab5c-84a0-4552-a6ed-44b401b63d6c";
await db.query(
  "insert into people values($1,'Alex Rivera','admin',null),($2,'Viewer','viewer',null)",
  [admin, id(2)],
);
await db.query(
  "insert into projects values($1,'Demo production','active','2026-09-01','2026-12-01')",
  [project],
);
await db.query(
  "insert into scenes(id,project_id,name,start_date,due_date) values($1,$2,'Courtyard','2026-10-01','2026-12-01')",
  [id(20), project],
);
await db.query("select manage_set_stage($1,$2,'Metal')", [id(20), admin]);
const stage = (await db.query("select id from set_stages")).rows[0].id;
await db.query(
  "insert into tasks(id,project_id,scene_id,stage_id,title,start_date,due_date) values($1,$4,$5,$6,'Frame assembly','2026-10-01','2026-10-05'),($2,$4,$5,$6,'Plywood skins','2026-10-06','2026-10-08'),($3,$4,$5,$6,'Finished sample','2026-10-09','2026-10-10')",
  [id(30), id(31), id(32), project, id(20), stage],
);
await db.query(
  "update tasks set status='done',actual_start='2026-10-09',actual_finish='2026-10-10' where id=$1",
  [id(32)],
);
await db.query(
  "insert into task_dependencies(task_id,depends_on_task_id,type) values($1,$2,'finish_to_start')",
  [id(31), id(30)],
);
await db.query("select compute_project_schedule($1)", [project]);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1050 } });
const errors = [],
  writes = [];
let failNext = false;
page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/rest/v1/**", async (route) => {
  const req = route.request(),
    url = new URL(req.url()),
    table = url.pathname.split("/").at(-1),
    method = req.method();
  const fulfill = (data) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
  try {
    if (table === "gantt_snapshot")
      return fulfill((await db.query("select gantt_snapshot($1) as data", [project])).rows[0].data);
    if (table === "gantt_edit") {
      const p = req.postDataJSON();
      if (!p.p_preview && failNext) {
        failNext = false;
        throw new Error("Simulated save failure");
      }
      writes.push(p.p_preview ? "preview" : "commit");
      return fulfill(
        (
          await db.query("select gantt_edit($1,$2,$3,$4,$5) as data", [
            project,
            p.p_actor,
            p.p_expected,
            JSON.stringify(p.p_operations),
            p.p_preview,
          ])
        ).rows[0].data,
      );
    }
    if (table === "gantt_capture_baseline") {
      const p = req.postDataJSON();
      return fulfill(
        (
          await db.query("select gantt_capture_baseline($1,$2,$3) as id", [
            project,
            p.p_actor,
            p.p_name,
          ])
        ).rows[0].id,
      );
    }
    if (method === "OPTIONS") return route.continue();
    if (method !== "GET" && method !== "HEAD") return fulfill([]);
    if (
      [
        "tasks",
        "scenes",
        "people",
        "projects",
        "set_stages",
        "task_dependencies",
        "milestones",
        "gantt_baselines",
      ].includes(table)
    ) {
      let rows = (await db.query("select * from " + table)).rows;
      for (const [k, v] of url.searchParams)
        if (v.startsWith("eq.")) rows = rows.filter((r) => String(r[k]) === v.slice(3));
      const from = Number(url.searchParams.get("offset") || 0),
        limit = Number(url.searchParams.get("limit") || 500);
      rows = rows.slice(from, from + limit);
      return fulfill(req.headers().accept?.includes("object") ? (rows[0] ?? null) : rows);
    }
    if (table === "departments") return fulfill([{ id: id(5), name: "Shop", code: "SHP" }]);
    return fulfill([]);
  } catch (e) {
    return route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ message: e.message, code: e.code || "P0001" }),
    });
  }
});
await page.goto(`${process.env.GANTT_BASE || "http://127.0.0.1:4173"}/productions`);
await page.getByPlaceholder("Access code").fill("1111");
await page.getByRole("button", { name: "Enter demo", exact: true }).click();
await page.goto(
  `${process.env.GANTT_BASE || "http://127.0.0.1:4173"}/projects/${project}/timeline`,
);
await page.getByRole("region", { name: "Production Gantt" }).waitFor();
const chart = page.getByRole("region", { name: "Production Gantt" });
await chart.getByRole("button", { name: "Expand Courtyard", exact: true }).waitFor();
assert.equal(
  await chart.getByRole("button", { name: "Edit finish for Frame assembly", exact: true }).count(),
  0,
);
await chart.getByRole("button", { name: "Expand Courtyard", exact: true }).click();
await chart.getByRole("button", { name: "Expand Metal", exact: true }).waitFor();
assert.equal(
  await chart.getByRole("button", { name: "Edit finish for Frame assembly", exact: true }).count(),
  0,
);
await chart.getByRole("button", { name: "Expand all", exact: true }).click();
await chart.getByRole("button", { name: "Edit finish for Frame assembly", exact: true }).click();
await chart.getByRole("textbox", { name: "New finish for Frame assembly" }).count();
const finish = chart.getByLabel("New finish for Frame assembly");
await finish.fill("2026-10-08");
await finish.press("Enter");
const preview = page.getByRole("dialog", { name: "Review schedule changes" });
await preview.waitFor({ timeout: 8000 }).catch(async (e) => {
  console.log(await page.locator("body").innerText());
  console.log(errors, writes);
  throw e;
});
assert.match(await preview.innerText(), /Plywood skins/);
assert.equal(
  (await db.query("select due_date::text from tasks where id=$1", [id(30)])).rows[0].due_date,
  "2026-10-05",
);
await preview.getByRole("button", { name: "Save changes", exact: true }).click();
await page.waitForFunction(() => document.body.innerText.includes("Saved"));
assert.equal(
  (await db.query("select due_date::text from tasks where id=$1", [id(30)])).rows[0].due_date,
  "2026-10-08",
);
await chart.getByRole("button", { name: "Undo", exact: true }).click();
await page.waitForFunction(() => document.body.innerText.includes("Change undone"));
assert.equal(
  (await db.query("select due_date::text from tasks where id=$1", [id(30)])).rows[0].due_date,
  "2026-10-05",
);
await chart.getByRole("button", { name: "Redo", exact: true }).click();
await page.waitForFunction(() => document.body.innerText.includes("Change redone"));
await chart.getByRole("button", { name: "Fit", exact: true }).click();
await page.screenshot({
  path: process.env.GANTT_DESKTOP_SCREENSHOT || "/tmp/ss-gantt-desktop.png",
  fullPage: false,
});
assert.equal(
  await chart.getByRole("button", { name: "Edit finish for Finished sample" }).isDisabled(),
  true,
);
// Cancelled pointer gesture cannot write.
await chart.getByLabel("Gantt zoom").selectOption("24");
const bar = chart.getByRole("button", { name: "Schedule Frame assembly", exact: true });
await bar.scrollIntoViewIfNeeded();
const rect = await bar.boundingBox();
const beforeWrites = writes.filter((w) => w === "commit").length;
await page.mouse.move(rect.x + rect.width / 2, rect.y + 12);
await page.mouse.down();
await page.mouse.move(rect.x + rect.width / 2 + 48, rect.y + 12);
await bar.dispatchEvent("pointercancel");
await page.mouse.up();
await page.waitForTimeout(200);
assert.equal(writes.filter((w) => w === "commit").length, beforeWrites);
// Normal drag moves, previews and remains reversible.
const b = await bar.boundingBox();
await page.mouse.move(b.x + b.width / 2, b.y + 12);
await page.mouse.down();
await page.mouse.move(b.x + b.width / 2 + 48, b.y + 12, { steps: 4 });
await page.mouse.up();
await preview.waitFor();
await preview.getByRole("button", { name: "Cancel", exact: true }).click();
// A failed save never appears committed; a retry can succeed.
failNext = true;
await chart.getByRole("button", { name: "Edit owner for Frame assembly", exact: true }).click();
await chart.getByLabel("New owner for Frame assembly").selectOption(admin);
await page.getByRole("alert").filter({ hasText: "Simulated save failure" }).waitFor();
assert.equal(
  (await db.query("select owner_id from tasks where id=$1", [id(30)])).rows[0].owner_id,
  null,
);
await chart.getByRole("button", { name: "Edit owner for Frame assembly", exact: true }).click();
await chart.getByLabel("New owner for Frame assembly").selectOption(admin);
await page.waitForFunction(() => document.body.innerText.includes("Saved"));
// An intervening colleague edit blocks undo instead of overwriting it.
await db.query("update tasks set title='Updated by colleague' where id=$1", [id(30)]);
await chart.getByRole("button", { name: "Undo", exact: true }).click();
await page.getByRole("alert").filter({ hasText: "schedule changed" }).waitFor();
assert.equal(
  (await db.query("select title from tasks where id=$1", [id(30)])).rows[0].title,
  "Updated by colleague",
);
await db.query("update tasks set title='Frame assembly' where id=$1", [id(30)]);
await chart.getByRole("button", { name: "Refresh schedule", exact: true }).click();
// Department grouping and saved state.
await chart.getByLabel("Group Gantt").selectOption("departments");
await page.waitForTimeout(400);
await page.reload();
await page.getByRole("region", { name: "Production Gantt" }).waitFor();
assert.equal(await page.getByLabel("Group Gantt").inputValue(), "departments");
await page.getByLabel("Group Gantt").selectOption("sets");
// Synthetic scale fixture stays entirely local.
await db.query(
  "insert into tasks(project_id,scene_id,stage_id,title,start_date,due_date) select $1,$2,$3,'Scale task '||n,'2026-10-01'::date+(n%50),'2026-10-03'::date+(n%50) from generate_series(1,4997)n",
  [project, id(20), stage],
);
await db.query(
  "insert into task_dependencies(task_id,depends_on_task_id,type) select c.id,p.id,'finish_to_start' from generate_series(2,4000,2)n join tasks c on c.title='Scale task '||n join tasks p on p.title='Scale task '||(n-1)",
);
const start = performance.now();
await page.reload();
await page.getByRole("button", { name: "Edit finish for Frame assembly", exact: true }).waitFor();
const readyMs = performance.now() - start;
const rowCount = await page.locator("[data-gantt-row]").count();
assert.ok(rowCount < 60, `Only visible rows render: ${rowCount}`);
console.log("Scale ready", { readyMs, rowCount, errors });
const scroller = page.locator('[aria-label="Gantt chart"]');
console.log("Chart matches", await scroller.count());
await scroller
  .evaluate((e) => (e.scrollTop = 70000))
  .catch(async (e) => {
    console.log(await page.locator("body").innerText());
    console.log(errors);
    throw e;
  });
await page.waitForTimeout(100);
assert.ok((await page.locator("[data-gantt-row]").count()) < 60);
const timings = await page.evaluate(async () => {
  const chart = document.querySelector('[aria-label="Gantt chart"]');
  const frames = [];
  let last = performance.now();
  for (let i = 0; i < 40; i++) {
    chart.scrollTop += 100;
    await new Promise(requestAnimationFrame);
    const now = performance.now();
    frames.push(now - last);
    last = now;
  }
  return { frameP95: frames.sort((a, b) => a - b)[Math.floor(frames.length * 0.95)] };
});
console.log("Scroll benchmark", timings);
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: process.env.GANTT_MOBILE_SCREENSHOT || "/tmp/ss-gantt-mobile.png" });
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  true,
  "No page-wide mobile overflow",
);
await page.evaluate(() => {
  localStorage.setItem("ss-demo-role", "viewer");
  localStorage.removeItem("ss-demo-person");
});
await page.reload();
await page.getByRole("region", { name: "Production Gantt" }).waitFor();
assert.equal(await page.getByRole("button", { name: "Undo", exact: true }).isDisabled(), true);
assert.equal(
  await page.getByRole("button", { name: "Add stage to Courtyard", exact: true }).count(),
  0,
);
assert.deepEqual(errors, []);
writeFileSync(
  "/tmp/ss-gantt-browser-results.json",
  JSON.stringify(
    {
      readyMs,
      renderedRows: rowCount,
      datasetTasks: 5000,
      datasetDependencies: 2001,
      ...timings,
      errors,
      writes,
    },
    null,
    2,
  ),
);
console.log(
  "Passed browser editing, preview/cancel, commit, undo/redo, actual-date lock, cancelled drag, drag preview, saved grouping, 5,000-task virtualization and mobile width.",
  { readyMs, rowCount },
);
await browser.close();
await db.close();
