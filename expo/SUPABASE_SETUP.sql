-- ============================================================
-- AutiNote — single, authoritative Supabase setup script.
--
-- This is the ONLY SQL you need. It is safe to run multiple
-- times. It drops every previous version of the app's tables,
-- policies, functions, and triggers, then recreates them
-- exactly the way the app expects them.
--
-- It does NOT touch auth.users, so your existing logins keep
-- working — you'll just need to re-onboard once after running
-- this (because all profiles/children/etc. are wiped).
--
-- After running:
--   1) Sign out of every test account on the device.
--   2) Sign in fresh and complete onboarding.
--      - Therapist email → choose "Therapist".
--      - Parent email   → choose "Parent", add child, invite
--        therapist by email.
--   3) Therapist app auto-accepts the invite on next load.
-- ============================================================


-- ============================================================
-- 0. Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- 1. DROP everything from previous attempts (clean slate)
-- ============================================================
DROP TRIGGER IF EXISTS trg_prevent_therapist_role_flip ON public.profiles;
DROP TRIGGER IF EXISTS trg_set_therapist_notes_updated_at ON public.therapist_notes;

DROP FUNCTION IF EXISTS public.prevent_therapist_role_flip()        CASCADE;
DROP FUNCTION IF EXISTS public.accept_therapist_invites()           CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at()                     CASCADE;
DROP FUNCTION IF EXISTS public.current_profile_id()                 CASCADE;
DROP FUNCTION IF EXISTS public.is_therapist_for_parent(uuid)        CASCADE;
DROP FUNCTION IF EXISTS public.is_therapist_for_child(uuid)         CASCADE;
DROP FUNCTION IF EXISTS public.can_view_child_logs(uuid)            CASCADE;

DROP TABLE IF EXISTS public.chat_messages    CASCADE;
DROP TABLE IF EXISTS public.note_comments    CASCADE;
DROP TABLE IF EXISTS public.therapist_notes  CASCADE;
DROP TABLE IF EXISTS public.log_entries      CASCADE;
DROP TABLE IF EXISTS public.shared_access    CASCADE;
DROP TABLE IF EXISTS public.preferences      CASCADE;
DROP TABLE IF EXISTS public.children         CASCADE;
DROP TABLE IF EXISTS public.profiles         CASCADE;


-- ============================================================
-- 2. TABLES
-- ============================================================

-- profiles ----------------------------------------------------
CREATE TABLE public.profiles (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL UNIQUE
                                  REFERENCES auth.users(id) ON DELETE CASCADE,
  role              text        NOT NULL DEFAULT 'parent'
                                  CHECK (role IN ('parent','teacher','therapist','caregiver')),
  caregiver_name    text,
  caregiver_email   text,
  caregiver_phone   text,
  therapist_phone   text,
  active_child_id   uuid,
  is_explore_mode   boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_user_id          ON public.profiles(user_id);
CREATE INDEX idx_profiles_caregiver_email  ON public.profiles(LOWER(caregiver_email));

-- children ----------------------------------------------------
CREATE TABLE public.children (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       uuid        NOT NULL
                                 REFERENCES public.profiles(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  age              integer,
  diagnosis        text,
  grade_level      text,
  school_name      text,
  height           text,
  weight           text,
  common_triggers  text[]      NOT NULL DEFAULT '{}',
  strengths        text[],
  interests        text[],
  avatar           text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_children_profile_id ON public.children(profile_id);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_active_child_fk
  FOREIGN KEY (active_child_id)
  REFERENCES public.children(id) ON DELETE SET NULL;

-- preferences -------------------------------------------------
CREATE TABLE public.preferences (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL UNIQUE
                                  REFERENCES auth.users(id) ON DELETE CASCADE,
  theme             text        NOT NULL DEFAULT 'light',
  color_theme       text        NOT NULL DEFAULT 'mint',
  font_size         text        NOT NULL DEFAULT 'medium',
  text_to_speech    boolean     NOT NULL DEFAULT false,
  reminders         boolean     NOT NULL DEFAULT false,
  reminder_time     text,
  quick_reminders   jsonb,
  custom_reminders  jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- shared_access ----------------------------------------------
CREATE TABLE public.shared_access (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id            uuid        NOT NULL
                                    REFERENCES public.children(id) ON DELETE CASCADE,
  parent_id           uuid        NOT NULL
                                    REFERENCES public.profiles(id) ON DELETE CASCADE,
  therapist_id        uuid
                                    REFERENCES public.profiles(id) ON DELETE SET NULL,
  therapist_name      text        NOT NULL,
  therapist_email     text        NOT NULL,
  therapist_role      text        NOT NULL,
  status              text        NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending','accepted','declined')),
  invite_token        text,
  can_view_logs       boolean     NOT NULL DEFAULT true,
  can_view_progress   boolean     NOT NULL DEFAULT true,
  can_view_profile    boolean     NOT NULL DEFAULT true,
  can_add_notes       boolean     NOT NULL DEFAULT true,
  can_add_sessions    boolean     NOT NULL DEFAULT true,
  can_comment         boolean     NOT NULL DEFAULT true,
  can_export          boolean     NOT NULL DEFAULT true,
  readonly_mode       boolean     NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  accepted_at         timestamptz
);
CREATE INDEX idx_shared_access_parent_id        ON public.shared_access(parent_id);
CREATE INDEX idx_shared_access_therapist_id     ON public.shared_access(therapist_id);
CREATE INDEX idx_shared_access_therapist_email  ON public.shared_access(LOWER(therapist_email));
CREATE INDEX idx_shared_access_child_id         ON public.shared_access(child_id);

-- log_entries -------------------------------------------------
CREATE TABLE public.log_entries (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id          uuid        NOT NULL
                                  REFERENCES public.children(id) ON DELETE CASCADE,
  date              date        NOT NULL,
  type              text        NOT NULL,
  mood_rating       text,
  positive_notes    text,
  challenge_notes   text,
  mood_tags         text[],
  behaviors         text[],
  sleep_hours       numeric,
  triggers          text[],
  voice_notes       text,
  photos            text[],
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_log_entries_child_id ON public.log_entries(child_id);
CREATE INDEX idx_log_entries_date     ON public.log_entries(date);

-- therapist_notes ---------------------------------------------
CREATE TABLE public.therapist_notes (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id            uuid        NOT NULL
                                    REFERENCES public.children(id) ON DELETE CASCADE,
  therapist_id        uuid        NOT NULL
                                    REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_access_id    uuid        NOT NULL
                                    REFERENCES public.shared_access(id) ON DELETE CASCADE,
  session_date        date        NOT NULL,
  goals_worked_on     text,
  skills_practiced    text,
  behaviors_observed  text,
  strategies_used     text,
  recommendations     text,
  next_session_goals  text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_therapist_notes_child_id     ON public.therapist_notes(child_id);
CREATE INDEX idx_therapist_notes_therapist_id ON public.therapist_notes(therapist_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_set_therapist_notes_updated_at
BEFORE UPDATE ON public.therapist_notes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- note_comments -----------------------------------------------
CREATE TABLE public.note_comments (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id       uuid        NOT NULL
                              REFERENCES public.therapist_notes(id) ON DELETE CASCADE,
  commenter_id  uuid        NOT NULL
                              REFERENCES public.profiles(id) ON DELETE CASCADE,
  comment_text  text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_note_comments_note_id ON public.note_comments(note_id);

-- chat_messages -----------------------------------------------
CREATE TABLE public.chat_messages (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_access_id   uuid        NOT NULL
                                   REFERENCES public.shared_access(id) ON DELETE CASCADE,
  sender_id          uuid        NOT NULL
                                   REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_text       text        NOT NULL,
  is_read            boolean     NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_messages_shared_access_id ON public.chat_messages(shared_access_id);
CREATE INDEX idx_chat_messages_sender_id        ON public.chat_messages(sender_id);


-- ============================================================
-- 2.5 SECURITY DEFINER helpers (bypass RLS to avoid recursion)
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$;

CREATE OR REPLACE FUNCTION public.is_therapist_for_parent(p_parent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $
  SELECT EXISTS (
    SELECT 1 FROM public.shared_access sa
     WHERE sa.parent_id = p_parent_id
       AND sa.status    = 'accepted'
       AND sa.therapist_id = public.current_profile_id()
  );
$;

CREATE OR REPLACE FUNCTION public.is_therapist_for_child(p_child_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $
  SELECT EXISTS (
    SELECT 1 FROM public.shared_access sa
     WHERE sa.child_id    = p_child_id
       AND sa.status      = 'accepted'
       AND sa.therapist_id = public.current_profile_id()
  );
$;

CREATE OR REPLACE FUNCTION public.can_view_child_logs(p_child_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $
  SELECT EXISTS (
    SELECT 1 FROM public.shared_access sa
     WHERE sa.child_id     = p_child_id
       AND sa.status       = 'accepted'
       AND sa.can_view_logs = true
       AND sa.therapist_id = public.current_profile_id()
  );
$;

GRANT EXECUTE ON FUNCTION public.current_profile_id()           TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_therapist_for_parent(uuid)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_therapist_for_child(uuid)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_child_logs(uuid)      TO authenticated;


-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferences     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_access   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapist_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_comments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages   ENABLE ROW LEVEL SECURITY;

-- profiles ----------------------------------------------------
CREATE POLICY "profiles_owner_select" ON public.profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "profiles_owner_insert" ON public.profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_owner_update" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid())
              WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_owner_delete" ON public.profiles
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "profiles_therapist_select" ON public.profiles
  FOR SELECT USING (public.is_therapist_for_parent(profiles.id));

-- children ----------------------------------------------------
CREATE POLICY "children_owner_all" ON public.children
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles p
             WHERE p.id = children.profile_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p
             WHERE p.id = children.profile_id AND p.user_id = auth.uid())
  );

CREATE POLICY "children_therapist_select" ON public.children
  FOR SELECT USING (public.is_therapist_for_child(children.id));

-- preferences -------------------------------------------------
CREATE POLICY "preferences_owner_all" ON public.preferences
  FOR ALL USING (user_id = auth.uid())
          WITH CHECK (user_id = auth.uid());

-- shared_access ----------------------------------------------
CREATE POLICY "shared_access_parent_all" ON public.shared_access
  FOR ALL
  USING (parent_id = public.current_profile_id())
  WITH CHECK (parent_id = public.current_profile_id());

CREATE POLICY "shared_access_therapist_select" ON public.shared_access
  FOR SELECT USING (
    therapist_id = public.current_profile_id()
    OR LOWER(therapist_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
  );

CREATE POLICY "shared_access_therapist_update" ON public.shared_access
  FOR UPDATE USING (
    therapist_id = public.current_profile_id()
    OR LOWER(therapist_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
  );

-- log_entries -------------------------------------------------
CREATE POLICY "log_entries_owner_all" ON public.log_entries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.children c
      JOIN public.profiles p ON p.id = c.profile_id
      WHERE c.id = log_entries.child_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.children c
      JOIN public.profiles p ON p.id = c.profile_id
      WHERE c.id = log_entries.child_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "log_entries_therapist_select" ON public.log_entries
  FOR SELECT USING (public.can_view_child_logs(log_entries.child_id));

-- therapist_notes ---------------------------------------------
CREATE POLICY "therapist_notes_all" ON public.therapist_notes
  FOR ALL
  USING (
    therapist_id = public.current_profile_id()
    OR EXISTS (
      SELECT 1 FROM public.children c
      WHERE c.id = therapist_notes.child_id
        AND c.profile_id = public.current_profile_id()
    )
  )
  WITH CHECK (
    therapist_id = public.current_profile_id()
  );

-- note_comments -----------------------------------------------
CREATE POLICY "note_comments_all" ON public.note_comments
  FOR ALL
  USING (
    commenter_id = public.current_profile_id()
    OR EXISTS (
      SELECT 1 FROM public.therapist_notes tn
      JOIN public.children c ON c.id = tn.child_id
      WHERE tn.id = note_comments.note_id
        AND c.profile_id = public.current_profile_id()
    )
  )
  WITH CHECK (
    commenter_id = public.current_profile_id()
  );

-- chat_messages -----------------------------------------------
CREATE POLICY "chat_messages_select" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shared_access sa
      WHERE sa.id = chat_messages.shared_access_id
        AND (sa.parent_id = public.current_profile_id()
             OR sa.therapist_id = public.current_profile_id())
    )
  );

CREATE POLICY "chat_messages_insert" ON public.chat_messages
  FOR INSERT WITH CHECK (
    sender_id = public.current_profile_id()
  );

CREATE POLICY "chat_messages_update" ON public.chat_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.shared_access sa
      WHERE sa.id = chat_messages.shared_access_id
        AND (sa.parent_id = public.current_profile_id()
             OR sa.therapist_id = public.current_profile_id())
    )
  );


-- ============================================================
-- 4. accept_therapist_invites() RPC
--    Called by the app on every sign-in. Links any invite
--    addressed to the current user's email to their profile,
--    and flips status to 'accepted'.
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_therapist_invites()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_user_id    uuid := auth.uid();
  v_email      text;
  v_profile_id uuid;
  v_count      integer := 0;
BEGIN
  IF v_user_id IS NULL THEN RETURN 0; END IF;

  v_email := NULLIF(TRIM(LOWER(COALESCE(auth.jwt() ->> 'email', ''))), '');
  IF v_email IS NULL THEN RETURN 0; END IF;

  SELECT id INTO v_profile_id
    FROM public.profiles
   WHERE user_id = v_user_id
   LIMIT 1;
  IF v_profile_id IS NULL THEN RETURN 0; END IF;

  WITH updated AS (
    UPDATE public.shared_access
       SET therapist_id = v_profile_id,
           status       = CASE WHEN status = 'pending' THEN 'accepted' ELSE status END,
           accepted_at  = COALESCE(accepted_at, now())
     WHERE LOWER(therapist_email) = v_email
       AND status <> 'declined'
       AND therapist_id IS DISTINCT FROM v_profile_id
     RETURNING 1
  )
  SELECT COUNT(*)::int INTO v_count FROM updated;

  RETURN v_count;
END;
$func$;

REVOKE ALL ON FUNCTION public.accept_therapist_invites() FROM public;
GRANT EXECUTE ON FUNCTION public.accept_therapist_invites() TO authenticated;


-- ============================================================
-- 5. Guard: a therapist's role cannot be silently flipped.
--    Future scripts that try to UPDATE profiles SET role='parent'
--    on a therapist row will error out instead of corrupting data.
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_therapist_role_flip()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.role = 'therapist'
     AND NEW.role IS NOT NULL
     AND NEW.role <> 'therapist' THEN
    RAISE EXCEPTION
      'Refusing to change profile % role from therapist to %.',
      OLD.id, NEW.role;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_therapist_role_flip
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_therapist_role_flip();


-- ============================================================
-- 6. Verification
-- ============================================================
SELECT
  (SELECT COUNT(*) FROM public.profiles)        AS profiles,
  (SELECT COUNT(*) FROM public.children)        AS children,
  (SELECT COUNT(*) FROM public.preferences)     AS preferences,
  (SELECT COUNT(*) FROM public.shared_access)   AS shared_access,
  (SELECT COUNT(*) FROM public.log_entries)     AS log_entries,
  (SELECT COUNT(*) FROM public.therapist_notes) AS therapist_notes,
  (SELECT COUNT(*) FROM public.chat_messages)   AS chat_messages;

SELECT tablename, policyname, cmd
  FROM pg_policies
 WHERE schemaname = 'public'
 ORDER BY tablename, policyname;
