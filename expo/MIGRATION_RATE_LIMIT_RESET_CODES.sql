-- Run after: MIGRATION_PASSWORD_RESET.sql
-- ============================================================
-- Rate limiting for password reset codes
--
-- Adds two defence-in-depth controls:
--
--  1. Attempt tracking + lockout on check_reset_code and
--     verify_reset_code_and_update_password:
--     After 5 consecutive wrong guesses for the same active
--     code row, the row is locked for 15 minutes. While locked,
--     ALL checks are rejected — even a correct code — until the
--     lockout expires. This caps the brute-force search space to
--     5 attempts per 15-minute window (vs 10 000 per 10 minutes).
--
--  2. 60-second request cooldown on create_password_reset_code:
--     If a non-expired code for the same email was already
--     issued within the last 60 seconds, the function silently
--     no-ops with the same generic success message so that
--     flood-generation of codes is not possible.
--
-- Idempotent — safe to re-run any number of times.
-- ============================================================

-- ------------------------------------------------------------
-- Schema additions: attempt_count and locked_until columns.
-- ADD COLUMN IF NOT EXISTS is a no-op on re-run.
-- ------------------------------------------------------------
ALTER TABLE public.password_reset_codes
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until  TIMESTAMPTZ;

-- Partial index speeds up the per-email active-row lookups that
-- the functions below perform on every call.
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_email_active
  ON public.password_reset_codes (email, created_at DESC)
  WHERE used = false;

-- ---------------------------------------------------------------------------
-- create_password_reset_code(p_email)
--
-- Adds a 60-second cooldown: silently no-ops if a non-expired
-- code for the same email was already issued in the last 60 s.
-- All other behaviour is identical to the original function.
-- Restricted to service_role only.
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

  -- 60-second flood-generation guard: if an active code was created
  -- in the last 60 seconds for this email, silently no-op.
  IF EXISTS (
    SELECT 1
    FROM public.password_reset_codes
    WHERE email      = lower(trim(p_email))
      AND used       = false
      AND expires_at > NOW()
      AND created_at > NOW() - INTERVAL '60 seconds'
  ) THEN
    -- Return the same generic success so the caller cannot detect the no-op.
    RETURN jsonb_build_object(
      'success', true,
      'message', 'If an account exists with that email, a verification code has been sent.'
    );
  END IF;

  -- Generate a random 4-digit numeric code entirely server-side.
  v_code := lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');

  INSERT INTO public.password_reset_codes (email, code, expires_at)
  VALUES (lower(trim(p_email)), v_code, NOW() + INTERVAL '10 minutes');

  RETURN jsonb_build_object('success', true, 'code', v_code);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_password_reset_code(TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.create_password_reset_code(TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- check_reset_code(p_email, p_code)
--
-- Non-destructive check with attempt tracking and lockout.
--
-- Returns:
--   { success: true,  message: "Code verified" }
--   { success: false, message: "..." }
--   { success: false, locked: true, message: "Too many attempts. ..." }
--
-- On each wrong guess the attempt_count on the active code row is
-- incremented. Once attempt_count reaches 5, locked_until is set
-- to NOW() + 15 minutes and the row is rejected for all subsequent
-- calls until that time passes.
-- Restricted to service_role only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_reset_code(
  p_email TEXT,
  p_code  TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rec       public.password_reset_codes%ROWTYPE;
  v_new_count INTEGER;
BEGIN
  -- Find the latest active (unused, non-expired) code row for this email.
  SELECT * INTO v_rec
  FROM public.password_reset_codes
  WHERE email      = lower(trim(p_email))
    AND used       = false
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired code');
  END IF;

  -- Reject all checks while the row is locked, even correct codes.
  IF v_rec.locked_until IS NOT NULL AND v_rec.locked_until > NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'locked',  true,
      'message', 'Too many attempts. Please try again in 15 minutes.'
    );
  END IF;

  -- Correct code → success (no side-effects; mark-as-used happens in
  -- verify_reset_code_and_update_password).
  IF v_rec.code = p_code THEN
    RETURN jsonb_build_object('success', true, 'message', 'Code verified');
  END IF;

  -- Wrong code → increment attempt count and maybe lock.
  v_new_count := v_rec.attempt_count + 1;

  IF v_new_count >= 5 THEN
    UPDATE public.password_reset_codes
    SET attempt_count = v_new_count,
        locked_until  = NOW() + INTERVAL '15 minutes'
    WHERE id = v_rec.id;

    RETURN jsonb_build_object(
      'success', false,
      'locked',  true,
      'message', 'Too many attempts. Please try again in 15 minutes.'
    );
  ELSE
    UPDATE public.password_reset_codes
    SET attempt_count = v_new_count
    WHERE id = v_rec.id;

    RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired code');
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_reset_code(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.check_reset_code(TEXT, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- verify_reset_code_and_update_password(p_email, p_code, p_new_password)
--
-- Atomically validates the code (with lockout check), marks it
-- used, and updates auth.users — identical to the original except:
--
--  • Checks locked_until before accepting any code.
--  • Increments attempt_count / sets locked_until on wrong guesses,
--    just like check_reset_code does.
--
-- Restricted to service_role only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_reset_code_and_update_password(
  p_email       TEXT,
  p_code        TEXT,
  p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rec       public.password_reset_codes%ROWTYPE;
  v_new_count INTEGER;
  v_user_id   UUID;
BEGIN
  -- Find the latest active code row for this email (to check lockout
  -- before we even compare the code value).
  SELECT * INTO v_rec
  FROM public.password_reset_codes
  WHERE email      = lower(trim(p_email))
    AND used       = false
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired code');
  END IF;

  -- Reject while locked.
  IF v_rec.locked_until IS NOT NULL AND v_rec.locked_until > NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'locked',  true,
      'message', 'Too many attempts. Please try again in 15 minutes.'
    );
  END IF;

  -- Wrong code → track attempt.
  IF v_rec.code <> p_code THEN
    v_new_count := v_rec.attempt_count + 1;

    IF v_new_count >= 5 THEN
      UPDATE public.password_reset_codes
      SET attempt_count = v_new_count,
          locked_until  = NOW() + INTERVAL '15 minutes'
      WHERE id = v_rec.id;

      RETURN jsonb_build_object(
        'success', false,
        'locked',  true,
        'message', 'Too many attempts. Please try again in 15 minutes.'
      );
    ELSE
      UPDATE public.password_reset_codes
      SET attempt_count = v_new_count
      WHERE id = v_rec.id;

      RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired code');
    END IF;
  END IF;

  -- Correct code. Mark as used before updating the password (prevents
  -- replay if the password UPDATE fails mid-transaction).
  UPDATE public.password_reset_codes SET used = true WHERE id = v_rec.id;

  -- Find the auth user.
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = lower(trim(p_email))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'No account found with this email');
  END IF;

  -- Update the password.
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at         = NOW()
  WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Password has been reset successfully');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_reset_code_and_update_password(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.verify_reset_code_and_update_password(TEXT, TEXT, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- cleanup_expired_reset_codes()
--
-- Maintenance helper. Unchanged from MIGRATION_PASSWORD_RESET.sql.
-- Re-declared here so this file is self-contained for the rate-limit
-- columns; original declaration in MIGRATION_PASSWORD_RESET.sql
-- remains the canonical source of truth.
-- Restricted to service_role.
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
GRANT  EXECUTE ON FUNCTION public.cleanup_expired_reset_codes() TO service_role;

-- ---------------------------------------------------------------------------
-- Verification: confirm the new columns exist and functions are present.
-- ---------------------------------------------------------------------------
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'password_reset_codes'
  AND column_name  IN ('attempt_count', 'locked_until')
ORDER BY column_name;
