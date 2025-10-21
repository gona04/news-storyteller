#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧹 Clearing all caches...${NC}\n"

# 1. Clear Next.js cache
echo -e "${YELLOW}1. Clearing Next.js build cache...${NC}"
rm -rf .next/cache
echo -e "${GREEN}✅ Next.js cache cleared${NC}\n"

# 2. Clear story cache
echo -e "${YELLOW}2. Clearing story cache...${NC}"
rm -f cached_stories.json
echo -e "${GREEN}✅ Story cache cleared${NC}\n"

# 3. Clear news cache
echo -e "${YELLOW}3. Clearing news cache...${NC}"
rm -rf cache/
mkdir -p cache
echo -e "${GREEN}✅ News cache cleared${NC}\n"

# 4. Clear Node.js cache
echo -e "${YELLOW}4. Clearing Node.js require cache...${NC}"
rm -rf .next
rm -rf node_modules/.cache
echo -e "${GREEN}✅ Node.js cache cleared${NC}\n"

# 5. Clear browser cache (localStorage would be on client-side)
echo -e "${YELLOW}5. Browser cache info:${NC}"
echo -e "${YELLOW}   - To clear browser localStorage, add this code to your app:${NC}"
echo -e "${YELLOW}   - localStorage.clear();${NC}"
echo -e "${YELLOW}   - Or manually clear in DevTools > Application > Storage${NC}\n"

echo -e "${GREEN}🎉 All caches cleared successfully!${NC}\n"

# Show what's left
echo -e "${YELLOW}📊 Cache status after clearing:${NC}"
echo -e "   - .next/cache: $([ -d .next/cache ] && echo 'EXISTS' || echo 'CLEARED')"
echo -e "   - cached_stories.json: $([ -f cached_stories.json ] && echo 'EXISTS' || echo 'CLEARED')"
echo -e "   - cache/: $([ -d cache ] && echo "$(ls -1 cache 2>/dev/null | wc -l) items" || echo 'CLEARED')"

