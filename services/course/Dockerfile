# Use Bun official image
FROM oven/bun:1 as base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Start the service
CMD ["bun", "run", "start"]
