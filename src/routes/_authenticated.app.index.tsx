import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Inbox, MailOpen } from "lucide-react";
import { toast } from "sonner";

import { InstallHint } from "@/components/InstallHint";
import { CreateSpaceDialog, JoinSpaceDialog } from "@/components/spaces/SpaceDialogs";
import { Button } from "@/components/ui/button";
import { fetchMyInvitations, fetchSpaces } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { relativeTime } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import type { Invitation } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Übersicht – Notizraum" },
      { name: "description", content: "Ihre gemeinsamen Räume auf einen Blick." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: spaces, isLoading } = useQuery({ queryKey: ["spaces"], queryFn: fetchSpaces });
  const { data: invitations } = useQuery({
    queryKey: ["my-invitations", profile?.email ?? null],
    queryFn: () => fetchMyInvitations(profile?.email ?? null),
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  async function acceptInvite(inv: Invitation) {
    const { data, error } = await supabase.rpc("accept_invitation", {
      _invitation_id: inv.id,
    });
    if (error) {
      toast.error("Einladung konnte nicht angenommen werden.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["spaces"] });
    await queryClient.invalidateQueries({ queryKey: ["my-invitations"] });
    toast.success("Einladung angenommen.");
    if (typeof data === "string") {
      window.location.assign(`/app/${data}`);
    }
  }

  const name = profile?.display_name ?? "Hallo";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">
            Schön, dass Sie da sind, {name}.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hier laufen Ihre gemeinsamen Räume zusammen.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setJoinOpen(true)}>
            Beitreten
          </Button>
          <Button onClick={() => setCreateOpen(true)}>Raum anlegen</Button>
        </div>
      </header>

      <div className="mt-6">
        <InstallHint />
      </div>

      {(invitations ?? []).length > 0 ? (
        <section className="mt-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <MailOpen className="size-4" /> Offene Einladungen
          </h2>
          <div className="mt-3 space-y-2">
            {(invitations ?? []).map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="text-sm">
                    Einladung in einen Raum
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Eingeladen am {new Date(inv.created_at).toLocaleDateString("de-DE")}
                  </p>
                </div>
                <Button size="sm" onClick={() => acceptInvite(inv)}>
                  Annehmen
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-muted-foreground">Ihre Räume</h2>
        {isLoading ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-card" />
            ))}
          </div>
        ) : (spaces ?? []).length === 0 ? (
          <div className="mt-3 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
            <Inbox className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Sie haben noch keinen Raum. Legen Sie den ersten an oder treten Sie
              einem Raum mit einem Einladungscode bei.
            </p>
            <Button onClick={() => setCreateOpen(true)}>Ersten Raum anlegen</Button>
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(spaces ?? []).map((space) => (
              <Link
                key={space.id}
                to="/app/$spaceId"
                params={{ spaceId: space.id }}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-2xl">
                  {space.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{space.name}</p>
                  <p className="text-xs text-muted-foreground">
                    erstellt {relativeTime(space.created_at)}
                  </p>
                </div>
                <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        )}
      </section>

      <CreateSpaceDialog open={createOpen} onOpenChange={setCreateOpen} />
      <JoinSpaceDialog open={joinOpen} onOpenChange={setJoinOpen} />
    </div>
  );
}
