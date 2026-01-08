import { promises as fs } from "fs";
import path from "path";
import type { IconIndex } from "@svg-api/shared/types";

let cachedIndex: IconIndex | null = null;

export const loadIndex = async () => {
  if (cachedIndex) return cachedIndex;
  const root = path.resolve(process.cwd(), "..", "..");
  const indexPath = path.join(root, "packages", "icons", "dist", "index.json");
  const raw = await fs.readFile(indexPath, "utf-8");
  cachedIndex = JSON.parse(raw) as IconIndex;
  return cachedIndex;
};
