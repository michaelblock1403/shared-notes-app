import { smartDate } from "@/lib/format";
import type { Activity } from "@/lib/types";

const ACTION_TEXT: Record<string, string> = {
  space_created: "hat den Raum angelegt",
  member_joined: "ist dem Raum beigetreten",
  note_created: "hat angelegt",
  note_updated: "hat bearbeitet",
  note_deleted: "hat gelöscht",
  item_added: "hat einen Eintrag ergänzt in",
  item_done: "hat abgehakt in",
  item_undone: "hat wieder geöffnet in",
  comment_added: "hat kommentiert",
  member_invited: "hat eingeladen:",
};

export function ActivityList({
  activities,
  nameById,
}: {
  activities: Activity[];
  nameById: (id: string) => string;
}) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Noch keine Aktivitäten.</p>
    );
  }
  return (
    <ol className="space-y-3">
      {activities.map((a) => (
        <li key={a.id} className="flex gap-3 text-sm">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
          <div className="min-w-0">
            <p>
              <span className="font-medium">{nameById(a.actor_id)}</span>{" "}
              {ACTION_TEXT[a.action] ?? a.action}{" "}
              {a.subject ? <span className="text-muted-foreground">„{a.subject}“</span> : null}
            </p>
            <p className="text-xs text-muted-foreground">{smartDate(a.created_at)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
