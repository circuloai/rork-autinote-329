---
name: Supabase integration test runtime
description: Real Supabase integration tests require valid non-production runtime secrets, not placeholder environment entries.
---

The account deletion integration suite must run only with valid non-production Supabase URL, anon key, and service-role key values injected into the test process. An explicit non-production opt-in prevents accidental use of the checked-in fallback project.

**Why:** In this workspace, the declared Supabase secrets were present but exposed to the shell as non-usable placeholders, so the real fixture could not safely connect.

**How to apply:** Before running `test:account-deletion:integration`, verify the runtime has a valid HTTPS Supabase URL and matching keys without printing their values. Do not bypass the opt-in or fall back to the checked-in project.