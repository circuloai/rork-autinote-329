---
name: EAS Bun lockfiles
description: Build compatibility guidance for Bun lockfiles exported from Replit into Expo EAS builds
---

When an Expo cloud build runs Bun from a clean machine, dependency tarball URLs in bun.lock must be publicly reachable. Replit-internal package-firewall URLs are not available remotely and can cause the dependency install phase to exit nonzero.

**Why:** Replit may record internal package-firewall tarball URLs in bun.lock while local installs succeed through the workspace network. EAS does not share that network.

**How to apply:** Scan bun.lock for both package-firewall.replit.local and package-firewall.replit.internal URLs; replace either with equivalent registry.npmjs.org URLs while preserving integrity hashes. Confirm with bun install --frozen-lockfile.