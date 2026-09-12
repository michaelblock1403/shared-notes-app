import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { fetchInvitations, fetchMembers, logActivity } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { initials } from "@/lib/format";
import type { Space } from "@/lib/types";

export function MembersSheet({
  space,
  open,
  onOpenChange,
}: {
  space: Space;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: members } = useQuery({
    queryKey: ["members", space.id],
    queryFn: () => fetchMembers(space.id),
    enabled: open,
  });
  const { data: invitations } = useQuery({
    queryKey: ["invitations", space.id],
    queryFn: () => fetchInvitations(space.id),
    enabled: open,
  });

  async function invite() {
    if (!user || !email.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("invitations").insert({
      space_id: space.id,
      email: email.trim().toLowerCase(),
      invited_by: user.id,
    });
    setBusy(false);
    if (error) {
      toast.error("Einladung fehlgeschlagen.");
      return;
    }
    await logActivity(space.id, user.id, "member_invited", email.trim());
    setEmail("");
    await queryClient.invalidateQueries({ queryKey: ["invitations", space.id] });
    toast.success("Einladung angelegt. Teilen Sie zusätzlich den Code.");
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} kopiert.`);
    } catch {
      toast.error("Kopieren nicht möglich.");
    }
  }

  async function leave() {
    if (!user) return;
    if (!window.confirm("Diesen Raum wirklich verlassen?")) return;
    await supabase.from("space_members").delete().eq("space_id", space.id).eq("user_id", user.id);
    await queryClient.invalidateQueries({ queryKey: ["spaces"] });
    onOpenChange(false);
    navigate({ to: "/app" });
  }

  const inviteLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth?code=${space.invite_code}`
      : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Mitglieder & Einladungen</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-8">
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground">Mitglieder</h3>
            <ul className="mt-3 space-y-2">
              {(members ?? []).map((m) => (
                <li key={m.id} className="flex items-center gap-3">
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold text-background"
                    style={{ backgroundColor: m.profile?.avatar_color ?? "#5B9DFF" }}
                  >
                    {initials(m.profile?.display_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {m.profile?.display_name ?? "Unbekannt"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.profile?.email ?? ""}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {m.role === "owner" ? "Inhaber" : "Mitglied"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Einladen</h3>
            <div className="space-y-2">
              <Label htmlFor="invite-email">Per E-Mail</Label>
              <div className="flex gap-2">
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                />
                <Button onClick={() => void invite()} disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null} Einladen
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Einladungscode</Label>
              <div className="flex gap-2">
                <Input readOnly value={space.invite_code} className="font-mono" />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Code kopieren"
                  onClick={() => void copy(space.invite_code, "Code")}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void copy(inviteLink, "Link")}
              >
                Einladungslink kopieren
              </Button>
            </div>

            {(invitations ?? []).length > 0 ? (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {(invitations ?? []).map((i) => (
                  <li key={i.id} className="flex justify-between gap-2">
                    <span className="truncate">{i.email}</span>
                    <span className="shrink-0 text-xs">
                      {i.status === "accepted" ? "angenommen" : "offen"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="border-t border-border pt-4">
            <Button variant="outline" onClick={() => void leave()}>
              Raum verlassen
            </Button>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
