FROM node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df
ENV ONNXRUNTIME_NODE_INSTALL_CUDA=skip NODE_ENV=production PORT=10000
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY server ./server
COPY public ./public
COPY tests ./tests
COPY scripts ./scripts
COPY LICENSE ./LICENSE
COPY docs/THIRD_PARTY_NOTICES.md ./docs/THIRD_PARTY_NOTICES.md
COPY docs/evidence/paypal-real-sandbox.json docs/evidence/paypal-independent-verification.json docs/evidence/paypal-sandbox-audit.json docs/evidence/paypal-sandbox-audit-validation.json ./docs/evidence/
RUN npm run build && node --import tsx scripts/download-model.ts && cp node_modules/@huggingface/transformers/LICENSE models/Xenova/all-MiniLM-L6-v2/LICENSE-APACHE-2.0
USER node
EXPOSE 10000
CMD ["node", "--import", "tsx", "scripts/public-judge.ts"]
