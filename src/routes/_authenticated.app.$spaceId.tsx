import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { History, Search, Users } from "lucide-react";

import { ActivityList } from "@/components/app/ActivityList";
import { MembersSheet } from "@/components/app/MembersSheet";
import { NoteCard } from "@/components/app/NoteCard";
import { NoteComposer } from "@/components/app/NoteComposer";
import { NoteDetailDialog } from "@/components/app/NoteDetailDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchActivities,
  fetchMembers,
  fetchNoteItems,
  fetchNotes,
  fetchSpace,
} from "@/lib/api";
import { useSpaceRealtime } from "@/hooks/useSpaceRealtime";
import { NOTE_KIND_LABEL, type NoteKind } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/$spaceId")({
  head: () => ({
    meta: [
      { title: "Raum – Notizraum" },
      { name: "description", content: "Gemeinsame Notizen, To-dos und Einkaufslisten." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SpacePage,
});

const FILTERS: Array<{ id: "all" | NoteKind; label: string }> = [
  { id: "all", label: "Alle" },
  { id: "note", label: "Notizen" },
  { id: "todo", label: "To-dos" },
  { id: "shopping", label: "Einkauf" },
];

function SpacePage() {
  const { spaceId } = Route.useParams();
  useSpaceRealtime(spaceId);

  const [filter, setFilter] = useState<"all" | NoteKind>("all");
  const [query, setQuery] = useState("");
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: space } = useQuery({
    queryKey: ["space", spaceId],
    queryFn: () => fetchSpace(spaceId),
  });
  const { data: notes, isLoading } = useQuery({
    queryKey: ["notes", spaceId],
    queryFn: () => fetchNotes(spaceId),
  });
  const noteIds = useMemo(() => (notes ?? []).map((n) => n.id), [notes]);
  const { data: items } = useQuery({
    queryKey: ["note-items", spaceId, noteIds.join(",")],
    queryFn: () => fetchNoteItems(noteIds),
    enabled: noteIds.length > 0,
  });
  const { data: members } = useQuery({
    queryKey: ["members", spaceId],
    queryFn: () => fetchMembers(spaceId),
  });
  const { data: activities } = useQuery({
    queryKey: ["activities", spaceId],
    queryFn: () => fetchActivities(spaceId),
  });

  const nameById = (id: string) =>
    (members ?? []).find((m) => m.user_id === id)?.profile?.display_name ?? "Jemand";

  const itemsByNote = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const item of items ?? []) {
      const list = map.get(item.note_id) ?? [];
      list.push(item);
      map.set(item.note_id, list);
    }
    return map;
  }, [items]);

  const visible = (notes ?? [])
    .filter((n) => !n.is_archived)
    .filter((n) => (filter === "all" ? true : n.kind === filter))
    .filter((n) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q) ||
        (itemsByNote.get(n.id) ?? []).some((i) => i.content.toLowerCase().includes(q))
      );
    });

  const openNote = (notes ?? []).find((n) => n.id === openNoteId) ?? null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-2xl">
            {space?.emoji ?? "🗒️"}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold">{space?.name ?? "Raum"}</h1>
            <p className="text-xs text-muted-foreground">
              {(members ?? []).length} Mitglied
              {(members ?? []).length === 1 ? "" : "er"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setHistoryOpen((v) => !v)}>
            <History className="size-4" /> Verlauf
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMembersOpen(true)}>
            <Users className="size-4" /> Mitglieder
          </Button>
          <NoteComposer spaceId={spaceId} />
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-xl bg-card p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm transition-colors",
                filter === f.id
                  ? "bg-primary/15 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suchen"
            aria-label="Einträge durchsuchen"
            className="pl-9"
          />
        </div>
      </div>

      {historyOpen ? (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Verlauf</h2>
          <ActivityList activities={activities ?? []} nameById={nameById} />
        </section>
      ) : null}

      <section className="mt-6">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl bg-card" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
            {query || filter !== "all"
              ? "Nichts gefunden. Andere Suche oder Filter versuchen."
              : "Noch nichts hier. Legen Sie den ersten Eintrag an."}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {visible.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                items={itemsByNote.get(note.id) ?? []}
                authorName={nameById(note.updated_by ?? note.created_by)}
                onOpen={() => setOpenNoteId(note.id)}
              />
            ))}
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          {NOTE_KIND_LABEL.note}, {NOTE_KIND_LABEL.todo} und {NOTE_KIND_LABEL.shopping} werden
          für alle Mitglieder live aktualisiert.
        </p>
      </section>

      <NoteDetailDialog
        note={openNote}
        items={openNote ? (itemsByNote.get(openNote.id) ?? []) : []}
        open={Boolean(openNote)}
        onOpenChange={(v) => !v && setOpenNoteId(null)}
        nameById={nameById}
      />

      {space ? (
        <MembersSheet space={space} open={membersOpen} onOpenChange={setMembersOpen} />
      ) : null}
    </div>
  );
}
