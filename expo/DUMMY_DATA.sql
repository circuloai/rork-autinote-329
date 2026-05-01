-- Idempotent demo data for Supabase.
-- Paste this whole file into a new SQL snippet in Supabase and click Run.
-- Safe to re-run: it upserts and skips rows that already exist.

DO $$
DECLARE
  v_user_id UUID;
  v_profile_id UUID;
  v_child_id UUID;
  v_therapist_user_id UUID;
  v_therapist_profile_id UUID;
  v_shared_access_id UUID;
  v_therapist_note_id UUID;
BEGIN
  -- Pick the most recent real signup, ignoring the demo therapist account.
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email <> 'therapist.demo@example.com'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found in auth.users. Please sign up in the app first.';
  END IF;

  RAISE NOTICE 'Using user_id: %', v_user_id;

  ----------------------------------------------------------------------------
  -- Parent profile
  ----------------------------------------------------------------------------
  INSERT INTO profiles (user_id, role, caregiver_name, caregiver_email, caregiver_phone, is_explore_mode)
  VALUES (v_user_id, 'parent', 'Sarah Johnson', 'sarah.johnson@example.com', '+1 (555) 123-4567', false)
  ON CONFLICT (user_id) DO UPDATE
    SET role = 'parent',
        caregiver_name = EXCLUDED.caregiver_name,
        caregiver_email = EXCLUDED.caregiver_email,
        caregiver_phone = EXCLUDED.caregiver_phone
  RETURNING id INTO v_profile_id;

  ----------------------------------------------------------------------------
  -- Child (only insert if this profile has no child yet)
  ----------------------------------------------------------------------------
  SELECT id INTO v_child_id FROM children WHERE profile_id = v_profile_id LIMIT 1;

  IF v_child_id IS NULL THEN
    INSERT INTO children (
      profile_id, name, age, diagnosis, grade_level, school_name,
      height, weight, common_triggers, strengths, interests
    ) VALUES (
      v_profile_id, 'Alex', 8, 'ASD Level 1, ADHD', '3rd Grade', 'Sunshine Elementary',
      '4''2"', '55 lbs',
      ARRAY['loud noises', 'unexpected changes', 'crowded spaces'],
      ARRAY['math', 'drawing', 'memory games', 'pattern recognition'],
      ARRAY['dinosaurs', 'trains', 'building blocks', 'science']
    )
    RETURNING id INTO v_child_id;
  END IF;

  UPDATE profiles SET active_child_id = v_child_id WHERE id = v_profile_id;

  RAISE NOTICE 'Profile %, Child %', v_profile_id, v_child_id;

  ----------------------------------------------------------------------------
  -- Daily log entries (skip if any exist for this child already)
  ----------------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM log_entries WHERE child_id = v_child_id) THEN
    INSERT INTO log_entries (child_id, date, mood_rating, positive_notes, challenge_notes, mood_tags, type, behaviors, sleep_hours, triggers)
    VALUES
      (v_child_id, (CURRENT_DATE - INTERVAL '5 days')::TEXT, 'great',
        'Amazing day at school! Shared toys and finished homework on his own.',
        'Got overwhelmed when the cafeteria was extra loud.',
        ARRAY['happy','focused','social'], 'daily',
        ARRAY['sharing','completing tasks'], 9.5, ARRAY['loud noises']),
      (v_child_id, (CURRENT_DATE - INTERVAL '4 days')::TEXT, 'good',
        'Great progress with fine motor skills in OT.',
        'Meltdown after an evening schedule change. ~20 min to recover.',
        ARRAY['calm','learning'], 'daily', ARRAY['following instructions'],
        8.0, ARRAY['unexpected changes']),
      (v_child_id, (CURRENT_DATE - INTERVAL '3 days')::TEXT, 'okay',
        'Used the visual schedule independently this morning.',
        'Hard transitions between activities, needed warnings.',
        ARRAY['neutral','cooperative'], 'daily',
        ARRAY['using visual aids'], 7.5, NULL),
      (v_child_id, (CURRENT_DATE - INTERVAL '2 days')::TEXT, 'great',
        'Made a new friend at recess and played for 45 minutes!',
        NULL, ARRAY['happy','social','confident'], 'daily',
        ARRAY['making friends','playing cooperatively'], 10.0, NULL),
      (v_child_id, (CURRENT_DATE - INTERVAL '1 day')::TEXT, 'challenging',
        'Some good moments during art class.',
        'Multiple meltdowns from sensory overload at the mall.',
        ARRAY['frustrated','overwhelmed'], 'daily',
        ARRAY['expressing emotions'], 6.5, ARRAY['crowded spaces','loud noises']),
      (v_child_id, CURRENT_DATE::TEXT, 'good',
        'Used coping strategies — deep breathing helped a lot.',
        'Tired from yesterday, needed extra downtime.',
        ARRAY['calm','learning','recovering'], 'daily',
        ARRAY['using coping strategies','self-regulation'], 9.0, NULL);

    RAISE NOTICE 'Inserted 6 log entries';
  END IF;

  ----------------------------------------------------------------------------
  -- Preferences
  ----------------------------------------------------------------------------
  INSERT INTO preferences (user_id, theme, color_theme, font_size, text_to_speech, reminders, reminder_time)
  VALUES (v_user_id, 'light', 'mint', 'medium', false, true, '20:00')
  ON CONFLICT (user_id) DO UPDATE
    SET theme = EXCLUDED.theme, color_theme = EXCLUDED.color_theme;

  ----------------------------------------------------------------------------
  -- Demo therapist auth user + profile
  ----------------------------------------------------------------------------
  SELECT id INTO v_therapist_user_id
  FROM auth.users WHERE email = 'therapist.demo@example.com' LIMIT 1;

  IF v_therapist_user_id IS NULL THEN
    INSERT INTO auth.users (
      id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, instance_id, aud
    ) VALUES (
      gen_random_uuid(), 'therapist.demo@example.com',
      crypt('demo-password-123', gen_salt('bf')), NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      false, 'authenticated',
      '00000000-0000-0000-0000-000000000000', 'authenticated'
    )
    RETURNING id INTO v_therapist_user_id;
  END IF;

  INSERT INTO profiles (user_id, role, caregiver_name, caregiver_email)
  VALUES (v_therapist_user_id, 'therapist', 'Dr. Emily Chen', 'therapist.demo@example.com')
  ON CONFLICT (user_id) DO UPDATE
    SET role = 'therapist', caregiver_name = EXCLUDED.caregiver_name
  RETURNING id INTO v_therapist_profile_id;

  RAISE NOTICE 'Therapist profile: %', v_therapist_profile_id;

  ----------------------------------------------------------------------------
  -- Accepted shared_access between parent and demo therapist
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
  -- Therapist note + parent reply
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
      (CURRENT_DATE - INTERVAL '3 days')::TEXT,
      'Fine motor skill development, sensory processing',
      'Cutting with scissors, playdough manipulation, handwriting practice',
      'Great focus during structured activities. Visual timer worked well.',
      'Visual timers, sensory breaks every 15 minutes, positive reinforcement',
      'Continue daily handwriting practice (5-10 min). Try a weighted blanket during homework.',
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
  -- A pending invite (only if no pending one exists for this child)
  ----------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM shared_access
    WHERE child_id = v_child_id
      AND status = 'pending'
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

  RAISE NOTICE 'Demo data ready. Reload the app.';
END $$;
