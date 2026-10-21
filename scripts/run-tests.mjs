import { readdirSync } from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../", import.meta.url))
const files = readdirSync(path.join(root, "tests"), { recursive: true })
  .filter(file => /\.test\.(ts|cjs)$/.test(file))
  .map(file => path.join("tests", file))
  .sort()

// The CommonJS seed test has its own TS/alias loader. Running it with the
// native TS hooks would replace that loader and fail before executing tests.
const groups = [
  { name: "TypeScript", extension: ".ts", flags: ["--import", "./scripts/register-test-ts.mjs", "--experimental-strip-types"] },
  { name: "CommonJS seed mapping", extension: ".cjs", flags: [] },
]

for (const group of groups) {
  const tests = files.filter(file => file.endsWith(group.extension))
  if (!tests.length) throw new Error(`No ${group.name} tests found`)
  console.log(`\n${group.name}: ${tests.length} test file(s)`)
  const result = spawnSync(process.execPath, [...group.flags, "--test", ...tests], { cwd: root, stdio: "inherit" })
  if (result.error) throw result.error
  if (result.status !== 0) process.exitCode = 1
}
