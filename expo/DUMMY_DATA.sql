-- Dummy Data for Supabase Tables
-- Run this in your Supabase SQL Editor to test the setup

-- IMPORTANT: First, get your actual user ID by running this query:
-- SELECT id, email FROM auth.users LIMIT 1;
-- Then replace 'YOUR_USER_ID_HERE' below with your actual user ID

-- Or use this dynamic approach (recommended):
DO $$
DECLARE
  v_user_id UUID;
  v_profile_id UUID;
  v_child_id UUID;
  v_therapist_profile_id UUID;
  v_therapist_user_id UUID;
  v_shared_access_id UUID;
  v_therapist_note_id UUID;
BEGIN
  -- Get the first user ID from auth (your test account)
  SELECT id INTO v_user_id FROM auth.users ORDER BY created_at DESC LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found in auth.users. Please sign up first.';
  END IF;

  RAISE NOTICE 'Using user ID: %', v_user_id;

  -- Insert parent profile
  INSERT INTO profiles (user_id, role, caregiver_name, caregiver_email, caregiver_phone, is_explore_mode)
  VALUES (
    v_user_id,
    'parent',
    'Sarah Johnson',
    'sarah.johnson@example.com',
    '+1 (555) 123-4567',
    false
  )
  ON CONFLICT (user_id) DO UPDATE 
    SET caregiver_name = EXCLUDED.caregiver_name,
        caregiver_email = EXCLUDED.caregiver_email,
        caregiver_phone = EXCLUDED.caregiver_phone
  RETURNING id INTO v_profile_id;

  RAISE NOTICE 'Created profile ID: %', v_profile_id;

  -- Insert child
  INSERT INTO children (
    profile_id,
    name,
    age,
    diagnosis,
    grade_level,
    school_name,
    height,
    weight,
    common_triggers,
    strengths,
    interests
  )
  VALUES (
    v_profile_id,
    'Alex',
    8,
    'ASD Level 1, ADHD',
    '3rd Grade',
    'Sunshine Elementary',
    '4''2"',
    '55 lbs',
    ARRAY['loud noises', 'unexpected changes', 'crowded spaces'],
    ARRAY['math', 'drawing', 'memory games', 'pattern recognition'],
    ARRAY['dinosaurs', 'trains', 'building blocks', 'science']
  )
  RETURNING id INTO v_child_id;

  -- Update profile with active child
  UPDATE profiles SET active_child_id = v_child_id WHERE id = v_profile_id;

  RAISE NOTICE 'Created child ID: %', v_child_id;

  -- Insert log entries
  INSERT INTO log_entries (child_id, date, mood_rating, positive_notes, challenge_notes, mood_tags, type, behaviors, sleep_hours, triggers)
  VALUES
    (
      v_child_id,
      (CURRENT_DATE - INTERVAL '5 days')::TEXT,
      'great',
      'Had an amazing day at school! Alex shared toys with classmates during free play and completed all homework without reminders.',
      'Got a bit overwhelmed during lunch when the cafeteria was extra loud.',
      ARRAY['happy', 'focused', 'social'],
      'daily',
      ARRAY['sharing', 'completing tasks'],
      9.5,
      ARRAY['loud noises']
    ),
    (
      v_child_id,
      (CURRENT_DATE - INTERVAL '4 days')::TEXT,
      'good',
      'Great progress in occupational therapy session. Practiced fine motor skills with playdough.',
      'Had a meltdown in the evening after a schedule change. Took 20 minutes to calm down.',
      ARRAY['calm', 'learning'],
      'daily',
      ARRAY['following instructions'],
      8.0,
      ARRAY['unexpected changes']
    ),
    (
      v_child_id,
      (CURRENT_DATE - INTERVAL '3 days')::TEXT,
      'okay',
      'Did well with morning routine. Used visual schedule independently.',
      'Struggled with transitions between activities. Needed extra time and verbal warnings.',
      ARRAY['neutral', 'cooperative'],
      'daily',
      ARRAY['using visual aids'],
      7.5,
      NULL
    ),
    (
      v_child_id,
      (CURRENT_DATE - INTERVAL '2 days')::TEXT,
      'great',
      'Wonderful day! Alex made a new friend and they played together for 45 minutes. Very proud moment.',
      NULL,
      ARRAY['happy', 'social', 'confident'],
      'daily',
      ARRAY['making friends', 'playing cooperatively'],
      10.0,
      NULL
    ),
    (
      v_child_id,
      (CURRENT_DATE - INTERVAL '1 day')::TEXT,
      'challenging',
      'Had some good moments during art class.',
      'Very difficult day overall. Multiple meltdowns triggered by sensory overload at the mall.',
      ARRAY['frustrated', 'overwhelmed'],
      'daily',
      ARRAY['expressing emotions'],
      6.5,
      ARRAY['crowded spaces', 'loud noises']
    ),
    (
      v_child_id,
      CURRENT_DATE::TEXT,
      'good',
      'Better day today. Alex used coping strategies we practiced. Deep breathing helped a lot.',
      'Still tired from yesterday. Needed more downtime than usual.',
      ARRAY['calm', 'learning', 'recovering'],
      'daily',
      ARRAY['using coping strategies', 'self-regulation'],
      9.0,
      NULL
    );

  RAISE NOTICE 'Created 6 log entries';

  -- Insert preferences
  INSERT INTO preferences (
    user_id,
    theme,
    color_theme,
    font_size,
    text_to_speech,
    reminders,
    reminder_time
  )
  VALUES (
    v_user_id,
    'light',
    'mint',
    'medium',
    false,
    true,
    '20:00'
  )
  ON CONFLICT (user_id) DO UPDATE
    SET theme = EXCLUDED.theme,
        color_theme = EXCLUDED.color_theme;

  RAISE NOTICE 'Created preferences';

  -- Create a dummy therapist user and profile
  -- Note: This creates an auth user without a password (for demo purposes only)
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
  )
  VALUES (
    gen_random_uuid(),
    'therapist.demo@example.com',
    crypt('demo-password-123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    'authenticated'
  )
  ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
  RETURNING id INTO v_therapist_user_id;

  -- Insert therapist profile
  INSERT INTO profiles (user_id, role, caregiver_name, caregiver_email)
  VALUES (
    v_therapist_user_id,
    'therapist',
    'Dr. Emily Chen',
    'therapist.demo@example.com'
  )
  ON CONFLICT (user_id) DO UPDATE SET role = 'therapist'
  RETURNING id INTO v_therapist_profile_id;

  RAISE NOTICE 'Created therapist profile ID: %', v_therapist_profile_id;

  -- Insert shared access (accepted therapist invitation)
  INSERT INTO shared_access (
    child_id,
    parent_id,
    therapist_id,
    therapist_name,
    therapist_email,
    therapist_role,
    status,
    can_view_logs,
    can_view_progress,
    can_view_profile,
    can_add_notes,
    can_add_sessions,
    can_comment,
    can_export,
    readonly_mode,
    accepted_at
  )
  VALUES (
    v_child_id,
    v_profile_id,
    v_therapist_profile_id,
    'Dr. Emily Chen',
    'therapist.demo@example.com',
    'OT',
    'accepted',
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    false,
    NOW() - INTERVAL '7 days'
  )
  RETURNING id INTO v_shared_access_id;

  RAISE NOTICE 'Created shared access ID: %', v_shared_access_id;

  -- Insert therapist notes
  INSERT INTO therapist_notes (
    child_id,
    therapist_id,
    shared_access_id,
    session_date,
    goals_worked_on,
    skills_practiced,
    behaviors_observed,
    strategies_used,
    recommendations,
    next_session_goals
  )
  VALUES (
    v_child_id,
    v_therapist_profile_id,
    v_shared_access_id,
    (CURRENT_DATE - INTERVAL '3 days')::TEXT,
    'Fine motor skill development, sensory processing',
    'Cutting with scissors, playdough manipulation, handwriting practice',
    'Alex showed great focus during structured activities. Some difficulty with transitions. Used visual timer effectively.',
    'Visual timers, sensory breaks every 15 minutes, positive reinforcement',
    'Continue daily handwriting practice at home (5-10 minutes). Consider weighted blanket for homework time.',
    'Work on bilateral coordination activities, introduce new sensory textures'
  )
  RETURNING id INTO v_therapist_note_id;

  RAISE NOTICE 'Created therapist note ID: %', v_therapist_note_id;

  -- Insert parent comment on therapist note
  INSERT INTO note_comments (
    note_id,
    commenter_id,
    comment_text
  )
  VALUES (
    v_therapist_note_id,
    v_profile_id,
    'Thank you Dr. Chen! We tried the weighted blanket suggestion and it really helped with homework time. Alex seems much calmer.'
  );

  RAISE NOTICE 'Created comment on therapist note';

  -- Insert a pending invitation (not yet accepted)
  INSERT INTO shared_access (
    child_id,
    parent_id,
    therapist_name,
    therapist_email,
    therapist_role,
    status,
    invite_token,
    can_view_logs,
    can_view_progress,
    can_view_profile,
    can_add_notes,
    can_add_sessions,
    can_comment,
    can_export,
    readonly_mode
  )
  VALUES (
    v_child_id,
    v_profile_id,
    'Dr. Michael Rodriguez',
    'michael.rodriguez@example.com',
    'ABA',
    'pending',
    'invite_' || gen_random_uuid()::text,
    true,
    true,
    true,
    true,
    true,
    false,
    false,
    false
  );

  RAISE NOTICE 'Created pending invitation';

  RAISE NOTICE '✅ Dummy data inserted successfully!';
  RAISE NOTICE 'Parent Profile: Sarah Johnson (%)' , v_profile_id;
  RAISE NOTICE 'Child: Alex (%)' , v_child_id;
  RAISE NOTICE 'Log Entries: 6 entries created';
  RAISE NOTICE 'Therapist: Dr. Emily Chen (accepted)';
  RAISE NOTICE 'Pending Invite: Dr. Michael Rodriguez';
  
END $$;
