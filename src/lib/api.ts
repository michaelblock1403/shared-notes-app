import { supabase } from "@/integrations/supabase/client";
import type { Activity, Comment, Invitation, Note, NoteItem, Space, SpaceMember } from "./types";

export type MemberWithProfile = SpaceMember & {
  profile: { id: string; display_name: string; email: string | null; avatar_color: string } | null;
};

export async function fetchSpaces(): Promise<Space[]> {
  const { data, error } = await supabase
    .from("spaces")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Space[];
}

export async function fetchSpace(spaceId: string): Promise<Space | null> {
  const { data, error } = await supabase.from("spaces").select("*").eq("id", spaceId).maybeSingle();
  if (error) throw error;
  return (data as Space) ?? null;
}

export async function fetchNotes(spaceId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("space_id", spaceId)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Note[];
}

export async function fetchNoteItems(spaceNoteIds: string[]): Promise<NoteItem[]> {
  if (spaceNoteIds.length === 0) return [];
  const { data, error } = await supabase
    .from("note_items")
    .select("*")
    .in("note_id", spaceNoteIds)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as NoteItem[];
}

export async function fetchComments(noteId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("note_id", noteId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Comment[];
}

export async function fetchMembers(spaceId: string): Promise<MemberWithProfile[]> {
  const { data, error } = await supabase
    .from("space_members")
    .select("*")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const members = (data ?? []) as SpaceMember[];
  if (members.length === 0) return [];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, email, avatar_color")
    .in(
      "id",
      members.map((m) => m.user_id),
    );
  return members.map((m) => ({
    ...m,
    profile: (profiles ?? []).find((p) => p.id === m.user_id) ?? null,
  }));
}

export async function fetchActivities(spaceId: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  return (data ?? []) as Activity[];
}

export async function fetchInvitations(spaceId: string): Promise<Invitation[]> {
  const { data, error } = await supabase
    .from("invitations")
    .select("*")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Invitation[];
}

export async function fetchMyInvitations(email: string | null): Promise<Invitation[]> {
  if (!email) return [];
  const { data, error } = await supabase
    .from("invitations")
    .select("*")
    .eq("status", "pending")
    .ilike("email", email);
  if (error) throw error;
  return (data ?? []) as Invitation[];
}

export async function logActivity(
  spaceId: string,
  actorId: string,
  action: string,
  subject: string,
  noteId?: string | null,
) {
  await supabase.from("activities").insert({
    space_id: spaceId,
    actor_id: actorId,
    action,
    subject: subject.slice(0, 120),
    note_id: noteId ?? null,
  });
}

export async function profilesByIds(ids: string[]) {
  const unique = Array.from(new Set(ids)).filter(Boolean);
  if (unique.length === 0) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, email, avatar_color")
    .in("id", unique);
  return data ?? [];
}
