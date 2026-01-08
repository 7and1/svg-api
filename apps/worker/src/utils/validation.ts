import { z } from "zod";
import {
  DEFAULT_ICON_SIZE,
  DEFAULT_STROKE_WIDTH,
  MAX_ICON_SIZE,
  MAX_STROKE_WIDTH,
  MIN_ICON_SIZE,
  MIN_STROKE_WIDTH,
} from "@svg-api/shared/constants";

export const sourceSchema = z.string().regex(/^[a-z0-9-]+$/);
export const nameSchema = z.string().regex(/^[a-z0-9-]+$/);

const colorRegex = /^(#([0-9a-fA-F]{3}){1,2}|[a-zA-Z]+)$/;

export const parseSize = (value: string | undefined) => {
  if (!value) return DEFAULT_ICON_SIZE;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < MIN_ICON_SIZE || parsed > MAX_ICON_SIZE) return null;
  return parsed;
};

export const parseStrokeWidth = (value: string | undefined) => {
  if (!value) return DEFAULT_STROKE_WIDTH;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < MIN_STROKE_WIDTH || parsed > MAX_STROKE_WIDTH) return null;
  return parsed;
};

export const parseColor = (value: string | undefined) => {
  if (!value) return "currentColor";
  if (!colorRegex.test(value)) return null;
  return value;
};

export const parseLimit = (
  value: string | undefined,
  fallback: number,
  max: number,
) => {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(parsed)));
};

export const parseOffset = (value: string | undefined) => {
  if (!value) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
};

export const parseRotate = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  // Allow any rotation value, will be normalized to 0-360
  return parsed;
};

export const parseMirror = (value: string | undefined): boolean => {
  if (!value) return false;
  const normalized = value.toLowerCase().trim();
  return normalized === "true" || normalized === "1" || normalized === "yes";
};
