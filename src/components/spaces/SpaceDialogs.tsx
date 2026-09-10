import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const EMOJIS = ["🏠", "👨‍👩‍👧", "🛒", "💼", "🎒", "🌱", "🎉", "🗒️"];

export function CreateSpaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🏠");
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("create_space", {
      _name: name,
      _emoji: emoji,
    });
    setBusy(false);
    if (error) {
      toast.error("Raum konnte nicht angelegt werden.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["spaces"] });
    toast.success(`Raum „${name.trim()}“ ist bereit.`);
    onOpenChange(false);
    setName("");
    if (typeof data === "string") void navigate({ to: "/app/$spaceId", params: { spaceId: data } });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neuen Raum anlegen</DialogTitle>
          <DialogDescription>
            Ein Raum bündelt Notizen und Listen für eine Gruppe – zum Beispiel WG, Familie oder ein
            Projekt.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="space-name">Name des Raums</Label>
            <Input
              id="space-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. WG Lindenstraße"
              required
              maxLength={60}
              autoFocus
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Symbol</legend>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setEmoji(item)}
                  aria-pressed={emoji === item}
                  className={`grid size-10 place-items-center rounded-xl border text-lg transition-colors ${
                    emoji === item
                      ? "border-primary bg-primary/15"
                      : "border-border bg-card hover:bg-accent"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Raum anlegen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function JoinSpaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("join_space_by_code", { _code: code });
    setBusy(false);
    if (error) {
      toast.error("Dieser Einladungscode passt zu keinem Raum.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["spaces"] });
    toast.success("Sie sind dem Raum beigetreten.");
    onOpenChange(false);
    setCode("");
    if (typeof data === "string") void navigate({ to: "/app/$spaceId", params: { spaceId: data } });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Raum beitreten</DialogTitle>
          <DialogDescription>
            Geben Sie den achtstelligen Einladungscode ein, den Sie erhalten haben.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-code">Einladungscode</Label>
            <Input
              id="invite-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="z. B. 7F3A9C2B"
              className="font-mono tracking-[0.2em] uppercase"
              maxLength={12}
              required
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Beitreten
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
