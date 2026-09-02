---
name: Settings persistence
description: Rules for preserving user settings while migrating legacy preference defaults.
---

Settings writes should update the local query optimistically, persist to Supabase before confirming success, check every Supabase mutation error, and expose an awaited save path to screens that show confirmation. Legacy mint palette values are normalized to warm when written; an old dark-plus-mint record is treated as an unintentional forced-dark default only during read migration.

**Why:** Earlier screens announced success before persistence completed, and the old default could overwrite a deliberate dark-mode choice after reload.

**How to apply:** Keep user-visible save confirmations behind the async save result, roll back optimistic state on failure, and preserve extended settings inside the preferences JSON payload.