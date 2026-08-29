FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ sqlite-dev

COPY package*.json ./

RUN npm install --only=production

COPY . .

EXPOSE 3000

ENV PORT=3000

CMD ["node", "server.js"]
