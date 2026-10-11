# Sidecar WhatsApp Dentiva — WhatsApp Web asli (whatsapp-web.js) di Chromium headless.
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
RUN apt-get update \
 && apt-get install -y --no-install-recommends chromium fonts-liberation ca-certificates dumb-init \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev && npm cache clean --force
COPY lib.mjs server.mjs cli.mjs ./
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# dumb-init membereskan proses Chromium yatim saat klien dimuat ulang.
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.mjs"]
