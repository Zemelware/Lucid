const TRAILING_SLASHES = /\/+$/;

function readApiBaseUrl(): string {
  const rawValue = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (typeof rawValue !== "string") {
    return "";
  }

  return rawValue.trim().replace(TRAILING_SLASHES, "");
}

export function buildApiUrl(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error(`API path must start with "/": ${path}`);
  }

  const baseUrl = readApiBaseUrl();
  if (!baseUrl) {
    return path;
  }

  return `${baseUrl}${path}`;
}
