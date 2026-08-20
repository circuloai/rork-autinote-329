---
name: Supabase auth configuration
description: Guidance for diagnosing this app's Supabase connectivity without exposing credentials.
---

Public Supabase URL and anon key must be supplied as current runtime configuration; do not assume a checked-in fallback identifies a live project.

**Why:** A stale fallback can send all session and password requests to a hostname with no DNS record, which looks like a generic `Failed to fetch` login error even when the app and general network are healthy.

**How to apply:** For network-level auth failures, verify that the configured project endpoint resolves and responds without printing credentials. If it does not, restore the Supabase project or update the public URL/key before changing authentication logic.