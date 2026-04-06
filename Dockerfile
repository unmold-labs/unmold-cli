# Multi-stage Dockerfile for building and running the Unmold CLI
FROM node:24-alpine AS builder
WORKDIR /usr/src/app

# Copy package manifests and install all dependencies (including dev)
COPY package.json package-lock.json* ./
RUN npm ci --silent

# Copy only files required to compile TypeScript and run oclif
COPY tsconfig.json ./
COPY src ./src
COPY bin ./bin
RUN rm -f tsconfig.tsbuildinfo \
  && npm run build --silent \
  && test -d dist

# Final stage: smaller runtime image with only production deps and compiled files
FROM node:24-alpine
WORKDIR /usr/src/app

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --silent && npm cache clean --force

# Copy compiled output and bin shims from builder
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/bin ./bin

# Make the entry script executable and expose a plain "unmold" command on PATH
RUN chmod +x /usr/src/app/bin/run.js \
  && ln -sf /usr/src/app/bin/run.js /usr/local/bin/unmold \
  && chmod +x /usr/local/bin/unmold

# Ensure PATH contains common locations
ENV PATH="/usr/local/bin:/usr/src/app/node_modules/.bin:${PATH}"

# Default workdir for running commands
WORKDIR /workspace

# Entrypoint: run the CLI via node (use absolute path)
ENTRYPOINT ["node", "/usr/src/app/bin/run.js"]

# By default, show help
CMD ["--help"]