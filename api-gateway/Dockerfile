# Use Node.js 18 Alpine as base image for smaller size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S atma -u 1001

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY jest.config.js ./

# Create logs directory and set permissions
RUN mkdir -p logs && \
    chown -R atma:nodejs /app && \
    chmod -R 755 /app

# Switch to non-root user
USER atma

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "const http = require('http'); \
    const options = { hostname: 'localhost', port: process.env.PORT || 3000, path: '/health/live', timeout: 5000 }; \
    const req = http.request(options, (res) => { \
        if (res.statusCode === 200) { process.exit(0); } else { process.exit(1); } \
    }); \
    req.on('error', () => process.exit(1)); \
    req.on('timeout', () => process.exit(1)); \
    req.end();"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "src/server.js"]
