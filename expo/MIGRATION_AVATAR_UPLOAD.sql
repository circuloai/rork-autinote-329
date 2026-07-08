-- ============================================================
-- Feature: Custom avatar upload from camera roll
-- (caregiver, therapist, and child profile pictures)
--
-- This migration:
--   1. Adds an `avatar` column to `profiles` (caregivers/therapists
--      already had nowhere to persist a chosen/uploaded avatar).
--      `children.avatar` already exists and needs no change.
--   2. Creates a PRIVATE Supabase Storage bucket `avatars` to hold
--      uploaded profile photos.
--   3. Adds Storage RLS policies so:
--        - a user can only upload/replace/delete files inside their
--          own folder (`{auth.uid()}/...`)
--        - a user can always read (SELECT) their own avatar files
--        - a therapist can read a caregiver's or a caregiver's
--          child's avatar file ONLY if they have an ACCEPTED
--          shared_access row linking them to that caregiver (mirrors
--          the existing `children_therapist_select` /
--          `profiles_therapist_select` policies)
--        - nobody else (including anonymous/public) can read anything
--
-- Path convention (set by the app, not by SQL):
--   Caregiver/therapist own avatar : {userId}/profile.jpg
--   Child avatar                   : {userId}/children/{childId}/avatar.jpg
--   (userId = the OWNING caregiver's auth.uid(), i.e. children always
--   live under their caregiver's folder, never the therapist's)
--
-- NOTE on retrieval: because the bucket is PRIVATE, the app cannot use
-- `getPublicUrl` (without a Supabase auth header — which <Image>/<img>
-- never sends — requests to a private bucket's "public" URL are
-- rejected). Instead `expo/lib/avatarUpload.ts` mints a signed URL
-- right after upload. Minting a signed URL still goes through the
-- SELECT RLS check below, so only an authorized viewer (the owner, at
-- upload time) can create it. The resulting capability URL is then
-- stored on the profile/child row exactly like any other avatar
-- value, so it stays visible only to whoever can already read that
-- row (owner + accepted therapists) — consistent with the rest of the
-- app's sharing model.
--
-- Safe to re-run any number of times.
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "avatars_therapist_select" ON storage.objects;
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
-- Owner can always read their own files (needed to mint a signed
-- URL for their own profile / their children's avatars).
-- ------------------------------------------------------------
CREATE POLICY "avatars_owner_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------
-- A therapist can read files under a caregiver's folder (their own
-- profile.jpg, or any of their children's avatar.jpg) only if they
-- have an ACCEPTED shared_access row linking them to that caregiver.
-- Mirrors `profiles_therapist_select` / `children_therapist_select`
-- from MIGRATION_THERAPIST_READ_ACCESS.sql.
-- ------------------------------------------------------------
CREATE POLICY "avatars_therapist_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars'
    AND EXISTS (
      SELECT 1
        FROM shared_access sa
        JOIN profiles owner_profile ON owner_profile.user_id = ((storage.foldername(name))[1])::uuid
        JOIN profiles me_profile    ON me_profile.user_id = auth.uid()
       WHERE sa.parent_id    = owner_profile.id
         AND sa.therapist_id = me_profile.id
         AND sa.status       = 'accepted'
    )
  );
