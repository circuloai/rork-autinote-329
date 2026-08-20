const fs = require("fs");
const path = require("path");

const dependencyPath = path.join(__dirname, "..", "node_modules", "freeport-async", "index.js");
const marker = "Bun 1.3's net shim reports";

if (fs.existsSync(dependencyPath)) {
  const source = fs.readFileSync(dependencyPath, "utf8");
  if (!source.includes(marker)) {
    const patched = source.replace(
      "function testPortAsync(port, hostname) {\n",
      `function testPortAsync(port, hostname) {
  // Bun 1.3's net shim reports every probe as unavailable; Metro performs the real bind.
  if (process.versions && process.versions.bun) return Promise.resolve(true);
`
    );
    if (patched === source) {
      throw new Error("Could not apply the Bun freeport compatibility patch.");
    }
    fs.writeFileSync(dependencyPath, patched);
  }
}