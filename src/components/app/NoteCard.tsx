import { Pin } from "lucide-react";

import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NOTE_KIND_LABEL, noteAccent, type Note, type NoteItem } from "@/lib/types";

export function NoteCard({
  note,
  items,
  authorName,
  onOpen,
}: {
  note: Note;
  items: NoteItem[];
  authorName: string;
  onOpen: () => void;
}) {
  const done = items.filter((i) => i.is_done).length;
  const isList = note.kind !== "note";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent",
        "before:absolute before:inset-y-0 before:left-0 before:w-1",
        noteAccent(note.color),
      )}
    >
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {NOTE_KIND_LABEL[note.kind]}
          </p>
          <h3 className="mt-0.5 truncate font-medium">
            {note.title || "Ohne Titel"}
          </h3>
        </div>
        {note.is_pinned ? <Pin className="size-4 shrink-0 text-primary" /> : null}
      </div>

      <div className="mt-2 pl-2 text-sm text-muted-foreground">
        {isList ? (
          items.length === 0 ? (
            <p>Noch keine Einträge</p>
          ) : (
            <ul className="space-y-1">
              {items.slice(0, 3).map((i) => (
                <li key={i.id} className={cn("truncate", i.is_done && "line-through opacity-60")}>
                  • {i.content}
                  {i.quantity ? ` (${i.quantity})` : ""}
                </li>
              ))}
              {items.length > 3 ? <li>… {items.length - 3} weitere</li> : null}
            </ul>
          )
        ) : (
          <p className="line-clamp-3 whitespace-pre-wrap">
            {note.body || "Kein Inhalt"}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 pl-2 text-xs text-muted-foreground">
        <span className="truncate">
          {isList && items.length > 0 ? `${done}/${items.length} erledigt · ` : ""}
          {authorName}
        </span>
        <span className="shrink-0">{relativeTime(note.updated_at)}</span>
      </div>
    </button>
  );
}
