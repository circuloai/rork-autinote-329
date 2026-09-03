const fs = require("fs");
const path = require("path");

const lockfilePath = path.join(__dirname, "..", "bun.lock");
const lockfile = fs.readFileSync(lockfilePath, "utf8");
let hasProblem = false;

if (lockfile.includes("package-firewall.replit.local")) {
  console.error("Invalid bun.lock: contains package-firewall.replit.local.");
  hasProblem = true;
}

if (/sha512-[A-Za-z0-9+/]*AAAAAAAAAA/.test(lockfile)) {
  console.error("Invalid bun.lock: contains a suspicious sha512 hash.");
  hasProblem = true;
}

if (hasProblem) {
  process.exit(1);
}

console.log("bun.lock OK");