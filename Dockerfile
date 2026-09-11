FROM node:20-alpine AS base

RUN apk add --no-cache dumb-init

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src/ ./src/

RUN mkdir -p /app/data/auth_info && chown -R node:node /app

USER node

ENV PORT=7860 \
    HOST=0.0.0.0 \
    NODE_ENV=production \
    WHATSAPP_ENGINE=baileys \
    SESSION_DATA_PATH=/app/data/auth_info

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/api/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "src/server.js"]
