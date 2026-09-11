import { createFileRoute } from "@tanstack/react-router";
import { MyWorkPage } from "@/components/MyWorkPage";
export const Route = createFileRoute("/inbox")({
  head: () => ({
    meta: [
      { title: "My Work — Sight & Sound Show Production" },
      {
        name: "description",
        content:
          "Everything that needs you across every production: reviews waiting on you, mentions of you and your departments, and the work you are assigned.",
      },
      { property: "og:title", content: "My Work — Sight & Sound Show Production" },
      {
        property: "og:description",
        content: "Reviews, mentions, and assigned work waiting on you across all productions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyWorkPage,
});
