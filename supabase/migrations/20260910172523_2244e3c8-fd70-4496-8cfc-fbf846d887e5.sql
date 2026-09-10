-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text NOT NULL DEFAULT 'Nutzer',
  avatar_color text NOT NULL DEFAULT '#5B9DFF',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
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

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- spaces
CREATE TABLE public.spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🗒️',
  invite_code text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 8)),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spaces TO authenticated;
GRANT ALL ON public.spaces TO service_role;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.space_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (space_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.space_members TO authenticated;
GRANT ALL ON public.space_members TO service_role;
ALTER TABLE public.space_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_space_member(_space_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.space_members WHERE space_id = _space_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_space_owner(_space_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.space_members WHERE space_id = _space_id AND user_id = _user_id AND role = 'owner');
$$;

CREATE POLICY "spaces_select_member" ON public.spaces FOR SELECT TO authenticated
  USING (public.is_space_member(id, auth.uid()));
CREATE POLICY "spaces_update_owner" ON public.spaces FOR UPDATE TO authenticated
  USING (public.is_space_owner(id, auth.uid())) WITH CHECK (public.is_space_owner(id, auth.uid()));
CREATE POLICY "spaces_delete_owner" ON public.spaces FOR DELETE TO authenticated
  USING (public.is_space_owner(id, auth.uid()));

CREATE POLICY "members_select" ON public.space_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_space_member(space_id, auth.uid()));
CREATE POLICY "members_delete" ON public.space_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_space_owner(space_id, auth.uid()));

CREATE TRIGGER spaces_updated_at BEFORE UPDATE ON public.spaces
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- notes
CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'note',
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'default',
  is_pinned boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notes_kind_check CHECK (kind IN ('note','todo','shopping'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes_select" ON public.notes FOR SELECT TO authenticated
  USING (public.is_space_member(space_id, auth.uid()));
CREATE POLICY "notes_insert" ON public.notes FOR INSERT TO authenticated
  WITH CHECK (public.is_space_member(space_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "notes_update" ON public.notes FOR UPDATE TO authenticated
  USING (public.is_space_member(space_id, auth.uid())) WITH CHECK (public.is_space_member(space_id, auth.uid()));
CREATE POLICY "notes_delete" ON public.notes FOR DELETE TO authenticated
  USING (public.is_space_member(space_id, auth.uid()));
CREATE TRIGGER notes_updated_at BEFORE UPDATE ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX notes_space_idx ON public.notes (space_id, is_archived, is_pinned, updated_at DESC);

CREATE OR REPLACE FUNCTION public.note_space_id(_note_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT space_id FROM public.notes WHERE id = _note_id;
$$;

-- note items
CREATE TABLE public.note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  content text NOT NULL,
  quantity text,
  is_done boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  done_by uuid,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_items TO authenticated;
GRANT ALL ON public.note_items TO service_role;
ALTER TABLE public.note_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "note_items_select" ON public.note_items FOR SELECT TO authenticated
  USING (public.is_space_member(public.note_space_id(note_id), auth.uid()));
CREATE POLICY "note_items_insert" ON public.note_items FOR INSERT TO authenticated
  WITH CHECK (public.is_space_member(public.note_space_id(note_id), auth.uid()) AND created_by = auth.uid());
CREATE POLICY "note_items_update" ON public.note_items FOR UPDATE TO authenticated
  USING (public.is_space_member(public.note_space_id(note_id), auth.uid()))
  WITH CHECK (public.is_space_member(public.note_space_id(note_id), auth.uid()));
CREATE POLICY "note_items_delete" ON public.note_items FOR DELETE TO authenticated
  USING (public.is_space_member(public.note_space_id(note_id), auth.uid()));
CREATE INDEX note_items_note_idx ON public.note_items (note_id, position);

-- comments
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_select" ON public.comments FOR SELECT TO authenticated
  USING (public.is_space_member(public.note_space_id(note_id), auth.uid()));
CREATE POLICY "comments_insert" ON public.comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_space_member(public.note_space_id(note_id), auth.uid()));
CREATE POLICY "comments_delete_own" ON public.comments FOR DELETE TO authenticated
  USING (user_id = auth.uid());
CREATE INDEX comments_note_idx ON public.comments (note_id, created_at);

-- activities
CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  note_id uuid REFERENCES public.notes(id) ON DELETE SET NULL,
  action text NOT NULL,
  subject text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activities_select" ON public.activities FOR SELECT TO authenticated
  USING (public.is_space_member(space_id, auth.uid()));
CREATE POLICY "activities_insert" ON public.activities FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() AND public.is_space_member(space_id, auth.uid()));
CREATE INDEX activities_space_idx ON public.activities (space_id, created_at DESC);

-- invitations
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invitations_status_check CHECK (status IN ('pending','accepted','declined')),
  UNIQUE (space_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;
GRANT ALL ON public.invitations TO service_role;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invitations_select" ON public.invitations FOR SELECT TO authenticated
  USING (public.is_space_member(space_id, auth.uid()) OR lower(email) = lower(COALESCE(auth.jwt()->>'email','')));
CREATE POLICY "invitations_insert" ON public.invitations FOR INSERT TO authenticated
  WITH CHECK (invited_by = auth.uid() AND public.is_space_member(space_id, auth.uid()));
CREATE POLICY "invitations_delete" ON public.invitations FOR DELETE TO authenticated
  USING (public.is_space_member(space_id, auth.uid()) OR lower(email) = lower(COALESCE(auth.jwt()->>'email','')));
CREATE POLICY "invitations_update" ON public.invitations FOR UPDATE TO authenticated
  USING (lower(email) = lower(COALESCE(auth.jwt()->>'email','')) OR public.is_space_member(space_id, auth.uid()))
  WITH CHECK (true);
CREATE INDEX invitations_email_idx ON public.invitations (lower(email), status);

-- RPCs
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

CREATE OR REPLACE FUNCTION public.join_space_by_code(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _space public.spaces;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Nicht angemeldet'; END IF;
  SELECT * INTO _space FROM public.spaces WHERE invite_code = upper(trim(_code));
  IF _space.id IS NULL THEN RAISE EXCEPTION 'Ungültiger Einladungscode'; END IF;
  INSERT INTO public.space_members (space_id, user_id, role) VALUES (_space.id, _uid, 'member')
  ON CONFLICT (space_id, user_id) DO NOTHING;
  UPDATE public.invitations SET status = 'accepted'
   WHERE space_id = _space.id AND lower(email) = lower(coalesce(auth.jwt()->>'email','')) AND status = 'pending';
  INSERT INTO public.activities (space_id, actor_id, action, subject) VALUES (_space.id, _uid, 'member_joined', '');
  RETURN _space.id;
END; $$;

CREATE OR REPLACE FUNCTION public.accept_invitation(_invitation_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _inv public.invitations;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Nicht angemeldet'; END IF;
  SELECT * INTO _inv FROM public.invitations WHERE id = _invitation_id;
  IF _inv.id IS NULL OR lower(_inv.email) <> lower(coalesce(auth.jwt()->>'email','')) THEN
    RAISE EXCEPTION 'Einladung nicht gefunden';
  END IF;
  INSERT INTO public.space_members (space_id, user_id, role) VALUES (_inv.space_id, _uid, 'member')
  ON CONFLICT (space_id, user_id) DO NOTHING;
  UPDATE public.invitations SET status = 'accepted' WHERE id = _inv.id;
  INSERT INTO public.activities (space_id, actor_id, action, subject) VALUES (_inv.space_id, _uid, 'member_joined', '');
  RETURN _inv.space_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.create_space(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_space_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(uuid) TO authenticated;

-- realtime
ALTER TABLE public.notes REPLICA IDENTITY FULL;
ALTER TABLE public.note_items REPLICA IDENTITY FULL;
ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER TABLE public.activities REPLICA IDENTITY FULL;
ALTER TABLE public.space_members REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.note_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.space_members;