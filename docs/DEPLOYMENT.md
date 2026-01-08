# SVG-API Deployment Guide

Comprehensive CI/CD and infrastructure documentation for svg-api.org.

## Table of Contents

- [Infrastructure Overview](#infrastructure-overview)
- [Repository Structure](#repository-structure)
- [GitHub Actions Workflows](#github-actions-workflows)
- [Environment Configuration](#environment-configuration)
- [Deployment Commands](#deployment-commands)
- [Domain Setup](#domain-setup)
- [Rollback Procedures](#rollback-procedures)
- [Monitoring and Alerts](#monitoring-and-alerts)

---

## Infrastructure Overview

```
                           svg-api.org Architecture

+-----------------------------------------------------------------------------------+
|                              Cloudflare Network                                    |
|                                                                                   |
|  +----------------------------------+  +--------------------------------------+   |
|  |         Cloudflare Pages         |  |         Cloudflare Workers           |   |
|  |                                  |  |                                      |   |
|  |  +----------------------------+  |  |  +--------------------------------+  |   |
|  |  |   Next.js Frontend         |  |  |  |   API Worker                   |  |   |
|  |  |   (Static Export)          |  |  |  |   - Icon search                |  |   |
|  |  |   - Landing page           |  |  |  |   - SVG retrieval              |  |   |
|  |  |   - Documentation          |  |  |  |   - Metadata endpoints         |  |   |
|  |  |   - Interactive demo       |  |  |  +--------------------------------+  |   |
|  |  +----------------------------+  |  |                 |                    |   |
|  |              |                   |  |                 v                    |   |
|  |              v                   |  |  +--------------------------------+  |   |
|  |       svg-api.org               |  |  |   Bindings                      |  |   |
|  +----------------------------------+  |  |   - KV: Icon index/metadata    |  |   |
|                                        |  |   - R2: SVG file storage       |  |   |
|                                        |  +--------------------------------+  |   |
|                                        |                 |                    |   |
|                                        |                 v                    |   |
|                                        |         api.svg-api.org             |   |
|                                        +--------------------------------------+   |
|                                                                                   |
|  +----------------------------------+  +--------------------------------------+   |
|  |         Cloudflare KV            |  |         Cloudflare R2                |   |
|  |                                  |  |                                      |   |
|  |  - Inverted search index        |  |  - Original SVG files                |   |
|  |  - Icon metadata cache          |  |  - Optimized SVG variants            |   |
|  |  - Pack information             |  |  - Icon pack archives                |   |
|  +----------------------------------+  +--------------------------------------+   |
+-----------------------------------------------------------------------------------+

Data Flow:
1. User request -> Cloudflare Edge -> Worker
2. Worker queries KV for search/metadata
3. Worker fetches SVG from R2
4. Response cached at edge
```

### Component Responsibilities

| Component      | Purpose                            | Technology         |
| -------------- | ---------------------------------- | ------------------ |
| Worker (API)   | Icon search, SVG serving, REST API | Cloudflare Workers |
| Web (Frontend) | Documentation, demo, landing       | Next.js on Pages   |
| KV             | Search index, metadata cache       | Cloudflare KV      |
| R2             | SVG file storage                   | Cloudflare R2      |

---

## Repository Structure

```
svg-api/
├── .github/
│   └── workflows/
│       ├── build-icons.yml       # Icon pack builder (weekly)
│       ├── deploy-worker.yml     # API deployment
│       ├── deploy-web.yml        # Frontend deployment
│       └── preview.yml           # PR preview environments
├── apps/
│   ├── worker/                   # Cloudflare Worker (API)
│   │   ├── src/
│   │   │   ├── index.ts          # Entry point
│   │   │   ├── routes/           # API route handlers
│   │   │   ├── search/           # Search engine
│   │   │   └── utils/            # Helpers
│   │   ├── wrangler.toml         # Worker configuration
│   │   └── package.json
│   └── web/                      # Next.js frontend
│       ├── src/
│       │   ├── app/              # App router pages
│       │   ├── components/       # UI components
│       │   └── lib/              # Utilities
│       ├── next.config.js
│       └── package.json
├── packages/
│   ├── icons-builder/            # Icon download & index builder
│   │   ├── src/
│   │   │   ├── download.ts       # Download icon packs
│   │   │   ├── index-builder.ts  # Build inverted index
│   │   │   ├── optimizer.ts      # SVG optimization
│   │   │   └── upload.ts         # R2/KV upload
│   │   └── package.json
│   └── shared/                   # Shared types & utilities
│       ├── src/
│       │   ├── types.ts          # TypeScript definitions
│       │   └── constants.ts      # Shared constants
│       └── package.json
├── scripts/
│   ├── deploy.sh                 # Deployment helper
│   └── setup-secrets.sh          # Secret configuration
├── .env.example                  # Environment template
├── package.json                  # Root package.json
├── pnpm-workspace.yaml           # Workspace config
├── turbo.json                    # Turborepo config
└── DEPLOYMENT.md                 # This file
```

---

## GitHub Actions Workflows

### 1. Build Icons (`build-icons.yml`)

Downloads icon packs, builds search index, uploads to R2/KV.

**Location**: `.github/workflows/build-icons.yml`

```yaml
name: Build Icons

on:
  schedule:
    # Run weekly on Sunday at 00:00 UTC
    - cron: "0 0 * * 0"
  workflow_dispatch:
    inputs:
      packs:
        description: 'Icon packs to build (comma-separated, or "all")'
        required: false
        default: "all"
      force_rebuild:
        description: "Force rebuild even if no changes"
        required: false
        type: boolean
        default: false

env:
  NODE_VERSION: "20"
  PNPM_VERSION: "9"

jobs:
  check-updates:
    name: Check for Updates
    runs-on: ubuntu-latest
    outputs:
      has_updates: ${{ steps.check.outputs.has_updates }}
      packs_to_build: ${{ steps.check.outputs.packs_to_build }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Check for icon pack updates
        id: check
        env:
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CF_KV_NAMESPACE_ID: ${{ secrets.CF_KV_NAMESPACE_ID }}
        run: |
          if [ "${{ github.event.inputs.force_rebuild }}" == "true" ]; then
            echo "has_updates=true" >> $GITHUB_OUTPUT
            echo "packs_to_build=${{ github.event.inputs.packs || 'all' }}" >> $GITHUB_OUTPUT
          else
            pnpm --filter icons-builder check-updates
          fi

  build:
    name: Build Icon Pack
    needs: check-updates
    if: needs.check-updates.outputs.has_updates == 'true'
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        pack:
          - lucide
          - heroicons
          - feather
          - simple-icons
          - material-design
          - phosphor
          - tabler
          - bootstrap
          - fontawesome-free
          - ionicons
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Download icon pack
        run: pnpm --filter icons-builder download -- --pack ${{ matrix.pack }}

      - name: Optimize SVGs
        run: pnpm --filter icons-builder optimize -- --pack ${{ matrix.pack }}

      - name: Build index
        run: pnpm --filter icons-builder build-index -- --pack ${{ matrix.pack }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: icons-${{ matrix.pack }}
          path: |
            packages/icons-builder/dist/${{ matrix.pack }}/
          retention-days: 1

  upload:
    name: Upload to Cloudflare
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Download all artifacts
        uses: actions/download-artifact@v4
        with:
          path: packages/icons-builder/dist/
          pattern: icons-*
          merge-multiple: true

      - name: Upload SVGs to R2
        env:
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CF_R2_BUCKET_NAME: ${{ secrets.CF_R2_BUCKET_NAME }}
        run: pnpm --filter icons-builder upload-r2

      - name: Upload index to KV
        env:
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CF_KV_NAMESPACE_ID: ${{ secrets.CF_KV_NAMESPACE_ID }}
        run: pnpm --filter icons-builder upload-kv

      - name: Purge CDN cache
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ZONE_ID: ${{ secrets.CLOUDFLARE_ZONE_ID }}
        run: |
          curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
            -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
            -H "Content-Type: application/json" \
            --data '{"purge_everything":true}'

      - name: Update build metadata
        env:
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CF_KV_NAMESPACE_ID: ${{ secrets.CF_KV_NAMESPACE_ID }}
        run: |
          pnpm --filter icons-builder update-metadata -- \
            --version "${{ github.sha }}" \
            --timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

---

### 2. Deploy Worker (`deploy-worker.yml`)

Deploys the API Worker to Cloudflare.

**Location**: `.github/workflows/deploy-worker.yml`

```yaml
name: Deploy Worker

on:
  push:
    branches:
      - main
    paths:
      - "apps/worker/**"
      - "packages/shared/**"
      - "pnpm-lock.yaml"
  workflow_dispatch:
    inputs:
      environment:
        description: "Deployment environment"
        required: true
        default: "production"
        type: choice
        options:
          - production
          - staging

env:
  NODE_VERSION: "20"
  PNPM_VERSION: "9"

concurrency:
  group: deploy-worker-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm --filter worker type-check

      - name: Lint
        run: pnpm --filter worker lint

      - name: Run unit tests
        run: pnpm --filter worker test

      - name: Run integration tests
        env:
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: pnpm --filter worker test:integration

  deploy-staging:
    name: Deploy to Staging
    needs: test
    if: github.event.inputs.environment != 'production'
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging-api.svg-api.org
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build worker
        run: pnpm --filter worker build

      - name: Deploy to staging
        env:
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: |
          cd apps/worker
          npx wrangler deploy --env staging

      - name: Smoke test
        run: |
          sleep 10
          curl -f https://staging-api.svg-api.org/health || exit 1
          curl -f "https://staging-api.svg-api.org/v1/search?q=arrow" || exit 1

  deploy-production:
    name: Deploy to Production
    needs: [test, deploy-staging]
    if: always() && needs.test.result == 'success' && (needs.deploy-staging.result == 'success' || needs.deploy-staging.result == 'skipped')
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://api.svg-api.org
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build worker
        run: pnpm --filter worker build

      - name: Deploy to production
        env:
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: |
          cd apps/worker
          npx wrangler deploy

      - name: Smoke test
        run: |
          sleep 10
          curl -f https://api.svg-api.org/health || exit 1
          curl -f "https://api.svg-api.org/v1/search?q=arrow" || exit 1

      - name: Notify on failure
        if: failure()
        uses: slackapi/slack-github-action@v1.25.0
        with:
          payload: |
            {
              "text": "Worker deployment failed",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Worker Deployment Failed*\nCommit: ${{ github.sha }}\nActor: ${{ github.actor }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

### 3. Deploy Web (`deploy-web.yml`)

Deploys the Next.js frontend to Cloudflare Pages.

**Location**: `.github/workflows/deploy-web.yml`

```yaml
name: Deploy Web

on:
  push:
    branches:
      - main
    paths:
      - "apps/web/**"
      - "packages/shared/**"
      - "pnpm-lock.yaml"
  workflow_dispatch:
    inputs:
      environment:
        description: "Deployment environment"
        required: true
        default: "production"
        type: choice
        options:
          - production
          - staging

env:
  NODE_VERSION: "20"
  PNPM_VERSION: "9"

concurrency:
  group: deploy-web-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build:
    name: Build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm --filter web type-check

      - name: Lint
        run: pnpm --filter web lint

      - name: Build
        env:
          NEXT_PUBLIC_API_URL: ${{ github.event.inputs.environment == 'staging' && 'https://staging-api.svg-api.org' || 'https://api.svg-api.org' }}
        run: pnpm --filter web build

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: web-build
          path: apps/web/out
          retention-days: 1

  deploy-staging:
    name: Deploy to Staging
    needs: build
    if: github.event.inputs.environment != 'production'
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.svg-api.org
    steps:
      - name: Download build artifact
        uses: actions/download-artifact@v4
        with:
          name: web-build
          path: out

      - name: Deploy to Cloudflare Pages (Staging)
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy out --project-name=svg-api-web --branch=staging

  deploy-production:
    name: Deploy to Production
    needs: [build, deploy-staging]
    if: always() && needs.build.result == 'success' && (needs.deploy-staging.result == 'success' || needs.deploy-staging.result == 'skipped')
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://svg-api.org
    steps:
      - name: Download build artifact
        uses: actions/download-artifact@v4
        with:
          name: web-build
          path: out

      - name: Deploy to Cloudflare Pages (Production)
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy out --project-name=svg-api-web --branch=main

      - name: Notify on failure
        if: failure()
        uses: slackapi/slack-github-action@v1.25.0
        with:
          payload: |
            {
              "text": "Web deployment failed",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Web Deployment Failed*\nCommit: ${{ github.sha }}\nActor: ${{ github.actor }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

### 4. Preview Environments (`preview.yml`)

Creates preview deployments for pull requests.

**Location**: `.github/workflows/preview.yml`

```yaml
name: Preview

on:
  pull_request:
    types: [opened, synchronize, reopened]

env:
  NODE_VERSION: "20"
  PNPM_VERSION: "9"

concurrency:
  group: preview-${{ github.head_ref }}
  cancel-in-progress: true

jobs:
  detect-changes:
    name: Detect Changes
    runs-on: ubuntu-latest
    outputs:
      worker: ${{ steps.filter.outputs.worker }}
      web: ${{ steps.filter.outputs.web }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Filter paths
        uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            worker:
              - 'apps/worker/**'
              - 'packages/shared/**'
            web:
              - 'apps/web/**'
              - 'packages/shared/**'

  preview-worker:
    name: Preview Worker
    needs: detect-changes
    if: needs.detect-changes.outputs.worker == 'true'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm --filter worker type-check

      - name: Lint
        run: pnpm --filter worker lint

      - name: Run tests
        run: pnpm --filter worker test

      - name: Build worker
        run: pnpm --filter worker build

      - name: Deploy preview
        id: deploy
        env:
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: |
          cd apps/worker
          PREVIEW_URL=$(npx wrangler deploy --env preview --var PREVIEW_ID:pr-${{ github.event.pull_request.number }} 2>&1 | grep -oP 'https://[^\s]+\.workers\.dev')
          echo "url=$PREVIEW_URL" >> $GITHUB_OUTPUT

      - name: Comment preview URL
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Worker Preview Deployed\n\nPreview URL: ${{ steps.deploy.outputs.url }}\n\nTest endpoints:\n- Health: ${{ steps.deploy.outputs.url }}/health\n- Search: ${{ steps.deploy.outputs.url }}/v1/search?q=arrow`
            })

  preview-web:
    name: Preview Web
    needs: detect-changes
    if: needs.detect-changes.outputs.web == 'true'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm --filter web type-check

      - name: Lint
        run: pnpm --filter web lint

      - name: Build
        env:
          NEXT_PUBLIC_API_URL: https://staging-api.svg-api.org
        run: pnpm --filter web build

      - name: Deploy preview
        id: deploy
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy apps/web/out --project-name=svg-api-web --branch=pr-${{ github.event.pull_request.number }}

      - name: Comment preview URL
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Web Preview Deployed\n\nPreview URL: https://pr-${{ github.event.pull_request.number }}.svg-api-web.pages.dev`
            })

  cleanup-preview:
    name: Cleanup Preview
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - name: Delete worker preview
        env:
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: |
          # Worker previews are automatically cleaned up after 24 hours
          echo "Worker preview will be automatically cleaned up"

      - name: Delete pages preview
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deployment delete svg-api-web pr-${{ github.event.pull_request.number }} --yes
        continue-on-error: true
```

---

## Environment Configuration

### Required GitHub Secrets

| Secret                  | Description                                    | How to Obtain                         |
| ----------------------- | ---------------------------------------------- | ------------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account identifier                  | Dashboard > Account Home > Account ID |
| `CLOUDFLARE_API_TOKEN`  | API token with Workers/Pages/R2/KV permissions | Dashboard > Profile > API Tokens      |
| `CLOUDFLARE_ZONE_ID`    | Zone ID for svg-api.org                        | Dashboard > svg-api.org > Overview    |
| `CF_KV_NAMESPACE_ID`    | KV namespace ID for icon index                 | Dashboard > Workers & Pages > KV      |
| `CF_R2_BUCKET_NAME`     | R2 bucket name for SVG storage                 | Dashboard > R2                        |
| `SLACK_WEBHOOK_URL`     | (Optional) Slack webhook for notifications     | Slack App Settings                    |

### Setting Up Secrets

```bash
# From project root with .env.local containing secrets
source .env.local

# Set GitHub secrets
gh secret set CLOUDFLARE_ACCOUNT_ID --body "$CLOUDFLARE_ACCOUNT_ID"
gh secret set CLOUDFLARE_API_TOKEN --body "$CLOUDFLARE_API_TOKEN"
gh secret set CLOUDFLARE_ZONE_ID --body "$CLOUDFLARE_ZONE_ID"
gh secret set CF_KV_NAMESPACE_ID --body "$CF_KV_NAMESPACE_ID"
gh secret set CF_R2_BUCKET_NAME --body "$CF_R2_BUCKET_NAME"
```

### API Token Permissions

Create a Cloudflare API token with these permissions:

```
Account:
  - Workers Scripts: Edit
  - Workers KV Storage: Edit
  - Workers R2 Storage: Edit
  - Cloudflare Pages: Edit

Zone (svg-api.org):
  - Cache Purge: Purge
  - DNS: Edit
```

### Worker Configuration

**`apps/worker/wrangler.toml`**:

```toml
name = "svg-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# Production environment (default)
[vars]
ENVIRONMENT = "production"

[kv_namespaces]
# Production KV
[[kv_namespaces]]
binding = "ICONS_KV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

[r2_buckets]
# Production R2
[[r2_buckets]]
binding = "ICONS_R2"
bucket_name = "svg-api-icons"

[routes]
# Custom domain routing
[[routes]]
pattern = "api.svg-api.org/*"
zone_name = "svg-api.org"

# Staging environment
[env.staging]
name = "svg-api-staging"
[env.staging.vars]
ENVIRONMENT = "staging"

[[env.staging.kv_namespaces]]
binding = "ICONS_KV"
id = "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"

[[env.staging.r2_buckets]]
binding = "ICONS_R2"
bucket_name = "svg-api-icons-staging"

[[env.staging.routes]]
pattern = "staging-api.svg-api.org/*"
zone_name = "svg-api.org"

# Preview environment
[env.preview]
name = "svg-api-preview"
workers_dev = true

[[env.preview.kv_namespaces]]
binding = "ICONS_KV"
id = "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"

[[env.preview.r2_buckets]]
binding = "ICONS_R2"
bucket_name = "svg-api-icons-staging"
```

---

## Deployment Commands

### Local Development

```bash
# Install dependencies
pnpm install

# Start worker in development mode
pnpm dev:worker
# Available at http://localhost:8787

# Start web in development mode
pnpm dev:web
# Available at http://localhost:3000

# Run both concurrently
pnpm dev
```

### Manual Deployment

```bash
# Deploy worker to staging
pnpm deploy:worker:staging

# Deploy worker to production
pnpm deploy:worker

# Deploy web to staging
pnpm deploy:web:staging

# Deploy web to production
pnpm deploy:web
```

### Icon Building

```bash
# Download all icon packs
pnpm --filter icons-builder download

# Download specific pack
pnpm --filter icons-builder download -- --pack lucide

# Build search index
pnpm --filter icons-builder build-index

# Upload to R2
pnpm --filter icons-builder upload-r2

# Upload to KV
pnpm --filter icons-builder upload-kv

# Full build pipeline
pnpm build:icons
```

### Root Package Scripts

**`package.json`**:

```json
{
  "scripts": {
    "dev": "turbo dev",
    "dev:worker": "turbo dev --filter=worker",
    "dev:web": "turbo dev --filter=web",
    "build": "turbo build",
    "build:worker": "turbo build --filter=worker",
    "build:web": "turbo build --filter=web",
    "build:icons": "turbo build:icons --filter=icons-builder",
    "deploy:worker": "turbo deploy --filter=worker",
    "deploy:worker:staging": "turbo deploy:staging --filter=worker",
    "deploy:web": "turbo deploy --filter=web",
    "deploy:web:staging": "turbo deploy:staging --filter=web",
    "test": "turbo test",
    "lint": "turbo lint",
    "type-check": "turbo type-check"
  }
}
```

---

## Domain Setup

### DNS Configuration

Configure the following DNS records in Cloudflare:

| Type  | Name        | Content                          | Proxy   |
| ----- | ----------- | -------------------------------- | ------- |
| CNAME | @           | svg-api-web.pages.dev            | Proxied |
| CNAME | www         | svg-api.org                      | Proxied |
| CNAME | staging     | pr-staging.svg-api-web.pages.dev | Proxied |
| A     | api         | 192.0.2.1 (placeholder)          | Proxied |
| A     | staging-api | 192.0.2.1 (placeholder)          | Proxied |

Note: The A records for api/staging-api are placeholders. Worker routes handle the actual traffic.

### Custom Domain Setup

1. **Pages (Frontend)**:

   ```bash
   # Add custom domain to Pages project
   npx wrangler pages project create svg-api-web
   # Then in Dashboard: Pages > svg-api-web > Custom domains > Add
   # Add: svg-api.org, www.svg-api.org
   ```

2. **Workers (API)**:
   ```bash
   # Routes are configured in wrangler.toml
   # Verify route configuration
   npx wrangler route list
   ```

### SSL/TLS Configuration

Cloudflare provides automatic SSL certificates. Recommended settings:

- **SSL/TLS encryption mode**: Full (strict)
- **Always Use HTTPS**: Enabled
- **Automatic HTTPS Rewrites**: Enabled
- **Minimum TLS Version**: TLS 1.2

---

## Rollback Procedures

### Worker Rollback

```bash
# List recent deployments
npx wrangler deployments list

# Rollback to previous version
npx wrangler rollback

# Rollback to specific version
npx wrangler rollback --version <version-id>

# Emergency: Deploy known-good commit
git checkout <commit-sha>
pnpm deploy:worker
```

### Pages Rollback

```bash
# List deployments
npx wrangler pages deployment list svg-api-web

# Rollback via Dashboard:
# Pages > svg-api-web > Deployments > Select deployment > "Retry deployment"

# Or redeploy from Git
git checkout <commit-sha>
pnpm deploy:web
```

### R2 Object Recovery

R2 supports object versioning. Enable and use it:

```bash
# Enable versioning (one-time)
npx wrangler r2 bucket versioning enable svg-api-icons

# List object versions
npx wrangler r2 object list svg-api-icons --prefix icons/ --versions

# Restore specific version
npx wrangler r2 object copy \
  svg-api-icons/icons/lucide/arrow.svg?versionId=<old-version> \
  svg-api-icons/icons/lucide/arrow.svg
```

### KV Rollback

KV doesn't support versioning, but we store version metadata:

```bash
# Check current index version
curl https://api.svg-api.org/v1/status

# Rebuild from source if needed
pnpm build:icons
pnpm --filter icons-builder upload-kv
```

### Emergency Contacts

| Role               | Contact                 |
| ------------------ | ----------------------- |
| On-call Engineer   | #svg-api-oncall (Slack) |
| Cloudflare Support | support.cloudflare.com  |
| Domain Registrar   | [registrar-portal]      |

---

## Monitoring and Alerts

### Cloudflare Dashboard

Access metrics at: `dash.cloudflare.com > Workers & Pages`

Key metrics to monitor:

- **Request count**: Normal traffic patterns
- **Error rate**: Should be < 0.1%
- **CPU time**: p99 should be < 50ms
- **Duration**: p99 should be < 100ms

### Worker Analytics

```bash
# View real-time logs
npx wrangler tail

# View logs for specific worker
npx wrangler tail svg-api

# Filter by status
npx wrangler tail --status error
```

### Health Check Endpoints

| Endpoint            | Purpose              | Expected Response         |
| ------------------- | -------------------- | ------------------------- |
| `/health`           | Basic health check   | `200 OK`                  |
| `/v1/status`        | Detailed status      | JSON with version, counts |
| `/v1/search?q=test` | Search functionality | JSON results              |

### Setting Up Alerts

1. **Cloudflare Notifications**:
   - Dashboard > Notifications > Create
   - Alert types:
     - Workers: Error rate spike
     - Workers: Request count anomaly
     - Pages: Deployment failed

2. **External Monitoring** (recommended):

   ```yaml
   # Example: Better Uptime configuration
   monitors:
     - name: SVG API Health
       url: https://api.svg-api.org/health
       method: GET
       interval: 60
       alerts:
         - type: slack
           channel: "#svg-api-alerts"

     - name: SVG API Search
       url: https://api.svg-api.org/v1/search?q=arrow
       method: GET
       interval: 300
       expected_status: 200
   ```

3. **Slack Alerts Setup**:

   ```bash
   # Create Slack webhook
   # https://api.slack.com/messaging/webhooks

   # Add to GitHub secrets
   gh secret set SLACK_WEBHOOK_URL --body "https://hooks.slack.com/services/..."
   ```

### Log Analysis

```bash
# Stream logs to file
npx wrangler tail svg-api > logs.txt

# Parse error logs
npx wrangler tail svg-api --status error --format json | jq '.logs[]'

# Search for specific patterns
npx wrangler tail svg-api | grep -i "error"
```

### Performance Budgets

| Metric               | Budget  | Alert Threshold |
| -------------------- | ------- | --------------- |
| Search latency (p50) | < 20ms  | > 50ms          |
| Search latency (p99) | < 100ms | > 200ms         |
| SVG delivery (p50)   | < 10ms  | > 30ms          |
| Error rate           | < 0.1%  | > 1%            |
| Availability         | > 99.9% | < 99.5%         |

---

## Troubleshooting

### Common Issues

**Worker not responding:**

```bash
# Check deployment status
npx wrangler deployments list

# View logs
npx wrangler tail --status error

# Verify route
npx wrangler route list
```

**KV data missing:**

```bash
# Verify namespace
npx wrangler kv:namespace list

# Check key existence
npx wrangler kv:key get --namespace-id=<id> "index:version"

# Rebuild if necessary
pnpm build:icons && pnpm --filter icons-builder upload-kv
```

**R2 access denied:**

```bash
# Check bucket permissions
npx wrangler r2 bucket list

# Verify binding in wrangler.toml
cat apps/worker/wrangler.toml | grep r2_buckets -A 3
```

**Pages build failing:**

```bash
# Run build locally
pnpm --filter web build

# Check environment variables
echo $NEXT_PUBLIC_API_URL

# View Pages build logs in dashboard
```

### Debug Mode

Enable verbose logging in development:

```typescript
// apps/worker/src/index.ts
const DEBUG = env.ENVIRONMENT !== "production";

if (DEBUG) {
  console.log("Request:", request.url);
  console.log("Headers:", Object.fromEntries(request.headers));
}
```

---

## Security Checklist

- [ ] API token has minimum required permissions
- [ ] Secrets stored in GitHub Secrets, never in code
- [ ] `.env*` files in `.gitignore`
- [ ] CORS configured for allowed origins only
- [ ] Rate limiting enabled on Worker
- [ ] Input validation on all endpoints
- [ ] No sensitive data in logs
- [ ] Dependabot enabled for security updates
- [ ] Branch protection rules on `main`
- [ ] Required reviews before merge

---

## Appendix

### Useful Links

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/commands/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)

### Version History

| Date       | Version | Changes               |
| ---------- | ------- | --------------------- |
| 2024-01-07 | 1.0.0   | Initial documentation |
