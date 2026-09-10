export type NoteKind = "note" | "todo" | "shopping";

export type Space = {
  id: string;
  name: string;
  emoji: string;
  invite_code: string;
  created_by: string;
  created_at: string;
};

export type SpaceMember = {
  id: string;
  space_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

export type Note = {
  id: string;
  space_id: string;
  kind: NoteKind;
  title: string;
  body: string;
  color: string;
  is_pinned: boolean;
  is_archived: boolean;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type NoteItem = {
  id: string;
  note_id: string;
  content: string;
  quantity: string | null;
  is_done: boolean;
  position: number;
  created_by: string;
  done_by: string | null;
  done_at: string | null;
  created_at: string;
};

export type Comment = {
  id: string;
  note_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export type Activity = {
  id: string;
  space_id: string;
  actor_id: string;
  note_id: string | null;
  action: string;
  subject: string;
  created_at: string;
};

export type Invitation = {
  id: string;
  space_id: string;
  email: string;
  invited_by: string;
  status: string;
  created_at: string;
};

export const NOTE_KIND_LABEL: Record<NoteKind, string> = {
  note: "Notiz",
  todo: "To-do",
  shopping: "Einkauf",
};

export const NOTE_COLORS = [
  { id: "default", label: "Standard", swatch: "bg-card" },
  { id: "blue", label: "Blau", swatch: "bg-primary/25" },
  { id: "mint", label: "Mint", swatch: "bg-success/25" },
  { id: "amber", label: "Bernstein", swatch: "bg-warning/25" },
  { id: "rose", label: "Rosé", swatch: "bg-destructive/25" },
] as const;

export function noteAccent(color: string): string {
  switch (color) {
    case "blue":
      return "before:bg-primary";
    case "mint":
      return "before:bg-success";
    case "amber":
      return "before:bg-warning";
    case "rose":
      return "before:bg-destructive";
    default:
      return "before:bg-border";
  }
}
