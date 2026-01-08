import type { Metadata } from "next";
import {
  CodeBlock,
  ParamTable,
  EndpointCard,
  ResponseExample,
} from "../../../components/docs";
import { ScalarViewer } from "../../../components/docs/ScalarViewer";

export const metadata: Metadata = {
  title: "API Reference",
  description:
    "Complete API reference for SVG API. Learn about all endpoints, parameters, and response formats.",
};

const iconParams = [
  {
    name: "name",
    type: "string",
    required: true,
    description: "Icon name (e.g., home, arrow-right)",
  },
  {
    name: "source",
    type: "string",
    default: "lucide",
    description:
      "Icon source library (lucide, tabler, heroicons, phosphor, etc.)",
  },
  {
    name: "size",
    type: "integer",
    default: "24",
    description: "Icon size in pixels (8-512)",
  },
  {
    name: "color",
    type: "string",
    default: "currentColor",
    description: "Color as hex (#ff0000) or named color. URL-encode # as %23",
  },
  {
    name: "stroke",
    type: "number",
    default: "2",
    description: "Stroke width (0.5-3)",
  },
];

const searchParams = [
  {
    name: "q",
    type: "string",
    required: true,
    description: "Search query (minimum 2 characters)",
  },
  {
    name: "source",
    type: "string",
    description: "Filter by icon source",
  },
  {
    name: "category",
    type: "string",
    description: "Filter by category",
  },
  {
    name: "limit",
    type: "integer",
    default: "20",
    description: "Results per page (1-100)",
  },
  {
    name: "offset",
    type: "integer",
    default: "0",
    description: "Pagination offset",
  },
];

export default function ApiPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate">
          API Reference
        </p>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">
          API Reference
        </h1>
        <p className="mt-3 text-slate">
          Complete documentation for all SVG API endpoints.
        </p>
      </div>

      {/* Interactive Scalar API Documentation */}
      <section className="overflow-hidden rounded-3xl border border-black/10 bg-white/80">
        <div className="border-b border-black/10 px-6 py-4">
          <h2 className="font-display text-xl font-semibold">
            Interactive API Explorer
          </h2>
          <p className="mt-1 text-sm text-slate">
            Try out the API directly from your browser. Click on any endpoint to
            see parameters and send requests.
          </p>
        </div>
        <div className="scalar-wrapper">
          <ScalarViewer />
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white/80 p-6">
        <h2 className="font-display text-xl font-semibold">Base URL</h2>
        <div className="mt-4">
          <CodeBlock code="https://svg-api.org/v1" language="bash" />
        </div>
        <div className="mt-4 text-sm text-slate">
          <p>All endpoints are available without authentication.</p>
          <p className="mt-2">
            Response format defaults to SVG. Add{" "}
            <code className="rounded bg-ink/10 px-1">
              Accept: application/json
            </code>{" "}
            header for JSON responses with metadata.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white/80 p-6">
        <h2 className="font-display text-xl font-semibold">Rate Limits</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left">
                <th className="pb-3 font-semibold">Tier</th>
                <th className="pb-3 font-semibold">Requests/min</th>
                <th className="pb-3 font-semibold">Requests/day</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              <tr>
                <td className="py-3">Anonymous</td>
                <td className="py-3">60</td>
                <td className="py-3">1,000</td>
              </tr>
              <tr>
                <td className="py-3">Registered</td>
                <td className="py-3">300</td>
                <td className="py-3">10,000</td>
              </tr>
              <tr>
                <td className="py-3">Pro</td>
                <td className="py-3">1,000</td>
                <td className="py-3">100,000</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-slate">
          Rate limit headers are included in all responses:{" "}
          <code className="rounded bg-ink/10 px-1">X-RateLimit-Limit</code>,{" "}
          <code className="rounded bg-ink/10 px-1">X-RateLimit-Remaining</code>,{" "}
          <code className="rounded bg-ink/10 px-1">X-RateLimit-Reset</code>
        </p>
      </section>

      <div className="space-y-6">
        <h2
          id="get-icon"
          className="scroll-mt-24 font-display text-2xl font-semibold"
        >
          Endpoints
        </h2>

        <EndpointCard
          method="GET"
          path="/v1/icons/{name}"
          description="Retrieve a single icon by name. Returns SVG by default, or JSON with metadata when requested."
        >
          <ParamTable params={iconParams} title="Parameters" />

          <CodeBlock
            code={`# Get SVG directly
curl "https://svg-api.org/v1/icons/home?source=lucide"

# Get JSON with metadata
curl -H "Accept: application/json" \\
  "https://svg-api.org/v1/icons/home?source=lucide"

# Custom size and color
curl "https://svg-api.org/v1/icons/heart?source=lucide&size=32&color=%23ef4444"`}
            language="bash"
          />

          <ResponseExample
            title="Response"
            responses={[
              {
                label: "SVG",
                language: "html",
                code: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
  <polyline points="9 22 9 12 15 12 15 22"/>
</svg>`,
              },
              {
                label: "JSON",
                language: "json",
                code: `{
  "data": {
    "name": "home",
    "source": "lucide",
    "category": "navigation",
    "tags": ["house", "main", "index"],
    "svg": "<svg>...</svg>",
    "variants": ["outline"],
    "license": {
      "type": "ISC",
      "url": "https://github.com/lucide-icons/lucide/blob/main/LICENSE"
    }
  },
  "meta": {
    "request_id": "req_abc123",
    "cached": true
  }
}`,
              },
            ]}
          />
        </EndpointCard>

        <EndpointCard
          id="search"
          method="GET"
          path="/v1/search"
          description="Full-text search across all icons with relevance scoring."
        >
          <ParamTable params={searchParams} title="Parameters" />

          <CodeBlock
            code={`# Search for arrow icons
curl "https://svg-api.org/v1/search?q=arrow"

# Filter by source
curl "https://svg-api.org/v1/search?q=arrow&source=lucide&limit=10"

# Filter by category
curl "https://svg-api.org/v1/search?q=mail&category=communication"`}
            language="bash"
          />

          <ResponseExample
            title="Response"
            responses={[
              {
                label: "JSON",
                language: "json",
                code: `{
  "data": [
    {
      "name": "arrow-right",
      "source": "lucide",
      "category": "arrows",
      "score": 0.95,
      "preview_url": "https://svg-api.org/v1/icons/arrow-right?source=lucide"
    },
    {
      "name": "arrow-left",
      "source": "lucide",
      "category": "arrows",
      "score": 0.93,
      "preview_url": "https://svg-api.org/v1/icons/arrow-left?source=lucide"
    }
  ],
  "meta": {
    "query": "arrow",
    "total": 156,
    "limit": 20,
    "offset": 0,
    "has_more": true,
    "search_time_ms": 12
  }
}`,
              },
            ]}
          />
        </EndpointCard>

        <EndpointCard
          id="batch"
          method="POST"
          path="/v1/icons/batch"
          description="Fetch multiple icons in a single request. Maximum 50 icons per request."
        >
          <CodeBlock
            code={`curl -X POST "https://svg-api.org/v1/icons/batch" \\
  -H "Content-Type: application/json" \\
  -d '{
    "icons": [
      {"name": "home", "source": "lucide"},
      {"name": "search", "source": "lucide", "size": 32},
      {"name": "user", "source": "tabler", "color": "#3b82f6"}
    ],
    "defaults": {
      "size": 24,
      "stroke": 2
    }
  }'`}
            language="bash"
          />

          <ResponseExample
            title="Response"
            responses={[
              {
                label: "JSON",
                language: "json",
                code: `{
  "data": {
    "home:lucide": {
      "success": true,
      "name": "home",
      "source": "lucide",
      "svg": "<svg>...</svg>",
      "category": "navigation"
    },
    "search:lucide": {
      "success": true,
      "name": "search",
      "source": "lucide",
      "svg": "<svg>...</svg>",
      "category": "general"
    },
    "user:tabler": {
      "success": true,
      "name": "user",
      "source": "tabler",
      "svg": "<svg>...</svg>",
      "category": "users"
    }
  },
  "errors": {},
  "meta": {
    "requested": 3,
    "successful": 3,
    "failed": 0
  }
}`,
              },
            ]}
          />
        </EndpointCard>

        <EndpointCard
          id="sources"
          method="GET"
          path="/v1/sources"
          description="List all available icon sources with metadata."
        >
          <CodeBlock
            code='curl "https://svg-api.org/v1/sources"'
            language="bash"
          />

          <ResponseExample
            title="Response"
            responses={[
              {
                label: "JSON",
                language: "json",
                code: `{
  "data": [
    {
      "id": "lucide",
      "name": "Lucide",
      "description": "Beautiful & consistent icon toolkit",
      "version": "0.303.0",
      "icon_count": 1420,
      "website": "https://lucide.dev",
      "license": {
        "type": "ISC",
        "url": "https://github.com/lucide-icons/lucide/blob/main/LICENSE"
      },
      "variants": ["default"],
      "categories": ["arrows", "devices", "files", "shapes"]
    },
    {
      "id": "tabler",
      "name": "Tabler Icons",
      "description": "5000+ free and open source icons",
      "version": "2.47.0",
      "icon_count": 5000,
      "website": "https://tabler.io/icons",
      "license": {
        "type": "MIT",
        "url": "https://github.com/tabler/tabler-icons/blob/main/LICENSE"
      }
    }
  ],
  "meta": {
    "total_sources": 7,
    "total_icons": 22000
  }
}`,
              },
            ]}
          />
        </EndpointCard>

        <EndpointCard
          id="categories"
          method="GET"
          path="/v1/categories"
          description="List all icon categories with counts."
        >
          <ParamTable
            params={[
              {
                name: "source",
                type: "string",
                description: "Filter categories by icon source",
              },
            ]}
            title="Parameters"
          />

          <CodeBlock
            code={`# Get all categories
curl "https://svg-api.org/v1/categories"

# Filter by source
curl "https://svg-api.org/v1/categories?source=lucide"`}
            language="bash"
          />

          <ResponseExample
            title="Response"
            responses={[
              {
                label: "JSON",
                language: "json",
                code: `{
  "data": [
    {
      "id": "navigation",
      "name": "Navigation",
      "description": "Arrows, menus, and navigation elements",
      "icon_count": 342,
      "sources": ["lucide", "tabler", "heroicons"]
    },
    {
      "id": "communication",
      "name": "Communication",
      "description": "Email, chat, and messaging icons",
      "icon_count": 156,
      "sources": ["lucide", "tabler"]
    }
  ],
  "meta": {
    "total_categories": 24
  }
}`,
              },
            ]}
          />
        </EndpointCard>

        <EndpointCard
          id="random"
          method="GET"
          path="/v1/random"
          description="Get a random icon. Useful for testing or inspiration."
        >
          <ParamTable
            params={[
              {
                name: "source",
                type: "string",
                description: "Limit to specific source",
              },
              {
                name: "category",
                type: "string",
                description: "Limit to specific category",
              },
            ]}
            title="Parameters"
          />

          <CodeBlock
            code={`# Get random icon
curl "https://svg-api.org/v1/random"

# Random icon from specific source
curl "https://svg-api.org/v1/random?source=lucide"

# Random icon from category
curl "https://svg-api.org/v1/random?category=navigation"`}
            language="bash"
          />

          <ResponseExample
            title="Response"
            responses={[
              {
                label: "JSON",
                language: "json",
                code: `{
  "data": {
    "name": "sparkles",
    "source": "lucide",
    "category": "effects",
    "tags": ["magic", "stars", "shine"],
    "svg": "<svg>...</svg>",
    "preview_url": "https://svg-api.org/v1/icons/sparkles?source=lucide"
  },
  "meta": {
    "request_id": "req_abc123"
  }
}`,
              },
            ]}
          />
        </EndpointCard>
      </div>

      <section className="rounded-3xl border border-black/10 bg-white/80 p-6">
        <h2 className="font-display text-xl font-semibold">Error Handling</h2>
        <p className="mt-3 text-sm text-slate">
          All errors return a consistent JSON structure:
        </p>
        <div className="mt-4">
          <CodeBlock
            code={`{
  "error": {
    "code": "ICON_NOT_FOUND",
    "message": "Icon 'nonexistent' not found in source 'lucide'",
    "details": {
      "icon": "nonexistent",
      "source": "lucide",
      "suggestions": ["search", "magnifying-glass"]
    }
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2024-01-07T12:00:00Z"
  }
}`}
            language="json"
          />
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left">
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Code</th>
                <th className="pb-3 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              <tr>
                <td className="py-3">400</td>
                <td className="py-3">
                  <code className="text-xs">INVALID_PARAMETER</code>
                </td>
                <td className="py-3 text-slate">Invalid query parameter</td>
              </tr>
              <tr>
                <td className="py-3">404</td>
                <td className="py-3">
                  <code className="text-xs">ICON_NOT_FOUND</code>
                </td>
                <td className="py-3 text-slate">Icon does not exist</td>
              </tr>
              <tr>
                <td className="py-3">404</td>
                <td className="py-3">
                  <code className="text-xs">SOURCE_NOT_FOUND</code>
                </td>
                <td className="py-3 text-slate">Icon source does not exist</td>
              </tr>
              <tr>
                <td className="py-3">429</td>
                <td className="py-3">
                  <code className="text-xs">RATE_LIMITED</code>
                </td>
                <td className="py-3 text-slate">Too many requests</td>
              </tr>
              <tr>
                <td className="py-3">500</td>
                <td className="py-3">
                  <code className="text-xs">INTERNAL_ERROR</code>
                </td>
                <td className="py-3 text-slate">Unexpected server error</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white/80 p-6">
        <h2 className="font-display text-xl font-semibold">Caching</h2>
        <p className="mt-3 text-sm text-slate">
          All responses include appropriate cache headers:
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left">
                <th className="pb-3 font-semibold">Endpoint</th>
                <th className="pb-3 font-semibold">Cache-Control</th>
                <th className="pb-3 font-semibold">TTL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              <tr>
                <td className="py-3">/icons/*</td>
                <td className="py-3">
                  <code className="text-xs">public, max-age=86400</code>
                </td>
                <td className="py-3 text-slate">24 hours</td>
              </tr>
              <tr>
                <td className="py-3">/search</td>
                <td className="py-3">
                  <code className="text-xs">public, max-age=300</code>
                </td>
                <td className="py-3 text-slate">5 minutes</td>
              </tr>
              <tr>
                <td className="py-3">/sources</td>
                <td className="py-3">
                  <code className="text-xs">public, max-age=3600</code>
                </td>
                <td className="py-3 text-slate">1 hour</td>
              </tr>
              <tr>
                <td className="py-3">/random</td>
                <td className="py-3">
                  <code className="text-xs">no-cache</code>
                </td>
                <td className="py-3 text-slate">None</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-slate">
          ETags are supported for conditional requests. Use{" "}
          <code className="rounded bg-ink/10 px-1">If-None-Match</code> header
          to check for changes.
        </p>
      </section>
    </div>
  );
}
