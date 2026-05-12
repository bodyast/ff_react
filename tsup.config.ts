import { defineConfig } from "tsup";
import { copyFileSync } from "node:fs";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  splitting: false,
  external: ["react", "react-dom"],
  async onSuccess() {
    copyFileSync("src/styles/default.css", "dist/styles.css");
  },
})
