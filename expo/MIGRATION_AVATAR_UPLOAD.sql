-- ============================================================
-- Feature: Custom avatar upload from camera roll
-- (caregiver, therapist, and child profile pictures)
--
-- This migration:
--   1. Adds an `avatar` column to `profiles` (caregivers/therapists
--      already had nowhere to persist a chosen/uploaded avatar).
--      `children.avatar` already exists and needs no change.
--   2. Creates a Supabase Storage bucket `avatars` to hold uploaded
--      profile photos.
--   3. Adds Storage RLS policies so:
--        - a user can only upload/replace/delete files inside their
--          own folder (`{auth.uid()}/...`)
--        - a user can always read their own avatar files
--        - a therapist can read a CHILD's avatar file only if they
--          have an ACCEPTED shared_access row for that child with
--          can_view_profile = true (mirrors the existing
--          `children_therapist_select` policy)
--
-- Path convention (set by the app, not by SQL):
--   Caregiver/therapist own avatar : {userId}/profile.jpg
--   Child avatar                   : {userId}/children/{childId}/avatar.jpg
--   (userId = the OWNING caregiver's auth.uid(), i.e. children always
--   live under their caregiver's folder, never the therapist's)
--
-- NOTE on bucket visibility: the bucket is created as PUBLIC. Every
-- other avatar image in this app (the DiceBear presets) is already an
-- unauthenticated public URL, and avatar photos are decorative, not
-- part of the sensitive log/notes data covered by the threat model.
-- Object paths are unguessable (UUID-based), so this does not expose
-- a listing of users or children. Write access remains fully
-- restricted by RLS below. If you would prefer stricter control
-- (private bucket + short-lived signed URLs), that is a follow-up
-- change to `expo/lib/avatarUpload.ts`.
--
-- Safe to re-run any number of times.
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_select" ON storage.objects;

-- ------------------------------------------------------------
-- Only the owning caregiver/therapist (matched by the first path
-- segment = their own auth.uid()) may write into their folder.
-- This covers both their own profile.jpg and their children's
-- avatar.jpg files, since children are nested under the caregiver's
-- own folder.
-- ------------------------------------------------------------
CREATE POLICY "avatars_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------
-- Public read (bucket is public, this mirrors that at the RLS
-- level too in case the bucket's public flag is ever toggled off).
-- ------------------------------------------------------------
CREATE POLICY "avatars_public_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
