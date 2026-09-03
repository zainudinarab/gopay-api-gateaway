FROM node:22-alpine

WORKDIR /app

# Install build dependencies for node-gyp & better-sqlite3 + python symlink
RUN apk add --no-cache python3 make g++ sqlite-dev && \
    ln -sf /usr/bin/python3 /usr/bin/python

ENV PYTHON=/usr/bin/python3

COPY package*.json ./

RUN npm config set python /usr/bin/python3 && npm install --omit=dev

COPY . .

EXPOSE 3000

ENV PORT=3000

CMD ["node", "server.js"]
