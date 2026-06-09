# Use an official Node.js runtime as the base image
FROM node:18-slim

# Install Chromium and required dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    chromium \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use the system installed Chromium binary instead of downloading its own
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy application source
COPY . .

# Run build step
RUN npm run build

# Expose the application port (Express runs on 3000)
EXPOSE 3000

# Start server
CMD ["npm", "start"]
