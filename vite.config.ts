import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: {
    target: "es2022",
    // Source maps in the production build let VS Code breakpoints work there too.
    sourcemap: true
  }
});
