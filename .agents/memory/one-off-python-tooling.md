---
name: One-off Python tooling side effects
description: Python package installation for asset work can alter an Expo workspace beyond the requested script.
---

Treat Python package installation for a one-off asset as a workspace-changing operation, not an isolated library install.

**Why:** In this Expo/Bun workspace, the package helper initialized an unrelated root Python starter project and expanded the workspace's Nix dependencies. Protected workspace configuration could not be edited directly.

**How to apply:** After temporary Python asset work, inspect workspace status and workflows; remove unrelated starter files and restore temporary system dependencies through the supported package-management tools.