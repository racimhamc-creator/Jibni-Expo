# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node dist/server.js || exit 1

# Start the application
CMD ["npm", "start"]
