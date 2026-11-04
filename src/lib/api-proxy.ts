// Server-side stand-in for a dev-server rewrite proxy.
//
// The FastAPI backend has no CORS middleware, and this sandbox's Vite config
// strips `server.proxy`, so a rewrite rule can't live in the bundler. Instead
// the browser calls same-origin `/api/...` paths and the app's own server entry
// (src/server.ts) forwards them here — a server-to-server call, which the
// browser never sees and therefore never blocks.
//
// Point at a different backend with NYAYA_API_ORIGIN; outside production the
// default is the local FastAPI port.

const HOP_BY_HOP = new Set([
  "host",
  "connection",
  "keep-alive",
  "content-length",
  "transfer-encoding",
  "upgrade",
  "proxy-authorization",
  "proxy-authenticate",
  "te",
  "trailer",
]);

const LOCAL_BACKEND = "http://127.0.0.1:8000";

function envValue(key: string): string | undefined {
  try {
    return typeof process !== "undefined" ? process.env?.[key] : undefined;
  } catch {
    return undefined;
  }
}

/** Origin to forward `/api/*` to, or null when forwarding is not configured. */
export function backendOrigin(): string | null {
  const configured = envValue("NYAYA_API_ORIGIN");
  if (configured) return configured.replace(/\/+$/, "");
  const mode = envValue("NODE_ENV");
  return mode && mode !== "production" ? LOCAL_BACKEND : null;
}

function stripHopByHop(headers: Headers): Headers {
  const out = new Headers();
  headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) out.set(key, value);
  });
  return out;
}

/**
 * Forward a `/api/...` request to the backend and return its response verbatim.
 * A connection failure becomes a 502 whose `detail` the client can render.
 */
export async function proxyApiRequest(request: Request, origin: string): Promise<Response> {
  const url = new URL(request.url);
  const target = `${origin}${url.pathname}${url.search}`;

  let body: ArrayBuffer | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers: stripHopByHop(request.headers),
      body: body && body.byteLength ? body : null,
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });

  } catch {
    return Response.json(
      { detail: `The NyayaML backend is not reachable at ${origin}. Start it, or point NYAYA_API_ORIGIN at its address.` },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  const responseHeaders = stripHopByHop(upstream.headers);
  responseHeaders.delete("content-encoding");
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
