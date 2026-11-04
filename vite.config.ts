// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// The FastAPI backend has no CORS middleware, so a browser cannot fetch it
// directly. Instead the app calls same-origin `/api/...` paths and this proxy
// forwards them to the backend — same trick as a Next.js `rewrites()` rule,
// expressed in Vite. Override the backend origin with NYAYA_API_ORIGIN.
const BACKEND_ORIGIN = process.env.NYAYA_API_ORIGIN ?? "http://127.0.0.1:8000";

const proxy = {
  "/api": {
    target: BACKEND_ORIGIN,
    changeOrigin: true,
    ws: false,
  },
};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    server: { proxy },
    preview: { proxy },
  },
});
