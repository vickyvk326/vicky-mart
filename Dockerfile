# Use multi-stage build with targets
FROM node:18-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

# Development stage
FROM base AS development
ENV NODE_ENV=development
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
EXPOSE 3000 9229
CMD ["pnpm", "run", "start:dev"]

# Production builder
FROM base AS builder
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Production runner
FROM node:18-alpine AS production
RUN npm install -g pnpm
ENV NODE_ENV=production
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001
USER nestjs
EXPOSE 3000
CMD ["node", "dist/main"]