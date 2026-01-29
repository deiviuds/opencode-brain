import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "node18",
  external: ["@opencode-ai/plugin", "@opencode-ai/sdk"],
  treeshake: true,
})
