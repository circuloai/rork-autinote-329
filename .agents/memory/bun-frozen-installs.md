---
name: Bun frozen installs
description: The repository post-merge hook requires the Expo manifest and Bun lockfile to stay synchronized.
---

The Expo post-merge setup intentionally uses Bun's frozen-lockfile mode. Any dependency-range change must be accompanied by a regenerated lockfile before it can merge cleanly.

**Why:** Bun exits before running the project postinstall when the workspace manifest and lockfile root dependency ranges differ, even if the installed packages otherwise work.

**How to apply:** When a merge reports a frozen-lockfile mismatch, regenerate the lockfile from `expo/` with the repository's Bun version, confirm the diff only reflects the intended manifest change, then rerun the post-merge setup.