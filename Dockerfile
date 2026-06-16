# Quest — deployable as an AgentBase "agent" (Docker image).
# The container IS the server: Zalo webhook + HTML pages + API (+ scheduler later).

# ---- build ----
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

# ---- runtime ----
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
# AgentBase requires the service to listen on 8080 with a /health check path.
# (config.ts reads PORT; secrets are injected as runtime env vars, not baked in.)
ENV PORT=8080
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY public ./public
COPY pitch ./pitch
EXPOSE 8080
CMD ["node", "dist/index.js"]
