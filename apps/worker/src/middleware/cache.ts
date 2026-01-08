import type { Context, Next } from "hono";
import type { Env } from "../env";

/**
 * Edge Cache middleware using Cloudflare Cache API
 * Caches responses at the edge for optimal performance
 */
export const edgeCache = (options: {
  ttl: number;
  cacheControl?: string;
  varyHeaders?: string[];
}) => {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    // Edge cache using Cloudflare Cache API
    const cache = (caches as unknown as { default: Cache }).default;
    const cacheKey = new Request(c.req.url, {
      method: "GET",
      headers: {
        Accept: c.req.header("Accept") || "*/*",
      },
    });

    // Check cache first
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      const response = new Response(cachedResponse.body, cachedResponse);
      response.headers.set("X-Cache", "HIT");
      return response;
    }

    // Continue to handler
    await next();

    // Cache the response if successful
    const response = c.res;
    if (response.ok && response.status === 200) {
      const clonedResponse = response.clone();
      const headers = new Headers(clonedResponse.headers);

      headers.set(
        "Cache-Control",
        options.cacheControl || `public, max-age=${options.ttl}`,
      );
      headers.set("X-Cache", "MISS");

      if (options.varyHeaders?.length) {
        headers.set("Vary", options.varyHeaders.join(", "));
      }

      const responseToCache = new Response(clonedResponse.body, {
        status: clonedResponse.status,
        statusText: clonedResponse.statusText,
        headers,
      });

      c.executionCtx.waitUntil(cache.put(cacheKey, responseToCache));
    }

    return response;
  };
};

/**
 * Generate cache key from request parameters
 */
export const generateCacheKey = (
  url: string,
  params: Record<string, string | undefined>,
): string => {
  const sortedParams = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  return `${url}?${sortedParams}`;
};
