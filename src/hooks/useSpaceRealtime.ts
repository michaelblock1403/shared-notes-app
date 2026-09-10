import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/**
 * Hält Notizen, Listeneinträge, Kommentare und den Verlauf eines Raums live.
 */
export function useSpaceRealtime(spaceId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!spaceId) return;

    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ["notes", spaceId] });
      void queryClient.invalidateQueries({ queryKey: ["note-items", spaceId] });
      void queryClient.invalidateQueries({ queryKey: ["activities", spaceId] });
      void queryClient.invalidateQueries({ queryKey: ["members", spaceId] });
    };

    const channel = supabase
      .channel(`space-${spaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "note_items" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "space_members" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["comments"] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [spaceId, queryClient]);
}
