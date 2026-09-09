import { createFileRoute, notFound } from "@tanstack/react-router";
import { Crown, Users } from "lucide-react";

import { StatusBadge } from "@/components/StatusBadge";
import { departments, people, personById, projectDepartments, useStore } from "@/lib/store";
import { readinessMeta } from "@/lib/status";
import { roleLabels } from "@/lib/store";

export const Route = createFileRoute("/projects/$projectId/team")({
  head: () => ({
    meta: [
      { title: "Team & Departments — Sight & Sound Show Production" },
      {
        name: "description",
        content:
          "Department owners, leads, and team members working on the build — Art, Engineering, Costumes, Lighting, Animals, Shop, and Electronics & Effects.",
      },
      { property: "og:title", content: "Team & Departments — Sight & Sound Show Production" },
      {
        property: "og:description",
        content: "Department owners, leads, and team members working on a show build.",
      },
    ],
  }),
  component: TeamTab,
});

function TeamTab() {
  const { projectId } = Route.useParams();
  const { projects } = useStore();
  const project = projects.find((p) => p.id === projectId);
  if (!project) throw notFound();

  const involved = projectDepartments.filter((pd) => pd.project_id === projectId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl text-ink">Team &amp; Departments</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Who owns what on this production. Mentioning a department in a discussion notifies its
          owner and leads — not the whole roster.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {involved.map((pd) => {
          const dept = departments.find((d) => d.id === pd.department_id);
          if (!dept) return null;
          const members = people.filter(
            (p) =>
              p.primary_department_id === dept.id &&
              p.id !== dept.owner_id &&
              !dept.lead_ids.includes(p.id),
          );
          return (
            <section key={dept.id} className="surface-card overflow-hidden">
              <header className="flex items-center gap-2 border-b border-border bg-cream-soft px-4 py-3">
                <Users aria-hidden className="size-4 text-ink-soft" />
                <h3 className="text-sm font-semibold text-ink">{dept.name}</h3>
                <span className="code-id">{dept.code}</span>
                <span className="ml-auto">
                  <StatusBadge meta={readinessMeta[pd.readiness]} size="sm" />
                </span>
              </header>
              <div className="space-y-3 p-4 text-sm">
                <p className="text-ink-soft">{pd.note}</p>
                <div>
                  <p className="rule-label">Department owner</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-ink">
                    <Crown aria-hidden className="size-3.5 text-gold" />
                    {personById(dept.owner_id)?.full_name}
                    <span className="text-xs text-ink-soft">
                      {personById(dept.owner_id)?.title}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="rule-label">Leads</p>
                  {dept.lead_ids.length === 0 ? (
                    <p className="mt-0.5 text-ink-soft">No additional lead named</p>
                  ) : (
                    <ul className="mt-0.5 space-y-0.5">
                      {dept.lead_ids.map((id) => (
                        <li key={id} className="text-ink">
                          {personById(id)?.full_name}{" "}
                          <span className="text-xs text-ink-soft">{personById(id)?.title}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {members.length > 0 && (
                  <div>
                    <p className="rule-label">Team members</p>
                    <ul className="mt-0.5 space-y-0.5">
                      {members.map((m) => (
                        <li key={m.id} className="text-ink">
                          {m.full_name}{" "}
                          <span className="text-xs text-ink-soft">{m.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <section className="surface-card overflow-x-auto">
        <header className="border-b border-border bg-cream-soft px-4 py-3">
          <h3 className="text-sm font-semibold text-ink">Everyone with access</h3>
        </header>
        <table className="w-full min-w-[38rem] text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="rule-label px-4 py-2">Team member</th>
              <th className="rule-label px-4 py-2">Title</th>
              <th className="rule-label px-4 py-2">Department</th>
              <th className="rule-label px-4 py-2">Access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {people.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2.5 text-ink">{p.full_name}</td>
                <td className="px-4 py-2.5 text-ink-soft">{p.title}</td>
                <td className="px-4 py-2.5 text-ink-soft">
                  {departments.find((d) => d.id === p.primary_department_id)?.name}
                </td>
                <td className="px-4 py-2.5 text-ink-soft">{roleLabels[p.role]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
