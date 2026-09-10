CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_space_member(_space_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.space_members WHERE space_id = _space_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION private.is_space_owner(_space_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.space_members WHERE space_id = _space_id AND user_id = _user_id AND role = 'owner');
$$;

CREATE OR REPLACE FUNCTION private.note_space_id(_note_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT space_id FROM public.notes WHERE id = _note_id;
$$;

CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_color)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name',''), NULLIF(NEW.raw_user_meta_data->>'full_name',''), split_part(COALESCE(NEW.email,'nutzer@'), '@', 1)),
    (ARRAY['#5B9DFF','#22C7A9','#F5A524','#F1737F','#A78BFA','#4ADE80'])[1 + floor(random()*6)::int]
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION private.is_space_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_space_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.note_space_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_space_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_space_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.note_space_id(uuid) TO authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
DROP TRIGGER IF EXISTS spaces_updated_at ON public.spaces;
CREATE TRIGGER spaces_updated_at BEFORE UPDATE ON public.spaces
FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
DROP TRIGGER IF EXISTS notes_updated_at ON public.notes;
CREATE TRIGGER notes_updated_at BEFORE UPDATE ON public.notes
FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

DROP POLICY "spaces_select_member" ON public.spaces;
DROP POLICY "spaces_update_owner" ON public.spaces;
DROP POLICY "spaces_delete_owner" ON public.spaces;
DROP POLICY "members_select" ON public.space_members;
DROP POLICY "members_delete" ON public.space_members;
DROP POLICY "notes_select" ON public.notes;
DROP POLICY "notes_insert" ON public.notes;
DROP POLICY "notes_update" ON public.notes;
DROP POLICY "notes_delete" ON public.notes;
DROP POLICY "note_items_select" ON public.note_items;
DROP POLICY "note_items_insert" ON public.note_items;
DROP POLICY "note_items_update" ON public.note_items;
DROP POLICY "note_items_delete" ON public.note_items;
DROP POLICY "comments_select" ON public.comments;
DROP POLICY "comments_insert" ON public.comments;
DROP POLICY "activities_select" ON public.activities;
DROP POLICY "activities_insert" ON public.activities;
DROP POLICY "invitations_select" ON public.invitations;
DROP POLICY "invitations_insert" ON public.invitations;
DROP POLICY "invitations_update" ON public.invitations;
DROP POLICY "invitations_delete" ON public.invitations;

CREATE POLICY "spaces_select_member" ON public.spaces FOR SELECT TO authenticated
  USING (private.is_space_member(id, auth.uid()));
CREATE POLICY "spaces_update_owner" ON public.spaces FOR UPDATE TO authenticated
  USING (private.is_space_owner(id, auth.uid())) WITH CHECK (private.is_space_owner(id, auth.uid()));
CREATE POLICY "spaces_delete_owner" ON public.spaces FOR DELETE TO authenticated
  USING (private.is_space_owner(id, auth.uid()));

CREATE POLICY "members_select" ON public.space_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_space_member(space_id, auth.uid()));
CREATE POLICY "members_delete" ON public.space_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR private.is_space_owner(space_id, auth.uid()));

CREATE POLICY "notes_select" ON public.notes FOR SELECT TO authenticated
  USING (private.is_space_member(space_id, auth.uid()));
CREATE POLICY "notes_insert" ON public.notes FOR INSERT TO authenticated
  WITH CHECK (private.is_space_member(space_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "notes_update" ON public.notes FOR UPDATE TO authenticated
  USING (private.is_space_member(space_id, auth.uid())) WITH CHECK (private.is_space_member(space_id, auth.uid()));
CREATE POLICY "notes_delete" ON public.notes FOR DELETE TO authenticated
  USING (private.is_space_member(space_id, auth.uid()));

CREATE POLICY "note_items_select" ON public.note_items FOR SELECT TO authenticated
  USING (private.is_space_member(private.note_space_id(note_id), auth.uid()));
CREATE POLICY "note_items_insert" ON public.note_items FOR INSERT TO authenticated
  WITH CHECK (private.is_space_member(private.note_space_id(note_id), auth.uid()) AND created_by = auth.uid());
CREATE POLICY "note_items_update" ON public.note_items FOR UPDATE TO authenticated
  USING (private.is_space_member(private.note_space_id(note_id), auth.uid()))
  WITH CHECK (private.is_space_member(private.note_space_id(note_id), auth.uid()));
CREATE POLICY "note_items_delete" ON public.note_items FOR DELETE TO authenticated
  USING (private.is_space_member(private.note_space_id(note_id), auth.uid()));

CREATE POLICY "comments_select" ON public.comments FOR SELECT TO authenticated
  USING (private.is_space_member(private.note_space_id(note_id), auth.uid()));
CREATE POLICY "comments_insert" ON public.comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND private.is_space_member(private.note_space_id(note_id), auth.uid()));

CREATE POLICY "activities_select" ON public.activities FOR SELECT TO authenticated
  USING (private.is_space_member(space_id, auth.uid()));
CREATE POLICY "activities_insert" ON public.activities FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() AND private.is_space_member(space_id, auth.uid()));

CREATE POLICY "invitations_select" ON public.invitations FOR SELECT TO authenticated
  USING (private.is_space_member(space_id, auth.uid()) OR lower(email) = lower(COALESCE(auth.jwt()->>'email','')));
CREATE POLICY "invitations_insert" ON public.invitations FOR INSERT TO authenticated
  WITH CHECK (invited_by = auth.uid() AND private.is_space_member(space_id, auth.uid()));
CREATE POLICY "invitations_update" ON public.invitations FOR UPDATE TO authenticated
  USING (lower(email) = lower(COALESCE(auth.jwt()->>'email','')) OR private.is_space_member(space_id, auth.uid()))
  WITH CHECK (true);
CREATE POLICY "invitations_delete" ON public.invitations FOR DELETE TO authenticated
  USING (private.is_space_member(space_id, auth.uid()) OR lower(email) = lower(COALESCE(auth.jwt()->>'email','')));

DROP FUNCTION IF EXISTS public.is_space_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_space_owner(uuid, uuid);
DROP FUNCTION IF EXISTS public.note_space_id(uuid);
DROP FUNCTION IF EXISTS public.set_updated_at();
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.create_space(_name text, _emoji text DEFAULT '🗒️')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Nicht angemeldet'; END IF;
  IF coalesce(trim(_name),'') = '' THEN RAISE EXCEPTION 'Name fehlt'; END IF;
  INSERT INTO public.spaces (name, emoji, created_by) VALUES (trim(_name), coalesce(nullif(_emoji,''),'🗒️'), _uid)
  RETURNING id INTO _id;
  INSERT INTO public.space_members (space_id, user_id, role) VALUES (_id, _uid, 'owner');
  INSERT INTO public.activities (space_id, actor_id, action, subject) VALUES (_id, _uid, 'space_created', trim(_name));
  RETURN _id;
END; $$;

REVOKE ALL ON FUNCTION public.create_space(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_space_by_code(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_invitation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_space(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_space_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(uuid) TO authenticated;