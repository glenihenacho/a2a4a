# ─── Stage 1: Install dependencies ───
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ─── Stage 2: Build frontend ───
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ─── Stage 3: Production image ───
FROM node:22-slim AS production
WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy built frontend from build stage
COPY --from=build /app/dist ./dist

# Copy server code + package.json
COPY package.json ./
COPY server ./server
COPY drizzle.config.js ./

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server/index.js"]
