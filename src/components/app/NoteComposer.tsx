import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { NOTE_COLORS, NOTE_KIND_LABEL, type NoteKind } from "@/lib/types";

const KINDS: NoteKind[] = ["note", "todo", "shopping"];

export function NoteComposer({ spaceId }: { spaceId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<NoteKind>("note");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [color, setColor] = useState<string>("default");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!user) return;
    if (!title.trim()) {
      toast.error("Bitte einen Titel eingeben.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("notes").insert({
      space_id: spaceId,
      kind,
      title: title.trim(),
      body: kind === "note" ? body : "",
      color,
      created_by: user.id,
      updated_by: user.id,
    });
    setBusy(false);
    if (error) {
      toast.error("Konnte nicht angelegt werden.");
      return;
    }
    await logActivity(spaceId, user.id, "note_created", title.trim());
    await queryClient.invalidateQueries({ queryKey: ["notes", spaceId] });
    await queryClient.invalidateQueries({ queryKey: ["activities", spaceId] });
    setTitle("");
    setBody("");
    setColor("default");
    setKind("note");
    setOpen(false);
    toast.success("Angelegt.");
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Neuer Eintrag
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuer Eintrag</DialogTitle>
            <DialogDescription>
              Notiz, To-do-Liste oder Einkaufsliste für diesen Raum.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Art</Label>
              <div className="flex gap-2">
                {KINDS.map((k) => (
                  <Button
                    key={k}
                    type="button"
                    variant={kind === k ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setKind(k)}
                  >
                    {NOTE_KIND_LABEL[k]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note-title">Titel</Label>
              <Input
                id="note-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={kind === "shopping" ? "z. B. Wocheneinkauf" : "z. B. Ideen fürs Wochenende"}
                maxLength={80}
              />
            </div>

            {kind === "note" ? (
              <div className="space-y-2">
                <Label htmlFor="note-body">Text</Label>
                <Textarea
                  id="note-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  placeholder="Was soll festgehalten werden?"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Einträge fügen Sie danach direkt in der Liste hinzu.
              </p>
            )}

            <div className="space-y-2">
              <Label>Farbe</Label>
              <div className="flex flex-wrap gap-2">
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    aria-label={c.label}
                    aria-pressed={color === c.id}
                    className={cn(
                      "size-8 rounded-full border border-border transition",
                      c.swatch,
                      color === c.id && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={create} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Anlegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
