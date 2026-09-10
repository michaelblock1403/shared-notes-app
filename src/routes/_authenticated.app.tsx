import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Notizraum – meine Räume" },
      {
        name: "description",
        content:
          "Übersicht über Ihre gemeinsamen Räume mit Notizen, To-dos und Einkaufslisten.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppLayout,
});

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
