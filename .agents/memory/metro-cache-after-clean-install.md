---
name: Metro cache stale after clean node_modules reinstall
description: After rm -rf node_modules && bun install, Metro file watcher loses track of reinstalled packages — fix is to clear .expo/ and /tmp/metro-* before restarting
---

## Rule
After any clean `rm -rf node_modules && bun install`, always clear Metro's cache before restarting the workflow.

**Why:** Metro maintains a file watcher and SHA-1 hash cache in `.expo/` and `/tmp/metro-*`/`/tmp/haste-map-*`. After a full node_modules reinstall, the watcher's internal state refers to files that were deleted and recreated at the same paths. Metro reports "Failed to get the SHA-1 for …" and "Unable to resolve module … could not be found" for packages that physically exist on disk.

**How to apply:** Any time node_modules is fully deleted and reinstalled, run:
```bash
rm -rf expo/.expo/ /tmp/metro-* /tmp/haste-map-*
```
Then restart the workflow. The first bundle will be slower (full cache rebuild) but will succeed cleanly.
