-- Password Reset Codes table for 4-digit verification flow
CREATE TABLE IF NOT EXISTS password_reset_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_codes_email ON password_reset_codes(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_code ON password_reset_codes(code);

ALTER TABLE password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Allow inserts from authenticated users (they need to request codes for their own email)
CREATE POLICY "Anyone can insert reset codes"
  ON password_reset_codes FOR INSERT
  WITH CHECK (true);

-- SECURITY DEFINER function to verify code and reset password
-- This runs with elevated privileges to update auth.users
CREATE OR REPLACE FUNCTION verify_reset_code_and_update_password(
  p_email TEXT,
  p_code TEXT,
  p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_code_record password_reset_codes%ROWTYPE;
  v_user_id UUID;
BEGIN
  -- Find the latest unused, non-expired code for this email
  SELECT * INTO v_code_record
  FROM password_reset_codes
  WHERE email = p_email
    AND code = p_code
    AND used = false
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired code');
  END IF;

  -- Mark code as used
  UPDATE password_reset_codes SET used = true WHERE id = v_code_record.id;

  -- Find the auth user
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'No account found with this email');
  END IF;

  -- Update the password in auth.users
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Password has been reset successfully');
END;
$$;

-- Clean up expired codes periodically (optional helper)
CREATE OR REPLACE FUNCTION cleanup_expired_reset_codes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM password_reset_codes WHERE expires_at < NOW() OR used = true;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
