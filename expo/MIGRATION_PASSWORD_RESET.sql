-- Password Reset Codes table for 4-digit verification flow
CREATE TABLE IF NOT EXISTS public.password_reset_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_codes_email ON public.password_reset_codes(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_code ON public.password_reset_codes(code);

ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- Remove any previously created permissive INSERT policy.
-- The old migration defined "WITH CHECK (true)" which allowed anonymous inserts
-- directly via the public Supabase REST API, bypassing all server-side controls.
DROP POLICY IF EXISTS "Anyone can insert reset codes" ON public.password_reset_codes;

-- No INSERT/SELECT/UPDATE/DELETE policies are defined for anon or authenticated roles.
-- All access to this table is exclusively through SECURITY DEFINER functions below,
-- which run as the table owner and enforce invariants server-side.

-- ---------------------------------------------------------------------------
-- create_password_reset_code(p_email)
--
-- Generates a random 4-digit code and 10-minute expiry server-side — callers
-- cannot supply their own code or expiry value. Returns the generated code so
-- the backend can dispatch it (email/SMS). Restricted to service_role only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_password_reset_code(
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_code TEXT;
BEGIN
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Email is required');
  END IF;

  -- Generate a random 4-digit numeric code entirely server-side.
  v_code := lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');

  INSERT INTO public.password_reset_codes (email, code, expires_at)
  VALUES (lower(trim(p_email)), v_code, NOW() + INTERVAL '10 minutes');

  RETURN jsonb_build_object('success', true, 'code', v_code);
END;
$$;

-- Revoke from everyone, then grant only to service_role.
-- anon and authenticated roles (i.e. the public Supabase key) cannot execute this.
REVOKE EXECUTE ON FUNCTION public.create_password_reset_code(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_password_reset_code(TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- check_reset_code(p_email, p_code)
--
-- Non-destructive check: returns {success,message} without marking the code
-- used. Restricted to service_role so the anon role cannot probe the table.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_reset_code(
  p_email TEXT,
  p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_found BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.password_reset_codes
    WHERE email = lower(trim(p_email))
      AND code = p_code
      AND used = false
      AND expires_at > NOW()
  ) INTO v_found;

  IF v_found THEN
    RETURN jsonb_build_object('success', true, 'message', 'Code verified');
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired code');
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_reset_code(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_reset_code(TEXT, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- verify_reset_code_and_update_password(p_email, p_code, p_new_password)
--
-- Atomically validates the code, marks it used, and updates auth.users.
-- SECURITY DEFINER with elevated privileges. Restricted to service_role.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_reset_code_and_update_password(
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
  v_code_record public.password_reset_codes%ROWTYPE;
  v_user_id UUID;
BEGIN
  -- Find the latest unused, non-expired code for this email
  SELECT * INTO v_code_record
  FROM public.password_reset_codes
  WHERE email = lower(trim(p_email))
    AND code = p_code
    AND used = false
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired code');
  END IF;

  -- Mark code as used before updating the password (prevents replay on error)
  UPDATE public.password_reset_codes SET used = true WHERE id = v_code_record.id;

  -- Find the auth user
  SELECT id INTO v_user_id FROM auth.users WHERE email = lower(trim(p_email)) LIMIT 1;

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

REVOKE EXECUTE ON FUNCTION public.verify_reset_code_and_update_password(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_reset_code_and_update_password(TEXT, TEXT, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- cleanup_expired_reset_codes()
--
-- Maintenance helper. Restricted to service_role.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_codes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.password_reset_codes WHERE expires_at < NOW() OR used = true;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_reset_codes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_reset_codes() TO service_role;
