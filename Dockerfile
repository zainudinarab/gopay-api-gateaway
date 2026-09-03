FROM node:22-slim

WORKDIR /app

# Install build dependencies for node-gyp & better-sqlite3 di Debian Slim
RUN apt-get update && apt-get install -y python3 make g++ sqlite3 libsqlite3-dev && \
    rm -rf /var/lib/apt/lists/*

ENV PYTHON=/usr/bin/python3

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

EXPOSE 3000

ENV PORT=3000

CMD ["node", "server.js"]
