import { createFileRoute } from "@tanstack/react-router";
import { MyWorkPage } from "@/components/MyWorkPage";
export const Route = createFileRoute("/")({
  component: MyWorkPage,
  head: () => ({ meta: [{ title: "My Work — Sight & Sound" }] }),
});
