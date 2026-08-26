# ==============================================================================
# HOSTEL EASE — PRODUCTION MULTI-STAGE DOCKERFILE
# ==============================================================================

# --- STAGE 1: Build Frontend Assets ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools for native addons (better-sqlite3)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install

COPY . .

# Build Vite frontend into /app/dist
RUN npm run build

# --- STAGE 2: Production Runtime ---
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime dependencies for SQLite
RUN apk add --no-cache python3 make g++ curl

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy build artifacts and server code
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Create persistent directories
RUN mkdir -p /app/data /app/uploads /app/logs

# Volume mounts for persistence
VOLUME ["/app/data", "/app/uploads", "/app/logs"]

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start unified server
CMD ["npx", "tsx", "server/index.ts"]
