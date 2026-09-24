const { spawnSync } = require("node:child_process");

const requiredEnvironment = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ACCOUNT_DELETION_STAGING_URL",
];

const errors = [];

if (process.env.CI !== "true") {
  errors.push("CI=true is required; this command is only for the protected staging job");
}

if (process.env.SUPABASE_ACCOUNT_DELETION_ENV !== "staging") {
  errors.push(
    "SUPABASE_ACCOUNT_DELETION_ENV must be set to staging by the protected job",
  );
}

for (const name of requiredEnvironment) {
  if (!process.env[name]?.trim()) {
    errors.push(`${name} is required`);
  }
}

function normalizedOrigin(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

const actualOrigin = normalizedOrigin(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "");
const expectedOrigin = normalizedOrigin(
  process.env.SUPABASE_ACCOUNT_DELETION_STAGING_URL ?? "",
);

if (!actualOrigin) {
  errors.push("EXPO_PUBLIC_SUPABASE_URL must be a valid HTTPS URL");
} else if (!expectedOrigin) {
  errors.push("SUPABASE_ACCOUNT_DELETION_STAGING_URL must be a valid HTTPS URL");
} else if (actualOrigin !== expectedOrigin) {
  errors.push(
    "EXPO_PUBLIC_SUPABASE_URL does not match the protected staging project",
  );
}

if (errors.length > 0) {
  console.error("Refusing account-deletion staging validation:");
  for (const error of errors) console.error(`- ${error}`);
  console.error(
    "Configure the protected staging environment without committing credentials or target selection.",
  );
  process.exit(1);
}

const result = spawnSync(
  "bun",
  [
    "test",
    "backend/trpc/routes/account/delete-account/route.integration.test.ts",
  ],
  {
    cwd: __dirname + "/..",
    env: {
      ...process.env,
      SUPABASE_ACCOUNT_DELETION_INTEGRATION: "true",
      SUPABASE_ACCOUNT_DELETION_ENV: "staging",
    },
    stdio: "inherit",
  },
);

if (result.error) {
  console.error(`Account-deletion staging validation could not start: ${result.error.message}`);
  process.exit(1);
}

if (result.signal) {
  console.error(`Account-deletion staging validation stopped by ${result.signal}`);
  process.exit(1);
}

process.exit(result.status ?? 1);