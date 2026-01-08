import type { Env } from "../env";

export interface R2IconObject {
  body: string;
  etag: string | null;
  size: number;
  uploaded: Date | null;
}

/**
 * Validates and sanitizes R2 object keys to prevent path traversal
 */
const sanitizeKey = (key: string): string | null => {
  // Reject empty keys
  if (!key || typeof key !== "string") return null;

  // Reject keys with path traversal attempts
  if (key.includes("..") || key.includes("//") || key.startsWith("/")) {
    return null;
  }

  // Only allow alphanumeric, dash, underscore, dot, and forward slash
  if (!/^[a-zA-Z0-9\-_./]+$/.test(key)) {
    return null;
  }

  // Normalize and return
  return key.replace(/\/+/g, "/");
};

export const getIconFromR2 = async (
  env: Env,
  key: string,
): Promise<R2IconObject | null> => {
  const safeKey = sanitizeKey(key);
  if (!safeKey) {
    console.warn(`[Security] Rejected invalid R2 key: ${key}`);
    return null;
  }

  if (env.LOCAL_ICONS_BASE_URL) {
    const url = `${env.LOCAL_ICONS_BASE_URL.replace(/\/$/, "")}/${safeKey}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const body = await response.text();
    const etag = response.headers.get("etag");
    const size = Number(response.headers.get("content-length") ?? body.length);
    return { body, etag, size, uploaded: null };
  }

  const object = await env.SVG_BUCKET.get(safeKey);
  if (!object) return null;
  const body = await object.text();
  return {
    body,
    etag: object.httpEtag ?? object.etag ?? null,
    size: object.size,
    uploaded: object.uploaded ?? null,
  };
};
