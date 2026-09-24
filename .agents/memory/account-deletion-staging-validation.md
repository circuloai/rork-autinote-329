---
name: Protected account-deletion validation
description: Safety constraints for running the destructive Supabase account-deletion integration suite before release.
---

The account-deletion integration suite is destructive and must be launched by a protected CI/staging job. The job must require an explicit staging environment, compare the runtime Supabase URL with an externally supplied staging target, and keep all credentials outside source control.

**Why:** A non-production label alone cannot prevent a misconfigured job from pointing at the wrong Supabase project.

**How to apply:** Keep the staging runner fail-closed and do not replace its target or credential checks with checked-in defaults. If fixture setup fails, clean every resource created so far and surface cleanup errors alongside the setup failure.