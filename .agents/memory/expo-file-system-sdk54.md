---
name: expo-file-system SDK54 legacy API split
description: readAsStringAsync/EncodingType/cacheDirectory moved to a legacy subpath in expo-file-system on Expo SDK 54; import from the right place or you get silent TS errors.
---

In Expo SDK 54, `expo-file-system` (v19+) restructured its API. Functions like `readAsStringAsync`, `EncodingType`, and `cacheDirectory` are NOT exported from the main `expo-file-system` entrypoint anymore — they live under `expo-file-system/legacy`.

**Why:** the package introduced a new file-system API and moved the old (still widely-used) synchronous-style helpers to a `legacy` subpath for backward compatibility, without a runtime deprecation warning — TypeScript just reports the property doesn't exist.

**How to apply:** when working with base64 reads/writes, cache directories, or `EncodingType` on this project, `import * as FileSystem from 'expo-file-system/legacy'` instead of `'expo-file-system'`. If you see `tsc` errors like "Property 'cacheDirectory' does not exist on type ... expo-file-system/build/index", that's this issue — check the import path before assuming the code is broken. (A known pre-existing occurrence of this bug lives in `expo/app/settings/data-privacy.tsx`, out of scope to fix unless asked.)

Similarly, `expo-image-picker`'s `MediaTypeOptions` enum is deprecated in favor of a plain string array, e.g. `mediaTypes: ['images']` instead of `ImagePicker.MediaTypeOptions.Images`.
