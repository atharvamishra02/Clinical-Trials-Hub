# Use Node 20 as base
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose backend port
EXPOSE 3001

# Start the application (env vars injected by docker-compose)
CMD ["node", "--loader", "ts-node/esm", "src/index.ts"]
