-- Demo data for Supabase. Paste into a new SQL snippet and click Run.
-- Safe to re-run. Returns a summary of how many rows now exist in each table.

DO $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_profile_id UUID;
  v_child_id UUID;
  v_therapist_profile_id UUID;
  v_shared_access_id UUID;
  v_therapist_note_id UUID;
BEGIN
  ----------------------------------------------------------------------------
  -- 1. Find your real signed-in user
  ----------------------------------------------------------------------------
  SELECT id, email INTO v_user_id, v_user_email
  FROM auth.users
  WHERE email NOT LIKE '%@example.com'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No real user found in auth.users. Sign up in the app first.';
  END IF;

  RAISE NOTICE '>>> Using user: % (%)', v_user_email, v_user_id;

  ----------------------------------------------------------------------------
  -- 2. Parent profile
  ----------------------------------------------------------------------------
  -- IMPORTANT: do NOT overwrite an existing profile's role here.
  -- A therapist signing in must stay a therapist; this script only
  -- seeds demo data on a parent account.
  INSERT INTO profiles (user_id, role, caregiver_name, caregiver_email, caregiver_phone, is_explore_mode)
  VALUES (v_user_id, 'parent', 'Sarah Johnson', v_user_email, '+1 (555) 123-4567', false)
  ON CONFLICT (user_id) DO UPDATE
    SET caregiver_name  = EXCLUDED.caregiver_name,
        caregiver_phone = EXCLUDED.caregiver_phone
  RETURNING id INTO v_profile_id;

  RAISE NOTICE '>>> Parent profile id: %', v_profile_id;

  -- Bail out if the existing profile is not a parent — don't attach
  -- demo children/logs to a therapist account.
  IF EXISTS (
    SELECT 1 FROM profiles
     WHERE id = v_profile_id
       AND role IS DISTINCT FROM 'parent'
  ) THEN
    RAISE NOTICE '>>> Skipping demo seed: profile % is not a parent role', v_profile_id;
    RETURN;
  END IF;

  ----------------------------------------------------------------------------
  -- 3. Child
  ----------------------------------------------------------------------------
  SELECT id INTO v_child_id FROM children WHERE profile_id = v_profile_id LIMIT 1;

  IF v_child_id IS NULL THEN
    INSERT INTO children (
      profile_id, name, age, diagnosis, grade_level, school_name,
      height, weight, common_triggers, strengths, interests
    ) VALUES (
      v_profile_id, 'Alex', 8, 'ASD Level 1, ADHD', '3rd Grade', 'Sunshine Elementary',
      '4''2"', '55 lbs',
      ARRAY['loud noises','unexpected changes','crowded spaces'],
      ARRAY['math','drawing','memory games','pattern recognition'],
      ARRAY['dinosaurs','trains','building blocks','science']
    )
    RETURNING id INTO v_child_id;
  END IF;

  UPDATE profiles SET active_child_id = v_child_id WHERE id = v_profile_id;
  RAISE NOTICE '>>> Child id: %', v_child_id;

  ----------------------------------------------------------------------------
  -- 4. Daily log entries
  ----------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM log_entries WHERE child_id = v_child_id) THEN
    INSERT INTO log_entries (child_id, date, mood_rating, positive_notes, challenge_notes, mood_tags, type, behaviors, sleep_hours, triggers)
    VALUES
      (v_child_id, (CURRENT_DATE - 5)::TEXT, 'great',
        'Amazing day at school! Shared toys and finished homework on his own.',
        'Got overwhelmed when the cafeteria was extra loud.',
        ARRAY['happy','focused','social'], 'daily',
        ARRAY['sharing','completing tasks'], 9.5, ARRAY['loud noises']),
      (v_child_id, (CURRENT_DATE - 4)::TEXT, 'good',
        'Great progress with fine motor skills in OT.',
        'Meltdown after an evening schedule change.',
        ARRAY['calm','learning'], 'daily', ARRAY['following instructions'],
        8.0, ARRAY['unexpected changes']),
      (v_child_id, (CURRENT_DATE - 3)::TEXT, 'okay',
        'Used the visual schedule independently this morning.',
        'Hard transitions between activities.',
        ARRAY['neutral','cooperative'], 'daily',
        ARRAY['using visual aids'], 7.5, NULL),
      (v_child_id, (CURRENT_DATE - 2)::TEXT, 'great',
        'Made a new friend at recess and played for 45 minutes!',
        NULL, ARRAY['happy','social','confident'], 'daily',
        ARRAY['making friends','playing cooperatively'], 10.0, NULL),
      (v_child_id, (CURRENT_DATE - 1)::TEXT, 'challenging',
        'Some good moments during art class.',
        'Multiple meltdowns from sensory overload at the mall.',
        ARRAY['frustrated','overwhelmed'], 'daily',
        ARRAY['expressing emotions'], 6.5, ARRAY['crowded spaces','loud noises']),
      (v_child_id, CURRENT_DATE::TEXT, 'good',
        'Used coping strategies — deep breathing helped a lot.',
        'Tired from yesterday, needed extra downtime.',
        ARRAY['calm','learning','recovering'], 'daily',
        ARRAY['using coping strategies','self-regulation'], 9.0, NULL);
    RAISE NOTICE '>>> Inserted 6 log entries';
  END IF;

  ----------------------------------------------------------------------------
  -- 5. Preferences
  ----------------------------------------------------------------------------
  INSERT INTO preferences (user_id, theme, color_theme, font_size, text_to_speech, reminders, reminder_time)
  VALUES (v_user_id, 'light', 'mint', 'medium', false, true, '20:00')
  ON CONFLICT (user_id) DO NOTHING;

  ----------------------------------------------------------------------------
  -- 6. Demo therapist profile (NO auth user — just a profile row)
  --    user_id is set to a deterministic random UUID so it's stable on re-run.
  ----------------------------------------------------------------------------
  SELECT id INTO v_therapist_profile_id
  FROM profiles
  WHERE LOWER(caregiver_email) = 'therapist.demo@example.com'
  LIMIT 1;

  IF v_therapist_profile_id IS NULL THEN
    INSERT INTO profiles (user_id, role, caregiver_name, caregiver_email)
    VALUES (gen_random_uuid(), 'therapist', 'Dr. Emily Chen', 'therapist.demo@example.com')
    RETURNING id INTO v_therapist_profile_id;
  END IF;

  RAISE NOTICE '>>> Demo therapist profile id: %', v_therapist_profile_id;

  ----------------------------------------------------------------------------
  -- 7. Accepted shared_access between parent and demo therapist
  ----------------------------------------------------------------------------
  SELECT id INTO v_shared_access_id
  FROM shared_access
  WHERE child_id = v_child_id
    AND LOWER(therapist_email) = 'therapist.demo@example.com'
  LIMIT 1;

  IF v_shared_access_id IS NULL THEN
    INSERT INTO shared_access (
      child_id, parent_id, therapist_id,
      therapist_name, therapist_email, therapist_role, status,
      can_view_logs, can_view_progress, can_view_profile,
      can_add_notes, can_add_sessions, can_comment, can_export,
      readonly_mode, accepted_at
    ) VALUES (
      v_child_id, v_profile_id, v_therapist_profile_id,
      'Dr. Emily Chen', 'therapist.demo@example.com', 'OT', 'accepted',
      true, true, true, true, true, true, true, false,
      NOW() - INTERVAL '7 days'
    )
    RETURNING id INTO v_shared_access_id;
  ELSE
    UPDATE shared_access
       SET therapist_id = v_therapist_profile_id,
           status = 'accepted',
           accepted_at = COALESCE(accepted_at, NOW() - INTERVAL '7 days')
     WHERE id = v_shared_access_id;
  END IF;

  ----------------------------------------------------------------------------
  -- 8. Therapist note + parent reply
  ----------------------------------------------------------------------------
  SELECT id INTO v_therapist_note_id
  FROM therapist_notes
  WHERE shared_access_id = v_shared_access_id
  LIMIT 1;

  IF v_therapist_note_id IS NULL THEN
    INSERT INTO therapist_notes (
      child_id, therapist_id, shared_access_id, session_date,
      goals_worked_on, skills_practiced, behaviors_observed,
      strategies_used, recommendations, next_session_goals
    ) VALUES (
      v_child_id, v_therapist_profile_id, v_shared_access_id,
      (CURRENT_DATE - 3)::TEXT,
      'Fine motor skill development, sensory processing',
      'Cutting with scissors, playdough manipulation, handwriting practice',
      'Great focus during structured activities. Visual timer worked well.',
      'Visual timers, sensory breaks every 15 minutes, positive reinforcement',
      'Continue daily handwriting practice. Try a weighted blanket during homework.',
      'Bilateral coordination activities, introduce new sensory textures'
    )
    RETURNING id INTO v_therapist_note_id;

    INSERT INTO note_comments (note_id, commenter_id, comment_text)
    VALUES (
      v_therapist_note_id, v_profile_id,
      'Thank you Dr. Chen! The weighted blanket helped a lot during homework time.'
    );
  END IF;

  ----------------------------------------------------------------------------
  -- 9. A pending invite for a different therapist
  ----------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM shared_access
    WHERE child_id = v_child_id
      AND LOWER(therapist_email) = 'michael.rodriguez@example.com'
  ) THEN
    INSERT INTO shared_access (
      child_id, parent_id, therapist_name, therapist_email, therapist_role,
      status, invite_token,
      can_view_logs, can_view_progress, can_view_profile,
      can_add_notes, can_add_sessions, can_comment, can_export, readonly_mode
    ) VALUES (
      v_child_id, v_profile_id,
      'Dr. Michael Rodriguez', 'michael.rodriguez@example.com', 'ABA',
      'pending', 'invite_' || gen_random_uuid()::text,
      true, true, true, true, true, false, false, false
    );
  END IF;

  RAISE NOTICE '>>> Done.';
END $$;

-- Verification — these rows MUST be > 0 after the script runs.
SELECT 'profiles'         AS table_name, COUNT(*) AS rows FROM profiles
UNION ALL SELECT 'children',        COUNT(*) FROM children
UNION ALL SELECT 'log_entries',     COUNT(*) FROM log_entries
UNION ALL SELECT 'preferences',     COUNT(*) FROM preferences
UNION ALL SELECT 'shared_access',   COUNT(*) FROM shared_access
UNION ALL SELECT 'therapist_notes', COUNT(*) FROM therapist_notes
UNION ALL SELECT 'note_comments',   COUNT(*) FROM note_comments;
