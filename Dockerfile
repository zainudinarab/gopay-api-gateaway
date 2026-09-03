FROM node:22-alpine

WORKDIR /app

# Install build dependencies yang dibutuhkan node-gyp & better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm install --only=production

COPY . .

EXPOSE 3000

ENV PORT=3000

CMD ["node", "server.js"]
