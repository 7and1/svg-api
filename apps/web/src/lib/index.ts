import type { IconIndex } from "@svg-api/shared/types";

let cachedIndex: IconIndex | null = null;

export const loadIndex = async (): Promise<IconIndex> => {
  if (cachedIndex) return cachedIndex;

  // Fetch from the API (works in both Node.js and Edge Runtime)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.svg-api.org";
  const response = await fetch(`${apiUrl}/index`, {
    // Cache for 1 hour since index changes infrequently
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Failed to load icon index: ${response.status}`);
  }

  cachedIndex = await response.json() as IconIndex;
  return cachedIndex;
};
