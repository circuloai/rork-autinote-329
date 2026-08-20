---
name: Expo Bun watcher compatibility
description: Bun/Metro environment constraints that affect the Expo development workflow.
---

When the Expo development workflow runs under Bun, `freeport-async` can incorrectly report every port unavailable because of Bun's socket-probe behavior. Metro also exceeds the container's fallback watcher limit without Watchman.

**Why:** These failures leave the workflow stuck before port 5000 opens or cause it to crash with `ENOSPC` / `EINVAL` watcher errors, even though the application code is valid.

**How to apply:** Keep the project's postinstall compatibility script that patches `freeport-async`, and retain Watchman as a system dependency. If Metro cache behavior becomes inconsistent after dependency changes, clear `.expo/` and `/tmp/metro-*` before restarting.