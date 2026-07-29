import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Foundry stack for the Provenance Ontology.
const FOUNDRY = "https://jadencutinha.usw-16.palantirfoundry.com";

// The browser calls /foundry/... on localhost; this dev proxy forwards to the Foundry API
// and injects the bearer token server-side. Keeps the token out of the browser and sidesteps
// CORS. FOUNDRY_TOKEN is read from app/.env.local (gitignored) and never shipped to the client.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const token = env.FOUNDRY_TOKEN || "";
  return {
    plugins: [react()],
    server: {
      proxy: {
        "/foundry": {
          target: FOUNDRY,
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/foundry/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (token) proxyReq.setHeader("Authorization", `Bearer ${token}`);
            });
          },
        },
      },
    },
  };
});
