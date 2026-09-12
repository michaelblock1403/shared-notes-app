import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pin, PinOff, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { fetchComments, logActivity } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { smartDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NOTE_COLORS, NOTE_KIND_LABEL, type Note, type NoteItem } from "@/lib/types";

export function NoteDetailDialog({
  note,
  items,
  open,
  onOpenChange,
  nameById,
}: {
  note: Note | null;
  items: NoteItem[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nameById: (id: string) => string;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [newItem, setNewItem] = useState("");
  const [newQty, setNewQty] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTitle(note?.title ?? "");
    setBody(note?.body ?? "");
  }, [note?.id, note?.title, note?.body]);

  const { data: comments } = useQuery({
    queryKey: ["comments", note?.id],
    queryFn: () => fetchComments(note!.id),
    enabled: Boolean(note?.id) && open,
  });

  if (!note) return null;
  const spaceId = note.space_id;
  const isList = note.kind !== "note";

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["notes", spaceId] });
    await queryClient.invalidateQueries({ queryKey: ["note-items", spaceId] });
    await queryClient.invalidateQueries({ queryKey: ["activities", spaceId] });
  }

  async function saveNote() {
    if (!user || !note) return;
    setBusy(true);
    const { error } = await supabase
      .from("notes")
      .update({ title: title.trim(), body, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq("id", note.id);
    setBusy(false);
    if (error) {
      toast.error("Speichern fehlgeschlagen.");
      return;
    }
    await logActivity(spaceId, user.id, "note_updated", title.trim(), note.id);
    await refresh();
    toast.success("Gespeichert.");
  }

  async function setColor(color: string) {
    if (!user || !note) return;
    await supabase.from("notes").update({ color, updated_by: user.id }).eq("id", note.id);
    await refresh();
  }

  async function togglePin() {
    if (!user || !note) return;
    await supabase
      .from("notes")
      .update({ is_pinned: !note.is_pinned, updated_by: user.id })
      .eq("id", note.id);
    await refresh();
  }

  async function removeNote() {
    if (!user || !note) return;
    if (!window.confirm("Diesen Eintrag wirklich löschen?")) return;
    await supabase.from("notes").delete().eq("id", note.id);
    await logActivity(spaceId, user.id, "note_deleted", note.title);
    await refresh();
    onOpenChange(false);
    toast.success("Gelöscht.");
  }

  async function addItem() {
    if (!user || !note || !newItem.trim()) return;
    const { error } = await supabase.from("note_items").insert({
      note_id: note.id,
      content: newItem.trim(),
      quantity: note.kind === "shopping" && newQty.trim() ? newQty.trim() : null,
      position: items.length,
      created_by: user.id,
    });
    if (error) {
      toast.error("Eintrag konnte nicht ergänzt werden.");
      return;
    }
    await logActivity(spaceId, user.id, "item_added", note.title, note.id);
    setNewItem("");
    setNewQty("");
    await refresh();
  }

  async function toggleItem(item: NoteItem) {
    if (!user || !note) return;
    const next = !item.is_done;
    await supabase
      .from("note_items")
      .update({
        is_done: next,
        done_by: next ? user.id : null,
        done_at: next ? new Date().toISOString() : null,
      })
      .eq("id", item.id);
    await logActivity(spaceId, user.id, next ? "item_done" : "item_undone", item.content, note.id);
    await refresh();
  }

  async function removeItem(id: string) {
    await supabase.from("note_items").delete().eq("id", id);
    await refresh();
  }

  async function addComment() {
    if (!user || !note || !comment.trim()) return;
    const { error } = await supabase
      .from("comments")
      .insert({ note_id: note.id, user_id: user.id, body: comment.trim() });
    if (error) {
      toast.error("Kommentar fehlgeschlagen.");
      return;
    }
    await logActivity(spaceId, user.id, "comment_added", note.title, note.id);
    setComment("");
    await queryClient.invalidateQueries({ queryKey: ["comments", note.id] });
    await queryClient.invalidateQueries({ queryKey: ["activities", spaceId] });
  }

  async function removeComment(id: string) {
    await supabase.from("comments").delete().eq("id", id);
    await queryClient.invalidateQueries({ queryKey: ["comments", note!.id] });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-normal text-muted-foreground">
            {NOTE_KIND_LABEL[note.kind]}
          </DialogTitle>
        </DialogHeader>

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-base font-medium"
          aria-label="Titel"
          maxLength={80}
        />

        {isList ? (
          <div className="space-y-2">
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-accent">
                  <Checkbox
                    checked={item.is_done}
                    onCheckedChange={() => void toggleItem(item)}
                    aria-label={item.content}
                  />
                  <span className={cn("min-w-0 flex-1 truncate text-sm", item.is_done && "line-through opacity-60")}>
                    {item.content}
                    {item.quantity ? (
                      <span className="ml-2 text-xs text-muted-foreground">{item.quantity}</span>
                    ) : null}
                  </span>
                  {item.is_done && item.done_by ? (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {nameById(item.done_by)}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void removeItem(item.id)}
                    aria-label="Eintrag entfernen"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void addItem();
                }}
                placeholder="Neuer Eintrag"
              />
              {note.kind === "shopping" ? (
                <Input
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  placeholder="Menge"
                  className="w-24"
                />
              ) : null}
              <Button size="icon" onClick={() => void addItem()} aria-label="Hinzufügen">
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            aria-label="Text"
            placeholder="Notiztext"
          />
        )}

        <div className="flex flex-wrap items-center gap-2">
          {NOTE_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => void setColor(c.id)}
              aria-label={c.label}
              aria-pressed={note.color === c.id}
              className={cn(
                "size-7 rounded-full border border-border",
                c.swatch,
                note.color === c.id && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
              )}
            />
          ))}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void togglePin()}>
              {note.is_pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
              {note.is_pinned ? "Lösen" : "Anheften"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void removeNote()}>
              <Trash2 className="size-4" /> Löschen
            </Button>
            <Button size="sm" onClick={() => void saveNote()} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null} Speichern
            </Button>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Kommentare</h3>
          <ul className="mt-3 space-y-3">
            {(comments ?? []).map((c) => (
              <li key={c.id} className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{nameById(c.user_id)}</span>
                  <span className="text-xs text-muted-foreground">{smartDate(c.created_at)}</span>
                  {c.user_id === user?.id ? (
                    <button
                      type="button"
                      onClick={() => void removeComment(c.id)}
                      className="ml-auto text-xs text-muted-foreground hover:text-destructive"
                    >
                      Löschen
                    </button>
                  ) : null}
                </div>
                <p className="whitespace-pre-wrap text-muted-foreground">{c.body}</p>
              </li>
            ))}
            {(comments ?? []).length === 0 ? (
              <li className="text-sm text-muted-foreground">Noch keine Kommentare.</li>
            ) : null}
          </ul>
          <div className="mt-3 flex gap-2">
            <Input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addComment();
              }}
              placeholder="Kommentar schreiben"
            />
            <Button size="icon" onClick={() => void addComment()} aria-label="Senden">
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
