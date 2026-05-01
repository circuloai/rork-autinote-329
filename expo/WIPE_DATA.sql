-- ============================================================
-- Clean wipe of app data (KEEPS auth.users so you can sign back in)
--
-- Paste into Supabase SQL editor and Run. Safe to re-run.
-- ============================================================

DO $$
DECLARE
  v_chat_messages   INT := 0;
  v_therapist_notes INT := 0;
  v_log_entries     INT := 0;
  v_shared_access   INT := 0;
  v_children        INT := 0;
  v_preferences     INT := 0;
  v_profiles        INT := 0;
BEGIN
  -- delete leaf tables first to avoid FK violations
  IF to_regclass('public.chat_messages') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.chat_messages';
    GET DIAGNOSTICS v_chat_messages = ROW_COUNT;
  END IF;

  IF to_regclass('public.therapist_notes') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.therapist_notes';
    GET DIAGNOSTICS v_therapist_notes = ROW_COUNT;
  END IF;

  IF to_regclass('public.log_entries') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.log_entries';
    GET DIAGNOSTICS v_log_entries = ROW_COUNT;
  END IF;

  IF to_regclass('public.shared_access') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.shared_access';
    GET DIAGNOSTICS v_shared_access = ROW_COUNT;
  END IF;

  -- profiles.active_child_id references children, so null it before deleting children
  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'UPDATE public.profiles SET active_child_id = NULL';
  END IF;

  IF to_regclass('public.children') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.children';
    GET DIAGNOSTICS v_children = ROW_COUNT;
  END IF;

  IF to_regclass('public.preferences') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.preferences';
    GET DIAGNOSTICS v_preferences = ROW_COUNT;
  END IF;

  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.profiles';
    GET DIAGNOSTICS v_profiles = ROW_COUNT;
  END IF;

  RAISE NOTICE '--- WIPE SUMMARY ---';
  RAISE NOTICE 'chat_messages   deleted: %', v_chat_messages;
  RAISE NOTICE 'therapist_notes deleted: %', v_therapist_notes;
  RAISE NOTICE 'log_entries     deleted: %', v_log_entries;
  RAISE NOTICE 'shared_access   deleted: %', v_shared_access;
  RAISE NOTICE 'children        deleted: %', v_children;
  RAISE NOTICE 'preferences     deleted: %', v_preferences;
  RAISE NOTICE 'profiles        deleted: %', v_profiles;
END $$;

-- ============================================================
-- Guard: prevent any future script from silently flipping a
-- profile's role away from 'therapist' back to 'parent'.
-- A therapist row can only be demoted by explicitly setting
-- role to NULL first (i.e. you have to mean it).
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_therapist_role_flip()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role = 'therapist'
     AND NEW.role IS NOT NULL
     AND NEW.role <> 'therapist' THEN
    RAISE EXCEPTION
      'Refusing to change profile % role from therapist to %. '
      'If this is intentional, set role = NULL first, then update.',
      OLD.id, NEW.role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_therapist_role_flip ON public.profiles;
CREATE TRIGGER trg_prevent_therapist_role_flip
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_therapist_role_flip();

-- Verify counts are all zero
SELECT
  (SELECT COUNT(*) FROM public.profiles)        AS profiles,
  (SELECT COUNT(*) FROM public.children)        AS children,
  (SELECT COUNT(*) FROM public.shared_access)   AS shared_access,
  (SELECT COUNT(*) FROM public.log_entries)     AS log_entries;
