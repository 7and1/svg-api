import type { Context } from "hono";

export const corsHeaders = (origin: string | null = "*") => ({
  "Access-Control-Allow-Origin": origin ?? "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, If-None-Match",
  "Access-Control-Max-Age": "86400",
});

export const applyCors = (c: Context) => {
  const origin = c.req.header("Origin");
  const allowOrigin = origin ?? "*";
  const headers = corsHeaders(allowOrigin);
  for (const [key, value] of Object.entries(headers)) {
    c.header(key, value);
  }
};

export const requestId = () => `req_${crypto.randomUUID()}`;

export const jsonResponse = (
  c: Context,
  data: unknown,
  meta: Record<string, unknown> = {},
  init?: ResponseInit,
) => {
  const payload = {
    data,
    meta: {
      request_id: requestId(),
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
  return c.json(payload, init);
};

export const errorResponse = (
  c: Context,
  code: string,
  message: string,
  status = 400,
  details: Record<string, unknown> = {},
) => {
  const payload = {
    error: {
      code,
      message,
      details,
    },
    meta: {
      request_id: requestId(),
      timestamp: new Date().toISOString(),
    },
  };
  return c.json(payload, status);
};
