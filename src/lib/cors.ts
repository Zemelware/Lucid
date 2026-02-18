const DEFAULT_ALLOWED_ORIGINS = [
  "capacitor://localhost",
  "http://localhost",
  "https://localhost",
  "http://127.0.0.1",
  "https://127.0.0.1",
] as const;

const ALLOW_METHODS = "GET,POST,OPTIONS";
const ALLOW_HEADERS = "Content-Type, Authorization";
const MAX_AGE_SECONDS = "86400";

function readAllowedOrigins(): Set<string> {
  const allowedOrigins = new Set<string>(DEFAULT_ALLOWED_ORIGINS);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    return allowedOrigins;
  }

  try {
    allowedOrigins.add(new URL(appUrl).origin);
  } catch {
    // Ignore invalid app URL values.
  }

  return allowedOrigins;
}

function createCorsHeaders(request: Request): Headers {
  const headers = new Headers();
  const requestOrigin = request.headers.get("origin");

  if (requestOrigin && readAllowedOrigins().has(requestOrigin)) {
    headers.set("Access-Control-Allow-Origin", requestOrigin);
    headers.set("Vary", "Origin");
  }

  headers.set("Access-Control-Allow-Methods", ALLOW_METHODS);
  headers.set("Access-Control-Allow-Headers", ALLOW_HEADERS);
  headers.set("Access-Control-Max-Age", MAX_AGE_SECONDS);

  return headers;
}

export function withCors(request: Request, response: Response): Response {
  const mergedHeaders = new Headers(response.headers);
  const corsHeaders = createCorsHeaders(request);

  corsHeaders.forEach((value, key) => {
    mergedHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: mergedHeaders,
  });
}

export function createOptionsResponse(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: createCorsHeaders(request),
  });
}
