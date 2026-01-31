#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 SVG API Deployment Script${NC}\n"

# Load environment variables
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ Error: .env.local not found${NC}"
    echo "Please create .env.local with:"
    echo "  CLOUDFLARE_API_TOKEN=xxx"
    echo "  CLOUDFLARE_ACCOUNT_ID=xxx"
    exit 1
fi

source .env.local

# Verify credentials
if [ -z "$CLOUDFLARE_API_TOKEN" ] || [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
    echo -e "${RED}❌ Error: Missing Cloudflare credentials in .env.local${NC}"
    exit 1
fi

# Parse arguments
ENV="production"
SKIP_BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENV="$2"
            shift 2
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${YELLOW}📦 Environment: $ENV${NC}\n"

# Build if not skipped
if [ "$SKIP_BUILD" = false ]; then
    echo -e "${YELLOW}🔨 Building packages...${NC}"
    pnpm build
    echo -e "${GREEN}✅ Build complete${NC}\n"
fi

# Deploy to Cloudflare
echo -e "${YELLOW}☁️  Deploying to Cloudflare Workers...${NC}"
cd apps/worker

export CLOUDFLARE_API_TOKEN
export CLOUDFLARE_ACCOUNT_ID

if [ "$ENV" = "production" ]; then
    pnpm wrangler deploy --env production
else
    pnpm wrangler deploy --env "$ENV"
fi

cd ../..

echo -e "\n${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}🌐 Worker deployed to Cloudflare${NC}"
