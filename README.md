# svg-api

Production-ready SVG icon API and frontend.

## Quick start

```bash
pnpm install
pnpm --filter @svg-api/icons build
```

### Run the worker locally

```bash
pnpm --filter @svg-api/worker dev
```

> Optionally set `LOCAL_INDEX_JSON` and `LOCAL_ICONS_BASE_URL` in `apps/worker/wrangler.toml` to use the locally built icon index and icon files.

### Run the web app locally

```bash
pnpm --filter @svg-api/web dev
```

Set `NEXT_PUBLIC_API_BASE` to your worker endpoint (e.g. `http://localhost:8787/v1`).

## Icon pipeline

```bash
pnpm --filter @svg-api/icons build
pnpm --filter @svg-api/icons upload
```

Upload requires the Cloudflare + R2 credentials listed in `.env.example`.

## Workflows

- **build-icons**: weekly icon build + upload
- **deploy-worker**: deploys the Cloudflare Worker
- **deploy-web**: builds and deploys the static Next.js site to Cloudflare Pages
- **preview**: PR previews on Cloudflare Pages
