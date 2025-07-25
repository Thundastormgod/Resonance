# Netlify-optimized Dockerfile for production deployment
# This builds the frontend for static deployment on Netlify
FROM node:20-alpine AS builder

# Install build dependencies for native packages
RUN apk add --no-cache python3 make g++ vips-dev

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install all dependencies (including dev dependencies needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application for production
RUN npm run build

# Create a minimal output stage for Netlify
FROM alpine:latest AS output

# Copy built files to output directory
COPY --from=builder /app/dist /output

# Create a simple script to copy files
RUN echo '#!/bin/sh' > /copy-output.sh && \
    echo 'cp -r /output/* /netlify/' >> /copy-output.sh && \
    chmod +x /copy-output.sh

CMD ["/copy-output.sh"]
