/* Style philosophy: the docs example stays framework-free; this config only makes the OneKit page portable in local and proxied previews. */
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL("./", import.meta.url)),
  server: { host: true, allowedHosts: true },
  preview: { host: true, allowedHosts: true },
  build: { outDir: "../../dist-docs", emptyOutDir: true },
});
