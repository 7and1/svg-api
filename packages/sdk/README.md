# @svg-api/sdk

> TypeScript/JavaScript SDK for SVG API

A production-ready, tree-shakeable SDK for interacting with the SVG API. Works in both Node.js and browser environments with automatic retry logic and exponential backoff.

## Installation

```bash
npm install @svg-api/sdk
# or
pnpm add @svg-api/sdk
# or
yarn add @svg-api/sdk
```

## Quick Start

```typescript
import { SvgApi } from "@svg-api/sdk";

const api = new SvgApi();

// Get an icon
const icon = await api.getIcon("home", { source: "lucide" });
console.log(icon.svg);
// <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"...
```

## API Reference

### Constructor

```typescript
const api = new SvgApi({
  baseUrl: "https://svg-api.org", // API base URL
  version: "v1", // API version
  timeout: 10000, // Request timeout (ms)
  maxRetries: 3, // Maximum retry attempts
  retryDelay: 1000, // Initial retry delay (ms)
  headers: {}, // Custom headers
});
```

### Methods

#### `getIcon(name, options?, requestOptions?)`

Get a single icon by name.

```typescript
const icon = await api.getIcon("home", {
  source: "lucide",
  size: 32,
  color: "#ef4444",
  stroke: 2,
  format: "json", // or 'svg' for raw SVG string
});
```

#### `getBatch(options, requestOptions?)`

Get multiple icons in a single request (up to 50).

```typescript
const result = await api.getBatch({
  icons: [
    { name: "home" },
    { name: "user", source: "lucide", size: 32 },
    { name: "settings", color: "#6366f1" },
  ],
  defaults: {
    source: "lucide",
    size: 24,
  },
});

result.data.forEach((item) => {
  if ("error" in item) {
    console.error(`Failed: ${item.error.message}`);
  } else {
    console.log(item.svg);
  }
});
```

#### `search(options, requestOptions?)`

Search for icons by query.

```typescript
const results = await api.search({
  query: "arrow",
  source: "lucide", // Optional: filter by source
  category: "navigation", // Optional: filter by category
  limit: 50, // Optional: results per page (max 100)
  offset: 0, // Optional: pagination offset
});

console.log(`Found ${results.meta.total} icons`);
results.data.forEach((icon) => {
  console.log(`${icon.name}: ${icon.preview_url}`);
});
```

#### `getSources(requestOptions?)`

Get all available icon sources.

```typescript
const sources = await api.getSources();

sources.data.forEach((source) => {
  console.log(`${source.name}: ${source.iconCount} icons`);
  console.log(`  License: ${source.license.type}`);
});
```

#### `getCategories(source?, requestOptions?)`

Get all available icon categories.

```typescript
// Get all categories
const categories = await api.getCategories();

// Get categories for a specific source
const lucideCategories = await api.getCategories("lucide");
```

#### `getRandomIcon(options?, requestOptions?)`

Get a random icon.

```typescript
const icon = await api.getRandomIcon({
  source: "lucide",
  category: "navigation",
  size: 48,
  color: "#10b981",
});

console.log(`Random icon: ${icon.name}`);
```

#### `iconExists(name, source?)`

Check if an icon exists without throwing an error.

```typescript
const exists = await api.iconExists("home", "lucide");
if (!exists) {
  console.log("Icon not found");
}
```

## Error Handling

The SDK provides typed error classes:

```typescript
import {
  SvgApiError,
  IconNotFoundError,
  InvalidParameterError,
  RateLimitError,
  ServerError,
} from "@svg-api/sdk";

try {
  const icon = await api.getIcon("nonexistent");
} catch (error) {
  if (error instanceof IconNotFoundError) {
    console.log("Icon not found");
  } else if (error instanceof InvalidParameterError) {
    console.log("Invalid parameter:", error.details);
  } else if (error instanceof RateLimitError) {
    console.log("Rate limited. Resets at:", error.resetAt);
  }
}
```

## Browser Usage

The SDK works in browsers without any polyfills:

```typescript
import { SvgApi } from "@svg-api/sdk";

const api = new SvgApi();

// Fetch icon for an img element
const icon = await api.getIcon("home", { source: "lucide" });
document.getElementById("my-icon").src =
  "data:image/svg+xml," + encodeURIComponent(icon.svg);
```

## Node.js Usage

The SDK automatically uses the native `fetch` in Node.js 18+. For older versions, install a fetch polyfill:

```bash
npm install undici
```

```typescript
import { fetch } from "undici";
import { SvgApi } from "@svg-api/sdk";

const api = new SvgApi({ fetch });
```

## React Example

```typescript
import { useEffect, useState } from 'react';
import { SvgApi, IconResponse } from '@svg-api/sdk';

const api = new SvgApi();

function Icon({ name }: { name: string }) {
  const [icon, setIcon] = useState<IconResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getIcon(name, { source: 'lucide' })
      .then(setIcon)
      .catch((e) => setError(e.message));
  }, [name]);

  if (error) return <div>Error: {error}</div>;
  if (!icon) return <div>Loading...</div>;

  return <div dangerouslySetInnerHTML={{ __html: icon.svg }} />;
}
```

## Options Reference

### GetIconOptions

| Option   | Type              | Default          | Description              |
| -------- | ----------------- | ---------------- | ------------------------ |
| `source` | `string`          | `"lucide"`       | Icon source              |
| `size`   | `number`          | `24`             | Icon size (8-512)        |
| `color`  | `string`          | `"currentColor"` | Icon color (hex or name) |
| `stroke` | `number`          | `2`              | Stroke width (0.5-3)     |
| `format` | `"json" \| "svg"` | `"json"`         | Response format          |

### SearchOptions

| Option     | Type     | Default    | Description         |
| ---------- | -------- | ---------- | ------------------- |
| `query`    | `string` | (required) | Search query        |
| `source`   | `string` | -          | Filter by source    |
| `category` | `string` | -          | Filter by category  |
| `limit`    | `number` | `20`       | Max results (1-100) |
| `offset`   | `number` | `0`        | Pagination offset   |

### BatchIconOptions

| Option   | Type     | Default          | Description          |
| -------- | -------- | ---------------- | -------------------- |
| `name`   | `string` | (required)       | Icon name            |
| `source` | `string` | `"lucide"`       | Icon source          |
| `size`   | `number` | `24`             | Icon size (8-512)    |
| `color`  | `string` | `"currentColor"` | Icon color           |
| `stroke` | `number` | `2`              | Stroke width (0.5-3) |

## License

MIT

## Links

- [API Documentation](https://svg-api.org/docs)
- [GitHub Repository](https://github.com/svg-api/svg-api)
