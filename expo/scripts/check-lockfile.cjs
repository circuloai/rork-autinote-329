const fs = require("fs");
const path = require("path");

const lockfilePath = path.join(__dirname, "..", "bun.lock");
const lockfile = fs.readFileSync(lockfilePath, "utf8");
const packageJsonPath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const directDependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};
let hasProblem = false;

if (lockfile.includes("package-firewall.replit.local")) {
  console.error("Invalid bun.lock: contains package-firewall.replit.local.");
  hasProblem = true;
}

if (/sha512-[A-Za-z0-9+/]*AAAAAAAAAA/.test(lockfile)) {
  console.error("Invalid bun.lock: contains a suspicious sha512 hash.");
  hasProblem = true;
}

for (const [name, override] of Object.entries(packageJson.overrides || {})) {
  if (
    Object.prototype.hasOwnProperty.call(directDependencies, name) &&
    override !== directDependencies[name] &&
    override !== `$${name}`
  ) {
    console.error(
      `Invalid package.json override for ${name}: expected "${directDependencies[name]}" or "$${name}", got "${override}".`,
    );
    hasProblem = true;
  }
}

if (hasProblem) {
  process.exit(1);
}

console.log("package overrides OK");
console.log("bun.lock OK");