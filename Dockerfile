FROM node:18-bullseye-slim

# Install dependencies for Chromium
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Copy application files
COPY . .

# Create sessions directory
RUN mkdir -p /app/sessions && chmod 777 /app/sessions

# Install Chromium and find the path
RUN npx puppeteer browsers install chrome && \
    CHROME_PATH=$(find /root/.cache/puppeteer/chrome -name chrome -type f | head -n 1) && \
    echo "Found Chrome at: $CHROME_PATH" && \
    ln -sf $CHROME_PATH /usr/local/bin/chrome

# Set environment to use the linked Chrome
ENV PUPPETEER_EXECUTABLE_PATH=/usr/local/bin/chrome

# Expose port
EXPOSE 7777

# Start the application
CMD ["node", "server.js"]
