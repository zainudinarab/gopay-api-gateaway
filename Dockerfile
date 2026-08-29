FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm config set registry https://registry.npmmirror.com/ && npm install --only=production

COPY . .

EXPOSE 3000

ENV PORT=3000

CMD ["node", "server.js"]
