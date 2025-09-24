FROM node:22-alpine

WORKDIR /app

ARG INCLUDE_DEV_DEPS=false

COPY package*.json ./
RUN if [ "$INCLUDE_DEV_DEPS" = "true" ]; then \
			npm install && npm cache clean --force; \
		else \
			npm install --only=production && npm cache clean --force; \
		fi

COPY src ./src

ENV NODE_ENV=production
ENV PORT=3007

EXPOSE 3007

CMD ["node", "src/server.js"]

