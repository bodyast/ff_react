import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: "playground",
  resolve: {
    alias: {
      "@iqtechnology/ff-forms-react": path.resolve(__dirname, "src/index.ts"),
    },
  },
});
