FROM node:22-bookworm-slim

ARG STOCKFISH_VERSION=sf_18
ARG STOCKFISH_ARCH=stockfish-ubuntu-x86-64

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl tar findutils \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fL \
    "https://github.com/official-stockfish/Stockfish/releases/download/${STOCKFISH_VERSION}/${STOCKFISH_ARCH}.tar" \
    -o /tmp/stockfish.tar \
  && mkdir -p /tmp/stockfish \
  && tar -xf /tmp/stockfish.tar -C /tmp/stockfish \
  && install -m 0755 "$(find /tmp/stockfish -type f -name 'stockfish*' -perm /111 | head -n 1)" /usr/local/bin/stockfish \
  && rm -rf /tmp/stockfish /tmp/stockfish.tar

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    STOCKFISH_PATH=/usr/local/bin/stockfish

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

USER node

EXPOSE 3000

CMD ["node", "src/server.js"]