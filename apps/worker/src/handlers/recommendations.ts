import type { Context } from "hono";
import type { Env } from "../env";
import { jsonResponse, errorResponse } from "../utils/response";

/**
 * Smart Icon Recommendations Handler
 *
 * Provides intelligent icon recommendations based on:
 * - Search history
 * - Popular icons
 * - Similar icons (semantic similarity)
 * - Context-aware suggestions
 */

export interface RecommendationRequest {
  context?: string;
  currentIcon?: string;
  source?: string;
  limit?: number;
}

export interface Recommendation {
  name: string;
  source: string;
  category: string;
  score: number;
  reason: string;
  preview_url: string;
}

export interface RecommendationsResponse {
  data: Recommendation[];
  meta: {
    total: number;
    context?: string;
    method: string;
  };
}

// Common icon associations for context-aware recommendations
const ICON_ASSOCIATIONS: Record<string, string[]> = {
  "user": ["user-circle", "users", "user-plus", "user-minus", "user-check", "user-x"],
  "home": ["house", "building", "door", "key", "lock"],
  "search": ["filter", "sort", "list", "grid", "zoom-in", "zoom-out"],
  "settings": ["sliders", "tool", "wrench", "cog", "options"],
  "file": ["folder", "document", "download", "upload", "save", "trash"],
  "message": ["mail", "chat", "comment", "bell", "notification"],
  "heart": ["star", "thumbs-up", "bookmark", "like", "favorite"],
  "arrow": ["chevron", "caret", "caret-up", "caret-down", "arrow-left", "arrow-right"],
  "media": ["play", "pause", "stop", "skip", "volume", "image", "video"],
  "navigation": ["menu", "home", "back", "forward", "refresh", "external-link"],
};

// Category-based recommendations
const CATEGORY_COMPLEMENTS: Record<string, string[]> = {
  "navigation": ["arrows", "menus", "actions"],
  "communication": ["notifications", "social", "feedback"],
  "media": ["controls", "devices", "files"],
  "files": ["actions", "storage", "status"],
  "actions": ["confirmation", "editing", "navigation"],
};

/**
 * Calculate Jaccard similarity between two sets
 */
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

/**
 * Get similar icons based on name patterns
 */
function getSimilarIcons(iconName: string): string[] {
  const similar: string[] = [];
  
  // Check direct associations
  for (const [key, icons] of Object.entries(ICON_ASSOCIATIONS)) {
    if (iconName.includes(key) || key.includes(iconName)) {
      similar.push(...icons);
    }
  }
  
  // Pattern-based similarity
  const parts = iconName.split("-");
  if (parts.length > 1) {
    // If icon has modifiers (e.g., "user-circle"), suggest other modifiers
    const base = parts[0];
    const modifiers = ["circle", "square", "outline", "filled", "plus", "minus", "check", "x"];
    for (const mod of modifiers) {
      if (!iconName.includes(mod)) {
        similar.push(`${base}-${mod}`);
      }
    }
  }
  
  return [...new Set(similar)].filter(name => name !== iconName);
}

/**
 * Get recommendations based on context string
 */
function getContextualRecommendations(context: string): string[] {
  const contextLower = context.toLowerCase();
  const recommendations: string[] = [];
  
  // Map common UI contexts to icon sets
  const contextMappings: Record<string, string[]> = {
    "header": ["menu", "search", "user", "bell", "settings", "home"],
    "sidebar": ["home", "folder", "settings", "users", "chart", "calendar"],
    "footer": ["social", "mail", "phone", "map-pin", "external-link"],
    "form": ["save", "cancel", "trash", "plus", "minus", "check"],
    "card": ["heart", "share", "more-horizontal", "expand", "image"],
    "modal": ["x", "check", "alert", "info", "help-circle"],
    "table": ["sort", "filter", "edit", "trash", "eye", "download"],
    "dashboard": ["chart", "trending", "activity", "pie-chart", "bar-chart"],
    "auth": ["user", "lock", "key", "mail", "shield", "login", "logout"],
    "ecommerce": ["cart", "credit-card", "tag", "package", "truck", "receipt"],
  };
  
  for (const [key, icons] of Object.entries(contextMappings)) {
    if (contextLower.includes(key)) {
      recommendations.push(...icons);
    }
  }
  
  return [...new Set(recommendations)];
}

/**
 * Get popular icons (simulated - in production, this would use analytics data)
 */
async function getPopularIcons(
  env: Env,
  source?: string,
  limit: number = 10
): Promise<Recommendation[]> {
  // In production, this would query analytics data from D1 or analytics engine
  // For now, return commonly used icons
  const popularIcons = [
    { name: "home", source: "lucide", category: "navigation" },
    { name: "search", source: "lucide", category: "actions" },
    { name: "user", source: "lucide", category: "users" },
    { name: "settings", source: "lucide", category: "system" },
    { name: "bell", source: "lucide", category: "communication" },
    { name: "menu", source: "lucide", category: "navigation" },
    { name: "heart", source: "lucide", category: "social" },
    { name: "star", source: "lucide", category: "social" },
    { name: "arrow-right", source: "lucide", category: "arrows" },
    { name: "check", source: "lucide", category: "status" },
    { name: "x", source: "lucide", category: "status" },
    { name: "plus", source: "lucide", category: "math" },
    { name: "trash", source: "lucide", category: "files" },
    { name: "edit", source: "lucide", category: "actions" },
    { name: "download", source: "lucide", category: "files" },
  ];
  
  const filtered = source 
    ? popularIcons.filter(i => i.source === source)
    : popularIcons;
  
  return filtered.slice(0, limit).map((icon, idx) => ({
    name: icon.name,
    source: icon.source,
    category: icon.category,
    score: 1 - (idx * 0.05),
    reason: "popular",
    preview_url: `/icons/${icon.source}/${icon.name}`,
  }));
}

/**
 * Get recommendations based on current icon
 */
async function getRelatedIcons(
  iconName: string,
  source: string = "lucide",
  limit: number = 10
): Promise<Recommendation[]> {
  const similarNames = getSimilarIcons(iconName);
  
  return similarNames.slice(0, limit).map((name, idx) => ({
    name,
    source,
    category: "related",
    score: 0.9 - (idx * 0.05),
    reason: "similar",
    preview_url: `/icons/${source}/${name}`,
  }));
}

/**
 * Main recommendations handler
 * GET /recommendations
 */
export async function recommendationsHandler(c: Context<{ Bindings: Env }>) {
  const context = c.req.query("context");
  const currentIcon = c.req.query("current_icon");
  const source = c.req.query("source") || "lucide";
  const limit = Math.min(parseInt(c.req.query("limit") || "10", 10), 50);
  
  try {
    const recommendations: Recommendation[] = [];
    const seen = new Set<string>();
    
    // 1. Context-based recommendations
    if (context) {
      const contextualIcons = getContextualRecommendations(context);
      for (const name of contextualIcons) {
        if (!seen.has(name)) {
          seen.add(name);
          recommendations.push({
            name,
            source,
            category: "contextual",
            score: 0.95,
            reason: `matches context: ${context}`,
            preview_url: `/icons/${source}/${name}`,
          });
        }
      }
    }
    
    // 2. Related icons based on current selection
    if (currentIcon) {
      const related = await getRelatedIcons(currentIcon, source, limit);
      for (const rec of related) {
        if (!seen.has(rec.name)) {
          seen.add(rec.name);
          recommendations.push(rec);
        }
      }
    }
    
    // 3. Fill with popular icons if needed
    if (recommendations.length < limit) {
      const popular = await getPopularIcons(c.env, source, limit - recommendations.length);
      for (const rec of popular) {
        if (!seen.has(rec.name)) {
          seen.add(rec.name);
          recommendations.push(rec);
        }
      }
    }
    
    // Sort by score descending
    recommendations.sort((a, b) => b.score - a.score);
    
    return jsonResponse(c, {
      data: recommendations.slice(0, limit),
      meta: {
        total: recommendations.length,
        context,
        method: currentIcon ? "similarity" : context ? "contextual" : "popular",
      },
    });
  } catch (error) {
    console.error("[Recommendations] Error:", error);
    return errorResponse(c, "INTERNAL_ERROR", "Failed to get recommendations", 500);
  }
}

/**
 * Get similar icons handler
 * GET /recommendations/similar/:name
 */
export async function similarIconsHandler(c: Context<{ Bindings: Env }>) {
  const iconName = c.req.param("name");
  const source = c.req.query("source") || "lucide";
  const limit = Math.min(parseInt(c.req.query("limit") || "10", 10), 50);
  
  try {
    const similar = await getRelatedIcons(iconName, source, limit);
    
    return jsonResponse(c, {
      data: similar,
      meta: {
        total: similar.length,
        based_on: iconName,
        method: "similarity",
      },
    });
  } catch (error) {
    console.error("[Similar Icons] Error:", error);
    return errorResponse(c, "INTERNAL_ERROR", "Failed to get similar icons", 500);
  }
}

/**
 * Get complementary icons handler
 * GET /recommendations/complementary/:category
 */
export async function complementaryIconsHandler(c: Context<{ Bindings: Env }>) {
  const category = c.req.param("category");
  const source = c.req.query("source") || "lucide";
  const limit = Math.min(parseInt(c.req.query("limit") || "10", 10), 50);
  
  try {
    const complements = CATEGORY_COMPLEMENTS[category] || [];
    const recommendations: Recommendation[] = [];
    
    // Get icons from complementary categories
    // In production, this would query the icon index
    const commonIcons: Record<string, string[]> = {
      "arrows": ["arrow-left", "arrow-right", "arrow-up", "arrow-down", "chevron-left"],
      "menus": ["menu", "more-horizontal", "more-vertical", "grid", "list"],
      "actions": ["edit", "trash", "copy", "move", "refresh"],
      "notifications": ["bell", "mail", "message-circle", "alert"],
      "social": ["share", "heart", "thumbs-up", "message-square"],
      "feedback": ["check", "x", "alert", "info", "help-circle"],
      "controls": ["play", "pause", "stop", "skip", "volume"],
      "devices": ["monitor", "smartphone", "tablet", "laptop"],
      "storage": ["hard-drive", "database", "server", "cloud"],
      "status": ["check-circle", "x-circle", "alert-circle", "clock"],
      "confirmation": ["check", "x", "help-circle", "alert-triangle"],
      "editing": ["edit", "save", "undo", "redo", "cut", "copy"],
    };
    
    for (const comp of complements) {
      const icons = commonIcons[comp] || [];
      for (const name of icons.slice(0, 3)) {
        recommendations.push({
          name,
          source,
          category: comp,
          score: 0.85,
          reason: `complements ${category}`,
          preview_url: `/icons/${source}/${name}`,
        });
      }
    }
    
    return jsonResponse(c, {
      data: recommendations.slice(0, limit),
      meta: {
        total: recommendations.length,
        category,
        method: "complementary",
      },
    });
  } catch (error) {
    console.error("[Complementary Icons] Error:", error);
    return errorResponse(c, "INTERNAL_ERROR", "Failed to get complementary icons", 500);
  }
}

/**
 * Record icon usage for analytics (fire-and-forget)
 * POST /recommendations/track
 */
export async function trackUsageHandler(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json<{ icon: string; source: string; context?: string }>();
    
    if (!body.icon || !body.source) {
      return errorResponse(c, "INVALID_PARAMETER", "Icon and source are required", 400);
    }
    
    // In production, this would write to analytics
    // For now, just acknowledge
    return jsonResponse(c, {
      data: { tracked: true },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[Track Usage] Error:", error);
    return errorResponse(c, "INTERNAL_ERROR", "Failed to track usage", 500);
  }
}
