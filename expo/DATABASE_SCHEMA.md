# Supabase Database Schema

## Setup Instructions

1. Go to your Supabase project: https://kedbkwjhwylctwbqdslb.supabase.co
2. Navigate to the SQL Editor
3. Run the SQL commands below to create the necessary tables

## SQL Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,
  caregiver_name TEXT,
  caregiver_email TEXT,
  caregiver_phone TEXT,
  therapist_phone TEXT,
  active_child_id UUID,
  is_explore_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create children table
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  diagnosis TEXT,
  grade_level TEXT,
  school_name TEXT,
  height TEXT,
  weight TEXT,
  common_triggers TEXT[] DEFAULT '{}',
  strengths TEXT[],
  interests TEXT[],
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create log_entries table
CREATE TABLE IF NOT EXISTS log_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  date TEXT NOT NULL,
  mood_rating TEXT NOT NULL,
  positive_notes TEXT,
  challenge_notes TEXT,
  mood_tags TEXT[] DEFAULT '{}',
  type TEXT NOT NULL,
  behaviors TEXT[],
  sleep_hours NUMERIC,
  triggers TEXT[],
  voice_notes TEXT,
  photos TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create preferences table
CREATE TABLE IF NOT EXISTS preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  theme TEXT DEFAULT 'light',
  color_theme TEXT DEFAULT 'mint',
  font_size TEXT DEFAULT 'medium',
  text_to_speech BOOLEAN DEFAULT false,
  reminders BOOLEAN DEFAULT false,
  reminder_time TEXT,
  quick_reminders JSONB,
  custom_reminders JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_children_profile_id ON children(profile_id);
CREATE INDEX IF NOT EXISTS idx_log_entries_child_id ON log_entries(child_id);
CREATE INDEX IF NOT EXISTS idx_preferences_user_id ON preferences(user_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for children
CREATE POLICY "Users can view own children"
  ON children FOR SELECT
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own children"
  ON children FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own children"
  ON children FOR UPDATE
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own children"
  ON children FOR DELETE
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Create policies for log_entries
CREATE POLICY "Users can view own log entries"
  ON log_entries FOR SELECT
  USING (child_id IN (
    SELECT c.id FROM children c
    INNER JOIN profiles p ON c.profile_id = p.id
    WHERE p.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own log entries"
  ON log_entries FOR INSERT
  WITH CHECK (child_id IN (
    SELECT c.id FROM children c
    INNER JOIN profiles p ON c.profile_id = p.id
    WHERE p.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own log entries"
  ON log_entries FOR UPDATE
  USING (child_id IN (
    SELECT c.id FROM children c
    INNER JOIN profiles p ON c.profile_id = p.id
    WHERE p.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own log entries"
  ON log_entries FOR DELETE
  USING (child_id IN (
    SELECT c.id FROM children c
    INNER JOIN profiles p ON c.profile_id = p.id
    WHERE p.user_id = auth.uid()
  ));

-- Create policies for preferences
CREATE POLICY "Users can view own preferences"
  ON preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
  ON preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Create shared_access table (therapist invitations and permissions)
CREATE TABLE IF NOT EXISTS shared_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  therapist_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  therapist_name TEXT NOT NULL,
  therapist_email TEXT NOT NULL,
  therapist_role TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  invite_token TEXT UNIQUE,
  can_view_logs BOOLEAN DEFAULT true,
  can_view_progress BOOLEAN DEFAULT true,
  can_view_profile BOOLEAN DEFAULT true,
  can_add_notes BOOLEAN DEFAULT true,
  can_add_sessions BOOLEAN DEFAULT true,
  can_comment BOOLEAN DEFAULT true,
  can_export BOOLEAN DEFAULT false,
  readonly_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(child_id, therapist_email)
);

-- Create therapist_notes table
CREATE TABLE IF NOT EXISTS therapist_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  therapist_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  shared_access_id UUID REFERENCES shared_access(id) ON DELETE CASCADE NOT NULL,
  session_date TEXT NOT NULL,
  goals_worked_on TEXT,
  skills_practiced TEXT,
  behaviors_observed TEXT,
  strategies_used TEXT,
  recommendations TEXT,
  next_session_goals TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create comments table (for parent comments on therapist notes)
CREATE TABLE IF NOT EXISTS note_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id UUID REFERENCES therapist_notes(id) ON DELETE CASCADE NOT NULL,
  commenter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shared_access_child_id ON shared_access(child_id);
CREATE INDEX IF NOT EXISTS idx_shared_access_therapist_id ON shared_access(therapist_id);
CREATE INDEX IF NOT EXISTS idx_shared_access_parent_id ON shared_access(parent_id);
CREATE INDEX IF NOT EXISTS idx_shared_access_invite_token ON shared_access(invite_token);
CREATE INDEX IF NOT EXISTS idx_therapist_notes_child_id ON therapist_notes(child_id);
CREATE INDEX IF NOT EXISTS idx_therapist_notes_therapist_id ON therapist_notes(therapist_id);
CREATE INDEX IF NOT EXISTS idx_note_comments_note_id ON note_comments(note_id);

-- Enable Row Level Security
ALTER TABLE shared_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_comments ENABLE ROW LEVEL SECURITY;

-- Policies for shared_access
CREATE POLICY "Parents can view their invitations"
  ON shared_access FOR SELECT
  USING (parent_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Parents can create invitations"
  ON shared_access FOR INSERT
  WITH CHECK (parent_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Parents can update their invitations"
  ON shared_access FOR UPDATE
  USING (parent_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Parents can delete their invitations"
  ON shared_access FOR DELETE
  USING (parent_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Therapists can view their invitations"
  ON shared_access FOR SELECT
  USING (therapist_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Therapists can update their invitations"
  ON shared_access FOR UPDATE
  USING (therapist_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR 
         (therapist_email IN (SELECT email FROM auth.users WHERE id = auth.uid()) AND status = 'pending'));

-- Policies for therapist_notes
CREATE POLICY "Therapists can manage their notes"
  ON therapist_notes FOR ALL
  USING (therapist_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Parents can view therapist notes for their children"
  ON therapist_notes FOR SELECT
  USING (child_id IN (
    SELECT c.id FROM children c
    INNER JOIN profiles p ON c.profile_id = p.id
    WHERE p.user_id = auth.uid()
  ));

-- Policies for note_comments
CREATE POLICY "Users can view comments on accessible notes"
  ON note_comments FOR SELECT
  USING (
    note_id IN (
      SELECT tn.id FROM therapist_notes tn
      WHERE tn.child_id IN (
        SELECT c.id FROM children c
        INNER JOIN profiles p ON c.profile_id = p.id
        WHERE p.user_id = auth.uid()
      )
      OR tn.therapist_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create comments"
  ON note_comments FOR INSERT
  WITH CHECK (commenter_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Update log_entries policies to allow therapist access
DROP POLICY IF EXISTS "Users can view own log entries" ON log_entries;
CREATE POLICY "Users can view accessible log entries"
  ON log_entries FOR SELECT
  USING (
    child_id IN (
      SELECT c.id FROM children c
      INNER JOIN profiles p ON c.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
    OR
    child_id IN (
      SELECT sa.child_id FROM shared_access sa
      INNER JOIN profiles p ON sa.therapist_id = p.id
      WHERE p.user_id = auth.uid() 
        AND sa.status = 'accepted'
        AND sa.can_view_logs = true
    )
  );

DROP POLICY IF EXISTS "Users can insert own log entries" ON log_entries;
CREATE POLICY "Users can insert accessible log entries"
  ON log_entries FOR INSERT
  WITH CHECK (
    child_id IN (
      SELECT c.id FROM children c
      INNER JOIN profiles p ON c.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
    OR
    child_id IN (
      SELECT sa.child_id FROM shared_access sa
      INNER JOIN profiles p ON sa.therapist_id = p.id
      WHERE p.user_id = auth.uid() 
        AND sa.status = 'accepted'
        AND sa.can_add_sessions = true
        AND sa.readonly_mode = false
    )
  );

DROP POLICY IF EXISTS "Users can update own log entries" ON log_entries;
CREATE POLICY "Users can update accessible log entries"
  ON log_entries FOR UPDATE
  USING (
    child_id IN (
      SELECT c.id FROM children c
      INNER JOIN profiles p ON c.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own log entries" ON log_entries;
CREATE POLICY "Users can delete accessible log entries"
  ON log_entries FOR DELETE
  USING (
    child_id IN (
      SELECT c.id FROM children c
      INNER JOIN profiles p ON c.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Update children policies to allow therapist read access
DROP POLICY IF EXISTS "Users can view own children" ON children;
CREATE POLICY "Users can view accessible children"
  ON children FOR SELECT
  USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR
    id IN (
      SELECT sa.child_id FROM shared_access sa
      INNER JOIN profiles p ON sa.therapist_id = p.id
      WHERE p.user_id = auth.uid() 
        AND sa.status = 'accepted'
        AND sa.can_view_profile = true
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preferences_updated_at BEFORE UPDATE ON preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_therapist_notes_updated_at BEFORE UPDATE ON therapist_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create chat_messages table for caregiver-therapist communication
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shared_access_id UUID REFERENCES shared_access(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message_text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for chat messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_shared_access_id ON chat_messages(shared_access_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for chat_messages
CREATE POLICY "Users can view messages in their conversations"
  ON chat_messages FOR SELECT
  USING (
    shared_access_id IN (
      SELECT sa.id FROM shared_access sa
      INNER JOIN profiles p ON (sa.parent_id = p.id OR sa.therapist_id = p.id)
      WHERE p.user_id = auth.uid() AND sa.status = 'accepted'
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON chat_messages FOR INSERT
  WITH CHECK (
    sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND
    shared_access_id IN (
      SELECT sa.id FROM shared_access sa
      INNER JOIN profiles p ON (sa.parent_id = p.id OR sa.therapist_id = p.id)
      WHERE p.user_id = auth.uid() AND sa.status = 'accepted'
    )
  );

CREATE POLICY "Users can update their own messages"
  ON chat_messages FOR UPDATE
  USING (sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
```

## Getting Your Anon Key

1. In your Supabase dashboard, go to Settings → API
2. Copy your `anon` public key
3. Update the `supabaseAnonKey` in `lib/supabase.ts` with your actual key

## Next Steps

After running the schema:
1. Get your anon key from Supabase dashboard
2. Update `lib/supabase.ts` with the anon key
3. The app will automatically sync all data to Supabase
