# ATMA Admin Service Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production && npm cache clean --force

COPY src ./src

ENV NODE_ENV=production
ENV PORT=3007

EXPOSE 3007

CMD ["node", "src/server.js"]

