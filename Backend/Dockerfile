# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Expose port
EXPOSE 8080

# Health check using curl
RUN apk add --no-cache curl
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the application
CMD ["npm", "start"]
