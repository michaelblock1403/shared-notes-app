import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/settings")({
  head: () => ({
    meta: [
      { title: "Einstellungen – Notizraum" },
      { name: "description", content: "Profil und Konto verwalten." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

const COLORS = ["#5B9DFF", "#7CD9B4", "#F5C26B", "#E08585", "#B89BE8", "#62D3E0"];

function SettingsPage() {
  const { profile, user, refreshProfile, signOut } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [color, setColor] = useState(profile?.avatar_color ?? COLORS[0]);
  const [busyName, setBusyName] = useState(false);

  async function saveProfile() {
    if (!user) return;
    setBusyName(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim() || "Nutzer", avatar_color: color })
      .eq("id", user.id);
    setBusyName(false);
    if (error) {
      toast.error("Speichern fehlgeschlagen.");
      return;
    }
    await refreshProfile();
    toast.success("Profil aktualisiert.");
  }

  const googleLinked = (user?.app_metadata ?? {})["provider"] === "google" ||
    (user?.identities ?? []).some((i) => i.provider === "google");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 lg:py-10">
      <h1 className="text-2xl font-semibold">Einstellungen</h1>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-muted-foreground">Profil</h2>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">Anzeigename</Label>
            <Input
              id="display-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="z. B. Mira"
            />
          </div>
          <div className="space-y-2">
            <Label>Avatar-Farbe</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-pressed={color === c}
                  className={`size-9 rounded-full ring-2 ring-offset-2 ring-offset-card transition ${
                    color === c ? "ring-foreground" : "ring-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          <Button onClick={saveProfile} disabled={busyName}>
            {busyName ? <Loader2 className="size-4 animate-spin" /> : null}
            Speichern
          </Button>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-muted-foreground">Konto</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">E-Mail</dt>
            <dd className="truncate font-medium">{user?.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Google-Anmeldung</dt>
            <dd className="font-medium">{googleLinked ? "Verknüpft" : "Nicht verknüpft"}</dd>
          </div>
        </dl>
        <div className="mt-5">
          <Button variant="outline" onClick={() => void signOut().then(() => window.location.assign("/auth"))}>
            Abmelden
          </Button>
        </div>
      </section>
    </div>
  );
}
