# Development environment for React application
FROM node:20-slim

# Install additional development tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    vim \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Set environment to development
ENV NODE_ENV=development

# The container will start with a shell, not the app
CMD ["/bin/bash"]