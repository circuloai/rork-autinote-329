---
name: Reasoning model output budgets
description: Why Autumn needs a larger Responses API output budget than its visible answer length suggests.
---

Reasoning-capable models can consume the Responses API `max_output_tokens` budget on internal reasoning before producing visible text. A successful API call may therefore contain only reasoning items and an empty `output_text`; treat this as a budget issue before treating it as a network or authentication failure.

**Why:** Autumn's full caregiver prompt returned no visible text at smaller budgets even though the same funded credential and request completed successfully at a larger budget.

**How to apply:** Keep enough output budget for both reasoning and the requested answer, and test with the complete production prompt shape rather than a tiny provider-only prompt.