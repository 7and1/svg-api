import type { Context } from "hono";
import type { Env } from "../env";
import { jsonResponse, errorResponse } from "../utils/response";

export interface Collection {
  id: string;
  name: string;
  description: string;
  icons: CollectionIcon[];
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  ownerId?: string;
}

export interface CollectionIcon {
  name: string;
  source: string;
  size?: number;
  color?: string;
  stroke?: number;
  addedAt: string;
  notes?: string;
}

export interface CreateCollectionRequest {
  name: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface UpdateCollectionRequest {
  name?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
}

export interface AddIconRequest {
  name: string;
  source: string;
  size?: number;
  color?: string;
  stroke?: number;
  notes?: string;
}

const COLLECTION_PREFIX = "collection:";
const USER_COLLECTIONS_PREFIX = "user_collections:";

function generateCollectionId(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.getRandomValues(new Uint8Array(8))
    .map(b => b.toString(36).padStart(2, '0'))
    .join('');
  return `col_${timestamp}_${random}`;
}

async function getCollection(
  kv: KVNamespace,
  collectionId: string,
): Promise<Collection | null> {
  const data = await kv.get<Collection>(`${COLLECTION_PREFIX}${collectionId}`, "json");
  return data;
}

async function saveCollection(
  kv: KVNamespace,
  collection: Collection,
): Promise<void> {
  await kv.put(
    `${COLLECTION_PREFIX}${collection.id}`,
    JSON.stringify(collection),
  );
}

async function getUserCollectionIds(
  kv: KVNamespace,
  userId: string,
): Promise<string[]> {
  const data = await kv.get<string[]>(`${USER_COLLECTIONS_PREFIX}${userId}`, "json");
  return data || [];
}

async function addToUserCollections(
  kv: KVNamespace,
  userId: string,
  collectionId: string,
): Promise<void> {
  const ids = await getUserCollectionIds(kv, userId);
  if (!ids.includes(collectionId)) {
    ids.push(collectionId);
    await kv.put(`${USER_COLLECTIONS_PREFIX}${userId}`, JSON.stringify(ids));
  }
}

async function removeFromUserCollections(
  kv: KVNamespace,
  userId: string,
  collectionId: string,
): Promise<void> {
  const ids = await getUserCollectionIds(kv, userId);
  const filtered = ids.filter((id) => id !== collectionId);
  await kv.put(`${USER_COLLECTIONS_PREFIX}${userId}`, JSON.stringify(filtered));
}

export async function listCollectionsHandler(c: Context<{ Bindings: Env }>) {
  const userId = c.req.header("X-User-Id") || "anonymous";

  try {
    const collectionIds = await getUserCollectionIds(c.env.SVG_API_CACHE, userId);
    const collections: Collection[] = [];

    for (const id of collectionIds) {
      const collection = await getCollection(c.env.SVG_API_CACHE, id);
      if (collection) {
        collections.push(collection);
      }
    }

    return jsonResponse(c, {
      data: collections.map((col) => ({
        id: col.id,
        name: col.name,
        description: col.description,
        iconCount: col.icons.length,
        tags: col.tags,
        isPublic: col.isPublic,
        createdAt: col.createdAt,
        updatedAt: col.updatedAt,
      })),
      meta: {
        total: collections.length,
      },
    });
  } catch (error) {
    console.error("[Collections] List error:", error);
    return errorResponse(c, "INTERNAL_ERROR", "Failed to list collections", 500);
  }
}

export async function getCollectionHandler(c: Context<{ Bindings: Env }>) {
  const collectionId = c.req.param("id");
  const userId = c.req.header("X-User-Id") || "anonymous";

  try {
    const collection = await getCollection(c.env.SVG_API_CACHE, collectionId);

    if (!collection) {
      return errorResponse(c, "COLLECTION_NOT_FOUND", "Collection not found", 404);
    }

    if (!collection.isPublic && collection.ownerId !== userId) {
      return errorResponse(c, "FORBIDDEN", "Access denied", 403);
    }

    return jsonResponse(c, {
      data: collection,
      meta: {
        request_id: c.get("requestId") || "",
      },
    });
  } catch (error) {
    console.error("[Collections] Get error:", error);
    return errorResponse(c, "INTERNAL_ERROR", "Failed to get collection", 500);
  }
}

export async function createCollectionHandler(c: Context<{ Bindings: Env }>) {
  const userId = c.req.header("X-User-Id") || "anonymous";

  try {
    const body = await c.req.json<CreateCollectionRequest>();

    if (!body.name || body.name.trim().length === 0) {
      return errorResponse(c, "INVALID_PARAMETER", "Collection name is required", 400);
    }

    if (body.name.length > 100) {
      return errorResponse(c, "INVALID_PARAMETER", "Collection name too long (max 100 chars)", 400);
    }

    const collectionId = generateCollectionId();
    const now = new Date().toISOString();

    const collection: Collection = {
      id: collectionId,
      name: body.name.trim(),
      description: body.description?.trim() || "",
      icons: [],
      tags: body.tags?.map((t) => t.trim()).filter(Boolean) || [],
      isPublic: body.isPublic ?? false,
      createdAt: now,
      updatedAt: now,
      ownerId: userId,
    };

    await saveCollection(c.env.SVG_API_CACHE, collection);
    await addToUserCollections(c.env.SVG_API_CACHE, userId, collectionId);

    return jsonResponse(c, {
      data: collection,
      meta: {
        request_id: c.get("requestId") || "",
      },
    }, 201);
  } catch (error) {
    console.error("[Collections] Create error:", error);
    return errorResponse(c, "INTERNAL_ERROR", "Failed to create collection", 500);
  }
}

export async function updateCollectionHandler(c: Context<{ Bindings: Env }>) {
  const collectionId = c.req.param("id");
  const userId = c.req.header("X-User-Id") || "anonymous";

  try {
    const collection = await getCollection(c.env.SVG_API_CACHE, collectionId);

    if (!collection) {
      return errorResponse(c, "COLLECTION_NOT_FOUND", "Collection not found", 404);
    }

    if (collection.ownerId !== userId) {
      return errorResponse(c, "FORBIDDEN", "Access denied", 403);
    }

    const body = await c.req.json<UpdateCollectionRequest>();

    if (body.name !== undefined) {
      if (body.name.trim().length === 0) {
        return errorResponse(c, "INVALID_PARAMETER", "Collection name cannot be empty", 400);
      }
      if (body.name.length > 100) {
        return errorResponse(c, "INVALID_PARAMETER", "Collection name too long", 400);
      }
      collection.name = body.name.trim();
    }

    if (body.description !== undefined) {
      collection.description = body.description.trim();
    }

    if (body.tags !== undefined) {
      collection.tags = body.tags.map((t) => t.trim()).filter(Boolean);
    }

    if (body.isPublic !== undefined) {
      collection.isPublic = body.isPublic;
    }

    collection.updatedAt = new Date().toISOString();

    await saveCollection(c.env.SVG_API_CACHE, collection);

    return jsonResponse(c, {
      data: collection,
      meta: {
        request_id: c.get("requestId") || "",
      },
    });
  } catch (error) {
    console.error("[Collections] Update error:", error);
    return errorResponse(c, "INTERNAL_ERROR", "Failed to update collection", 500);
  }
}

export async function deleteCollectionHandler(c: Context<{ Bindings: Env }>) {
  const collectionId = c.req.param("id");
  const userId = c.req.header("X-User-Id") || "anonymous";

  try {
    const collection = await getCollection(c.env.SVG_API_CACHE, collectionId);

    if (!collection) {
      return errorResponse(c, "COLLECTION_NOT_FOUND", "Collection not found", 404);
    }

    if (collection.ownerId !== userId) {
      return errorResponse(c, "FORBIDDEN", "Access denied", 403);
    }

    await c.env.SVG_API_CACHE.delete(`${COLLECTION_PREFIX}${collectionId}`);
    await removeFromUserCollections(c.env.SVG_API_CACHE, userId, collectionId);

    return jsonResponse(c, {
      data: { deleted: true },
      meta: {
        request_id: c.get("requestId") || "",
      },
    });
  } catch (error) {
    console.error("[Collections] Delete error:", error);
    return errorResponse(c, "INTERNAL_ERROR", "Failed to delete collection", 500);
  }
}

export async function addIconToCollectionHandler(c: Context<{ Bindings: Env }>) {
  const collectionId = c.req.param("id");
  const userId = c.req.header("X-User-Id") || "anonymous";

  try {
    const collection = await getCollection(c.env.SVG_API_CACHE, collectionId);

    if (!collection) {
      return errorResponse(c, "COLLECTION_NOT_FOUND", "Collection not found", 404);
    }

    if (collection.ownerId !== userId) {
      return errorResponse(c, "FORBIDDEN", "Access denied", 403);
    }

    const body = await c.req.json<AddIconRequest>();

    if (!body.name || !body.source) {
      return errorResponse(c, "INVALID_PARAMETER", "Icon name and source are required", 400);
    }

    const exists = collection.icons.some(
      (i) => i.name === body.name && i.source === body.source,
    );

    if (exists) {
      return errorResponse(c, "DUPLICATE_ICON", "Icon already in collection", 409);
    }

    if (body.size !== undefined && (body.size < 8 || body.size > 512)) {
      return errorResponse(c, "INVALID_PARAMETER", "Size must be between 8 and 512", 400);
    }

    if (body.stroke !== undefined && (body.stroke < 0.5 || body.stroke > 3)) {
      return errorResponse(c, "INVALID_PARAMETER", "Stroke must be between 0.5 and 3", 400);
    }

    const collectionIcon: CollectionIcon = {
      name: body.name,
      source: body.source,
      size: body.size,
      color: body.color,
      stroke: body.stroke,
      addedAt: new Date().toISOString(),
      notes: body.notes?.trim(),
    };

    collection.icons.push(collectionIcon);
    collection.updatedAt = new Date().toISOString();

    await saveCollection(c.env.SVG_API_CACHE, collection);

    return jsonResponse(c, {
      data: collectionIcon,
      meta: {
        collection_id: collectionId,
        icon_count: collection.icons.length,
      },
    }, 201);
  } catch (error) {
    console.error("[Collections] Add icon error:", error);
    return errorResponse(c, "INTERNAL_ERROR", "Failed to add icon to collection", 500);
  }
}

export async function removeIconFromCollectionHandler(c: Context<{ Bindings: Env }>) {
  const collectionId = c.req.param("id");
  const source = c.req.param("source");
  const name = c.req.param("name");
  const userId = c.req.header("X-User-Id") || "anonymous";

  try {
    const collection = await getCollection(c.env.SVG_API_CACHE, collectionId);

    if (!collection) {
      return errorResponse(c, "COLLECTION_NOT_FOUND", "Collection not found", 404);
    }

    if (collection.ownerId !== userId) {
      return errorResponse(c, "FORBIDDEN", "Access denied", 403);
    }

    const initialLength = collection.icons.length;
    collection.icons = collection.icons.filter(
      (i) => !(i.name === name && i.source === source),
    );

    if (collection.icons.length === initialLength) {
      return errorResponse(c, "ICON_NOT_FOUND", "Icon not found in collection", 404);
    }

    collection.updatedAt = new Date().toISOString();
    await saveCollection(c.env.SVG_API_CACHE, collection);

    return jsonResponse(c, {
      data: { removed: true },
      meta: {
        collection_id: collectionId,
        icon_count: collection.icons.length,
      },
    });
  } catch (error) {
    console.error("[Collections] Remove icon error:", error);
    return errorResponse(c, "INTERNAL_ERROR", "Failed to remove icon from collection", 500);
  }
}

export async function exportCollectionHandler(c: Context<{ Bindings: Env }>) {
  const collectionId = c.req.param("id");
  const format = c.req.query("format") || "json";
  const userId = c.req.header("X-User-Id") || "anonymous";

  try {
    const collection = await getCollection(c.env.SVG_API_CACHE, collectionId);

    if (!collection) {
      return errorResponse(c, "COLLECTION_NOT_FOUND", "Collection not found", 404);
    }

    if (!collection.isPublic && collection.ownerId !== userId) {
      return errorResponse(c, "FORBIDDEN", "Access denied", 403);
    }

    switch (format) {
      case "json":
        return c.json({
          data: collection,
          meta: {
            exported_at: new Date().toISOString(),
            format: "json",
          },
        });

      case "csv": {
        const csvHeader = "name,source,size,color,stroke,added_at,notes\\n";
        const csvRows = collection.icons
          .map((i) =>
            `"${i.name}","${i.source}",${i.size || ""},"${i.color || ""}",${i.stroke || ""},"${i.addedAt}","${i.notes || ""}"`,
          )
          .join("\\n");
        c.header("Content-Type", "text/csv");
        c.header(
          "Content-Disposition",
          `attachment; filename="${collection.name}.csv"`,
        );
        return c.text(csvHeader + csvRows);
      }

      default:
        return errorResponse(c, "INVALID_PARAMETER", "Unsupported export format", 400);
    }
  } catch (error) {
    console.error("[Collections] Export error:", error);
    return errorResponse(c, "INTERNAL_ERROR", "Failed to export collection", 500);
  }
}
