# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S testing -u 1001

# Change ownership of the app directory
RUN chown -R testing:nodejs /app
USER testing

# Expose port (not really needed for testing but good practice)
EXPOSE 3000

# Default command - keep container running for manual testing
CMD ["tail", "-f", "/dev/null"]
