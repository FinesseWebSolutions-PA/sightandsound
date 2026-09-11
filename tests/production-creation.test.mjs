import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL("../src/components/NewProductionDialog.tsx", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

// Exercise the real dialog's form handlers with an isolated hook/store boundary.
// No browser, database writes, or additional test dependencies are needed.
function dialogWithResult(result) {
  const states = [];
  const created = [];
  const submissions = [];
  let closed = 0;
  let cursor = 0;
  const modules = {
    react: {
      useEffect: () => {},
      useMemo: (fn) => fn(),
      useState: (initial) => {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [
          states[index],
          (next) => {
            states[index] = typeof next === "function" ? next(states[index]) : next;
          },
        ];
      },
    },
    "react/jsx-runtime": {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    },
    "lucide-react": { X: "icon-x", Loader2: "icon-loader" },
    "@/components/PersonPicker": { PersonPicker: "person-picker" },
    "@/lib/status": {
      projectStatusMeta: {
        planning: { label: "Planning" },
        active: { label: "Active" },
        on_hold: { label: "On hold" },
      },
    },
    "@/lib/store": {
      people: [],
      departments: [],
      departmentJobTitles: [],
      useStore: () => ({
        saving: false,
        createProduction: async (input) => {
          submissions.push(input);
          return result;
        },
      }),
    },
  };
  const exports = {};
  runInNewContext(compiled, {
    exports,
    require: (name) => {
      assert.ok(name in modules, `Unexpected dependency: ${name}`);
      return modules[name];
    },
  });
  const render = () => {
    cursor = 0;
    return exports.NewProductionDialog({
      onCreated: (id) => created.push(id),
      onClose: () => {
        closed += 1;
      },
    });
  };
  const nodes = (node) => {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap(nodes);
    return [node, ...nodes(node.props?.children)];
  };
  return {
    created,
    submissions,
    get closed() {
      return closed;
    },
    async submit() {
      nodes(render())
        .find((node) => node.props?.id === "np-name")
        .props.onChange({ target: { value: "New production" } });
      const button = nodes(render()).find(
        (node) =>
          node.type === "button" && [node.props.children].flat().includes("Create production"),
      );
      assert.ok(button, "The form has a create button");
      button.props.onClick();
      await new Promise((resolve) => setImmediate(resolve));
    },
    visibleText: () =>
      nodes(render())
        .flatMap((node) => node.props?.children ?? [])
        .filter((value) => typeof value === "string")
        .join(" "),
  };
}

test("a saved production opens only after its data was refreshed", async () => {
  const dialog = dialogWithResult({ id: "new-production", refreshed: true });
  await dialog.submit();
  assert.deepEqual(dialog.created, ["new-production"]);
  assert.equal(dialog.closed, 0);
  assert.equal(dialog.submissions.length, 1);
});

test("a saved production with failed or superseded refresh closes without navigating or retrying", async () => {
  const dialog = dialogWithResult({ id: "new-production", refreshed: false });
  await dialog.submit();
  assert.deepEqual(dialog.created, []);
  assert.equal(dialog.closed, 1);
  assert.equal(dialog.submissions.length, 1);
  assert.doesNotMatch(dialog.visibleText(), /could not be created/);
});

test("an unsuccessful save keeps the dialog open with a retry message", async () => {
  const dialog = dialogWithResult(null);
  await dialog.submit();
  assert.deepEqual(dialog.created, []);
  assert.equal(dialog.closed, 0);
  assert.match(dialog.visibleText(), /could not be created/);
});
