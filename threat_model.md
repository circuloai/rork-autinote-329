# Threat Model

## Project Overview

AutiNote is an Expo/React Native application for caregivers and therapists to track child behavior and progress, exchange messages, and share access to logs, profiles, and therapist notes. The production stack is an Expo client, a small Hono+tRPC backend under `expo/backend`, and Supabase for authentication, database access, and row-level security. The client talks directly to Supabase for most reads and writes, so production security depends heavily on Supabase Auth session integrity and database RLS correctness.

This scan is scoped to production-reachable code only. Mock, local-only, generated, and dependency directories such as `expo/node_modules`, `attached_assets`, and ad hoc diagnostic artifacts are out of scope unless production reachability is demonstrated.

## Assets

- **User accounts and sessions** — Supabase identities, password credentials, refresh tokens, and OAuth sessions. Compromise enables caregiver or therapist impersonation.
- **Child health and behavior data** — `children`, `log_entries`, therapist notes, chat messages, and derived insights. This is highly sensitive personal and health-adjacent data.
- **Caregiver and therapist contact data** — email addresses, phone numbers, role metadata, and sharing relationships stored in `profiles` and `shared_access`.
- **Authorization state** — sharing permissions such as `can_view_logs`, `can_export`, `can_add_notes`, and `readonly_mode`. Unauthorized modification changes who can access or alter protected child data.
- **Exported reports and local caches** — generated PDFs/JSON exports and locally persisted app state in AsyncStorage.

## Trust Boundaries

- **Client to Supabase boundary** — most production data access happens directly from untrusted client code to Supabase APIs. Every table and RPC exposed here must enforce authorization server-side.
- **Client to Hono/tRPC boundary** — custom backend procedures under `expo/backend/trpc/routes` are internet-reachable when deployed and must treat every request as attacker-controlled.
- **Supabase Auth to application data boundary** — RLS policies must correctly translate authenticated users into caregiver and therapist permissions.
- **Caregiver to therapist boundary** — therapists should only gain the exact rights explicitly granted by caregivers for specific children.
- **Public to authenticated boundary** — login, signup, and forgot-password flows are public; profile, logs, sharing, chat, and export flows must remain authenticated and scoped.
- **App to local device storage boundary** — AsyncStorage and locally exported files live on the user device and should be treated as less trusted than server-side data controls.

## Scan Anchors

- **Production entry points:** `expo/app/**`, `expo/contexts/AuthContext.tsx`, `expo/contexts/AppContext.tsx`, `expo/lib/supabase.ts`, `expo/backend/hono.ts`, `expo/backend/trpc/**`
- **Highest-risk areas:** custom forgot-password flow in `expo/backend/trpc/routes/auth/forgot-password/route.ts`; sharing and permission logic in `expo/contexts/AppContext.tsx`, `expo/app/settings/invite-therapist.tsx`, and related SQL/RLS files; direct Supabase client initialization in `expo/lib/supabase.ts`
- **Public surfaces:** login/signup/OAuth and forgot-password flows; Hono root route and `/api/trpc`
- **Authenticated surfaces:** profiles, children, logs, therapist notes, shared access, chat, export/privacy screens
- **Usually ignore unless reachability changes:** `expo/node_modules/**`, `attached_assets/**`, `.cache/**`, exploratory SQL/docs except where they define production RLS expectations

## Threat Categories

### Spoofing

Authentication is delegated to Supabase Auth, but this project also implements its own password-reset flow. Public auth endpoints must not let attackers impersonate caregivers or therapists by guessing reset secrets, abusing OAuth redirects, or bypassing session validation. All protected data operations must rely on valid Supabase sessions rather than client-side route state.

### Tampering

The client sends profile, child, log, note, message, and sharing-permission updates directly to Supabase. The system must guarantee that users can only modify their own data and that therapists cannot escalate or rewrite `shared_access` permissions that caregivers control. Password-reset state must also resist attacker-controlled overwrite or replay.

### Information Disclosure

Caregiver profiles, child records, logs, therapist notes, chat messages, and exports must only be visible to the owning caregiver or to therapists with explicitly granted access. Direct client access means RLS mistakes can expose whole tables, not just a single screen. Error logs and reset flows must not reveal secrets that can be reused for access.

### Denial of Service

Public procedures such as forgot-password can be invoked anonymously and must resist brute-force and request-flood abuse. Any design that stores attacker-triggered records or performs expensive auth mutations without throttling can be abused to degrade availability or create operational load.

### Elevation of Privilege

This app’s main elevation-of-privilege risk is broken access control in Supabase RLS and custom RPCs. Therapists must not be able to self-approve invitations, widen their permissions, export more data than granted, or reset another user’s credentials. All privileged database functions must narrowly enforce purpose and input constraints.
