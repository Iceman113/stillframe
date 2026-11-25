import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset URLs, so the build works under any sub-path,
  // e.g. GitHub Pages at https://<user>.github.io/<repo>/.
  base: "./",
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: {
    target: "es2022",
    // Source maps in the production build let VS Code breakpoints work there too.
    sourcemap: true
  }
});
