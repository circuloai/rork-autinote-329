---
name: EAS Bun lockfiles
description: Build compatibility guidance for Bun lockfiles exported from Replit into Expo EAS builds
---

When an Expo EAS build runs Bun from a clean machine, dependency tarball URLs in bun.lock must be publicly reachable. Replit-internal package-firewall URLs are not available in EAS and can cause the dependency install phase to exit nonzero.

**Why:** Replit may record internal package-firewall tarball URLs in bun.lock while local installs succeed through the workspace network. EAS does not share that network.

**How to apply:** Before retrying a failed EAS Bun install, scan bun.lock for package-firewall.replit.local URLs and replace them with equivalent registry.npmjs.org tarball URLs while preserving the existing integrity hashes. Confirm with bun install --frozen-lockfile.