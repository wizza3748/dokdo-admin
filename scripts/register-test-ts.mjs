import { registerHooks } from "node:module"
import { existsSync } from "node:fs"
import { pathToFileURL } from "node:url"

// Node's TypeScript test runner needs extensionless application imports resolved.
registerHooks({
  resolve(specifier, context, nextResolve) {
    const resolved = specifier.startsWith("@/")
      ? pathToFileURL(`${process.cwd()}/src/${specifier.slice(2)}`).href
      : specifier.startsWith(".") ? new URL(specifier, context.parentURL).href : null
    if (resolved && !/\.[cm]?[jt]sx?$/.test(resolved)) {
      for (const extension of [".ts", ".tsx", ".js"]) {
        if (existsSync(new URL(resolved + extension))) return nextResolve(resolved + extension, context)
      }
    }
    return nextResolve(specifier, context)
  },
})
