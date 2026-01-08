"use client";

import { useState } from "react";
import clsx from "clsx";
import { CodeBlock } from "../../../components/docs";

const tabs = [
  { id: "html", label: "HTML" },
  { id: "react", label: "React" },
  { id: "vue", label: "Vue" },
  { id: "curl", label: "cURL" },
  { id: "javascript", label: "JavaScript" },
  { id: "python", label: "Python" },
];

const examples = {
  html: {
    basic: `<!-- Basic usage -->
<img src="https://svg-api.org/v1/icons/home?source=lucide" alt="Home" />

<!-- With custom size -->
<img src="https://svg-api.org/v1/icons/settings?source=lucide&size=32" alt="Settings" />

<!-- With custom color (URL-encode # as %23) -->
<img src="https://svg-api.org/v1/icons/heart?source=lucide&color=%23ef4444" alt="Heart" />`,
    navigation: `<nav class="nav">
  <a href="/" class="nav-link">
    <img src="https://svg-api.org/v1/icons/home?source=lucide&size=20" alt="" />
    <span>Home</span>
  </a>
  <a href="/search" class="nav-link">
    <img src="https://svg-api.org/v1/icons/search?source=lucide&size=20" alt="" />
    <span>Search</span>
  </a>
  <a href="/settings" class="nav-link">
    <img src="https://svg-api.org/v1/icons/settings?source=lucide&size=20" alt="" />
    <span>Settings</span>
  </a>
</nav>

<style>
  .nav { display: flex; gap: 1rem; }
  .nav-link { display: flex; align-items: center; gap: 0.5rem; }
  .nav-link img { width: 20px; height: 20px; }
</style>`,
    buttons: `<!-- Icon button -->
<button class="btn">
  <img src="https://svg-api.org/v1/icons/plus?source=lucide&size=16" alt="" />
  Add Item
</button>

<!-- Icon-only button -->
<button class="icon-btn" aria-label="Close">
  <img src="https://svg-api.org/v1/icons/x?source=lucide&size=24" alt="" />
</button>

<!-- Button with loading state -->
<button class="btn" disabled>
  <img src="https://svg-api.org/v1/icons/loader-2?source=lucide&size=16" class="animate-spin" alt="" />
  Loading...
</button>`,
  },
  react: {
    basic: `// Basic usage
function App() {
  return (
    <img
      src="https://svg-api.org/v1/icons/home?source=lucide"
      alt="Home"
    />
  );
}

// Reusable Icon component
interface IconProps {
  name: string;
  source?: string;
  size?: number;
  color?: string;
  className?: string;
}

function Icon({
  name,
  source = "lucide",
  size = 24,
  color,
  className
}: IconProps) {
  const params = new URLSearchParams({
    source,
    size: size.toString(),
    ...(color && { color }),
  });

  return (
    <img
      src={\`https://svg-api.org/v1/icons/\${name}?\${params}\`}
      alt=""
      width={size}
      height={size}
      className={className}
    />
  );
}

// Usage
<Icon name="home" />
<Icon name="heart" color="#ef4444" size={32} />
<Icon name="settings" source="tabler" />`,
    nextjs: `// Next.js with Image optimization
import Image from 'next/image';

interface IconProps {
  name: string;
  source?: string;
  size?: number;
  color?: string;
}

function Icon({ name, source = "lucide", size = 24, color }: IconProps) {
  const params = new URLSearchParams({
    source,
    size: size.toString(),
    ...(color && { color }),
  });

  return (
    <Image
      src={\`https://svg-api.org/v1/icons/\${name}?\${params}\`}
      alt=""
      width={size}
      height={size}
      unoptimized // SVGs don't need optimization
    />
  );
}

// In your component
export default function Header() {
  return (
    <nav className="flex gap-4">
      <Icon name="home" />
      <Icon name="search" />
      <Icon name="user" />
    </nav>
  );
}`,
    hooks: `// Custom hook for icon URL
import { useMemo } from 'react';

interface UseIconOptions {
  source?: string;
  size?: number;
  color?: string;
  stroke?: number;
}

function useIconUrl(name: string, options: UseIconOptions = {}) {
  const { source = "lucide", size = 24, color, stroke } = options;

  return useMemo(() => {
    const params = new URLSearchParams({
      source,
      size: size.toString(),
      ...(color && { color }),
      ...(stroke && { stroke: stroke.toString() }),
    });
    return \`https://svg-api.org/v1/icons/\${name}?\${params}\`;
  }, [name, source, size, color, stroke]);
}

// Usage
function IconButton({ name }: { name: string }) {
  const iconUrl = useIconUrl(name, { size: 20, color: "#3b82f6" });

  return (
    <button>
      <img src={iconUrl} alt="" />
    </button>
  );
}`,
  },
  vue: {
    basic: `<script setup lang="ts">
// Basic usage
</script>

<template>
  <img
    src="https://svg-api.org/v1/icons/home?source=lucide"
    alt="Home"
  />
</template>`,
    component: `<!-- Icon.vue - Reusable component -->
<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  name: string;
  source?: string;
  size?: number;
  color?: string;
}

const props = withDefaults(defineProps<Props>(), {
  source: 'lucide',
  size: 24,
});

const iconUrl = computed(() => {
  const params = new URLSearchParams({
    source: props.source,
    size: props.size.toString(),
    ...(props.color && { color: props.color }),
  });
  return \`https://svg-api.org/v1/icons/\${props.name}?\${params}\`;
});
</script>

<template>
  <img
    :src="iconUrl"
    :width="size"
    :height="size"
    alt=""
  />
</template>

<!-- Usage in parent component -->
<template>
  <Icon name="home" />
  <Icon name="heart" color="#ef4444" :size="32" />
  <Icon name="settings" source="tabler" />
</template>`,
    nuxt: `<!-- Nuxt 3 with auto-imports -->
<script setup lang="ts">
const iconUrl = (name: string, options = {}) => {
  const defaults = { source: 'lucide', size: 24 };
  const params = new URLSearchParams({ ...defaults, ...options });
  return \`https://svg-api.org/v1/icons/\${name}?\${params}\`;
};
</script>

<template>
  <nav class="flex gap-4">
    <NuxtLink to="/">
      <NuxtImg
        :src="iconUrl('home')"
        alt="Home"
        width="24"
        height="24"
      />
    </NuxtLink>
    <NuxtLink to="/search">
      <NuxtImg
        :src="iconUrl('search')"
        alt="Search"
        width="24"
        height="24"
      />
    </NuxtLink>
  </nav>
</template>`,
  },
  curl: {
    basic: `# Get icon as SVG
curl "https://svg-api.org/v1/icons/home?source=lucide"

# Get icon as JSON with metadata
curl -H "Accept: application/json" \\
  "https://svg-api.org/v1/icons/home?source=lucide"

# Save SVG to file
curl "https://svg-api.org/v1/icons/home?source=lucide" > home.svg

# Custom size and color
curl "https://svg-api.org/v1/icons/heart?source=lucide&size=48&color=%23ef4444"`,
    search: `# Search for icons
curl "https://svg-api.org/v1/search?q=arrow"

# Filter by source
curl "https://svg-api.org/v1/search?q=arrow&source=lucide&limit=10"

# Pretty print with jq
curl -s "https://svg-api.org/v1/search?q=home" | jq .`,
    batch: `# Batch fetch multiple icons
curl -X POST "https://svg-api.org/v1/icons/batch" \\
  -H "Content-Type: application/json" \\
  -d '{
    "icons": [
      {"name": "home", "source": "lucide"},
      {"name": "search", "source": "lucide"},
      {"name": "settings", "source": "lucide"}
    ],
    "defaults": {"size": 24}
  }'`,
    metadata: `# List all sources
curl "https://svg-api.org/v1/sources"

# List categories
curl "https://svg-api.org/v1/categories"

# Get random icon
curl "https://svg-api.org/v1/random"

# Random icon from specific source
curl "https://svg-api.org/v1/random?source=lucide"`,
  },
  javascript: {
    basic: `// Fetch icon as SVG text
async function getIcon(name, options = {}) {
  const params = new URLSearchParams({
    source: 'lucide',
    size: '24',
    ...options,
  });

  const response = await fetch(
    \`https://svg-api.org/v1/icons/\${name}?\${params}\`
  );

  return response.text();
}

// Usage
const homeSvg = await getIcon('home');
const heartSvg = await getIcon('heart', { size: '32', color: '#ef4444' });`,
    metadata: `// Fetch icon with metadata
async function getIconWithMeta(name, options = {}) {
  const params = new URLSearchParams({
    source: 'lucide',
    ...options,
  });

  const response = await fetch(
    \`https://svg-api.org/v1/icons/\${name}?\${params}\`,
    {
      headers: { 'Accept': 'application/json' },
    }
  );

  return response.json();
}

// Usage
const { data, meta } = await getIconWithMeta('home');
console.log(data.name);     // "home"
console.log(data.category); // "navigation"
console.log(data.tags);     // ["house", "main", "index"]`,
    search: `// Search icons
async function searchIcons(query, options = {}) {
  const params = new URLSearchParams({
    q: query,
    limit: '20',
    ...options,
  });

  const response = await fetch(
    \`https://svg-api.org/v1/search?\${params}\`
  );

  return response.json();
}

// Usage
const { data, meta } = await searchIcons('arrow', { source: 'lucide' });
console.log(\`Found \${meta.total} icons\`);

for (const icon of data) {
  console.log(\`\${icon.name} (score: \${icon.score})\`);
}`,
    batch: `// Batch fetch icons
async function batchGetIcons(icons, defaults = {}) {
  const response = await fetch(
    'https://svg-api.org/v1/icons/batch',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ icons, defaults }),
    }
  );

  return response.json();
}

// Usage
const result = await batchGetIcons([
  { name: 'home', source: 'lucide' },
  { name: 'search', source: 'lucide' },
  { name: 'settings', source: 'lucide' },
], { size: 24 });

for (const [key, icon] of Object.entries(result.data)) {
  if (icon.success) {
    console.log(\`\${key}: \${icon.svg.slice(0, 50)}...\`);
  }
}`,
  },
  python: {
    basic: `import requests

API_BASE = "https://svg-api.org/v1"

def get_icon(name: str, **options) -> str:
    """Get icon as SVG string."""
    params = {"source": "lucide", "size": 24, **options}
    response = requests.get(f"{API_BASE}/icons/{name}", params=params)
    response.raise_for_status()
    return response.text

def get_icon_json(name: str, **options) -> dict:
    """Get icon with metadata."""
    params = {"source": "lucide", **options}
    response = requests.get(
        f"{API_BASE}/icons/{name}",
        params=params,
        headers={"Accept": "application/json"},
    )
    response.raise_for_status()
    return response.json()

# Usage
svg = get_icon("home")
data = get_icon_json("home")
print(data["data"]["category"])  # "navigation"`,
    search: `def search_icons(query: str, **options) -> dict:
    """Search icons."""
    params = {"q": query, "limit": 20, **options}
    response = requests.get(f"{API_BASE}/search", params=params)
    response.raise_for_status()
    return response.json()

# Usage
result = search_icons("arrow", source="lucide")
print(f"Found {result['meta']['total']} icons")

for icon in result["data"]:
    print(f"{icon['name']} (score: {icon['score']})")`,
    batch: `def batch_get_icons(icons: list, defaults: dict = None) -> dict:
    """Batch fetch multiple icons."""
    response = requests.post(
        f"{API_BASE}/icons/batch",
        json={"icons": icons, "defaults": defaults or {}},
    )
    response.raise_for_status()
    return response.json()

# Usage
result = batch_get_icons([
    {"name": "home", "source": "lucide"},
    {"name": "search", "source": "lucide"},
    {"name": "settings", "source": "lucide"},
], defaults={"size": 24})

for key, icon in result["data"].items():
    if icon["success"]:
        print(f"{key}: OK")

for key, error in result.get("errors", {}).items():
    print(f"{key}: {error['message']}")`,
    download: `import os
from pathlib import Path

def download_icons(icons: list, output_dir: str = "./icons"):
    """Download multiple icons to local files."""
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    for icon in icons:
        svg = get_icon(icon["name"], **icon.get("options", {}))
        filepath = Path(output_dir) / f"{icon['name']}.svg"
        filepath.write_text(svg)
        print(f"Downloaded: {filepath}")

# Usage
download_icons([
    {"name": "home"},
    {"name": "search"},
    {"name": "settings"},
    {"name": "heart", "options": {"color": "#ef4444"}},
])`,
  },
};

export default function ExamplesPage() {
  const [activeTab, setActiveTab] = useState("html");

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate">Guides</p>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">
          Code Examples
        </h1>
        <p className="mt-3 text-slate">
          Ready-to-use examples for integrating SVG API into your projects.
        </p>
      </div>

      <div className="sticky top-16 z-10 -mx-4 bg-sand/90 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition",
                activeTab === tab.id
                  ? "bg-ink text-sand"
                  : "bg-ink/10 text-slate hover:bg-ink/20",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-8">
        {activeTab === "html" && (
          <>
            <section className="space-y-4">
              <h2 className="font-display text-xl font-semibold">
                Basic Usage
              </h2>
              <CodeBlock code={examples.html.basic} language="html" />
            </section>
            <section className="space-y-4">
              <h2 className="font-display text-xl font-semibold">Navigation</h2>
              <CodeBlock code={examples.html.navigation} language="html" />
            </section>
            <section className="space-y-4">
              <h2 className="font-display text-xl font-semibold">Buttons</h2>
              <CodeBlock code={examples.html.buttons} language="html" />
            </section>
          </>
        )}

        {activeTab === "react" && (
          <>
            <section className="space-y-4">
              <h2 className="font-display text-xl font-semibold">
                Reusable Icon Component
              </h2>
              <CodeBlock code={examples.react.basic} language="tsx" />
            </section>
            <section className="space-y-4">
              <h2 className="font-display text-xl font-semibold">
                Next.js Integration
              </h2>
              <CodeBlock code={examples.react.nextjs} language="tsx" />
            </section>
            <section className="space-y-4">
              <h2 className="font-display text-xl font-semibold">
                Custom Hook
              </h2>
              <CodeBlock code={examples.react.hooks} language="tsx" />
            </section>
          </>
        )}

        {activeTab === "vue" && (
          <>
            <section className="space-y-4">
              <h2 className="font-display text-xl font-semibold">
                Basic Usage
              </h2>
              <CodeBlock code={examples.vue.basic} language="vue" />
            </section>
            <section className="space-y-4">
              <h2 className="font-display text-xl font-semibold">
                Reusable Component
              </h2>
              <CodeBlock code={examples.vue.component} language="vue" />
            </section>
            <section className="space-y-4">
              <h2 className="font-display text-xl font-semibold">
                Nuxt 3 Integration
              </h2>
              <CodeBlock code={examples.vue.nuxt} language="vue" />
            </section>
          </>
        )}

        {activeTab === "curl" && (
          <>
            <section className="space-y-4">
              <h2 className="font-display text-xl font-semibold">
                Fetching Icons
              </h2>
              <CodeBlock code={examples.curl.basic} language="bash" />
            </section>
            <section className="space-y-4">
              <h2 className="font-display text-xl font-semibold">Search API</h2>
              <CodeBlock code={examples.curl.search} language="bash" />
            </section>
            <section className="space-y-4">
              <h2 className="font-display text-xl font-semibold">
                Batch Requests
              </h2>
              <CodeBlock code={examples.curl.batch} language="bash" />
            </section>
            <section className="space-y-4">
              <h2 className="font-display text-xl font-semibold">
                Metadata Endpoints
              </h2>
              <CodeBlock code={examples.curl.metadata} language="bash" />
            </section>
          </>
        )}

        {activeTab === "javascript" && (
          <>
            <section className="space-y-4">
              <h2 className="font-display text-xl font-semibold">
                Basic Fetch
              </h2>
              <CodeBlock
                code={examples.javascript.basic}
                language="javascript"
              />
            </section>
            <section className="space-y-4">
              <h2 className="font-display text-xl font-semibold">
                With Metadata
              </h2>
              <CodeBlock
                code={examples.javascript.metadata}
                language="javascript"
              />
            </section>
            <section className="space-y-4">
              <h2 className="font-display text-xl font-semibold">
                Search Icons
              </h2>
              <CodeBlock
                code={examples.javascript.search}
                language="javascript"
              />
            </section>
            <section className="space-y-4">
              <h2 className="font-display text-xl font-semibold">
                Batch Requests
              </h2>
              <CodeBlock
                code={examples.javascript.batch}
                language="javascript"
              />
            </section>
          </>
        )}

        {activeTab === "python" && (
          <>
            <section className="space-y-4">
              <h2 className="font-display text-xl font-semibold">
                Basic Usage
              </h2>
              <CodeBlock code={examples.python.basic} language="python" />
            </section>
            <section className="space-y-4">
              <h2 className="font-display text-xl font-semibold">
                Search Icons
              </h2>
              <CodeBlock code={examples.python.search} language="python" />
            </section>
            <section className="space-y-4">
              <h2 className="font-display text-xl font-semibold">
                Batch Requests
              </h2>
              <CodeBlock code={examples.python.batch} language="python" />
            </section>
            <section className="space-y-4">
              <h2 className="font-display text-xl font-semibold">
                Download Icons
              </h2>
              <CodeBlock code={examples.python.download} language="python" />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
