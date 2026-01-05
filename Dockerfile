FROM node:20

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace metadata
COPY package.json pnpm-workspace.yaml ./

# Copy all workspace packages
COPY packages ./packages

# Copy environment variables
COPY .env ./

# Install dependencies
RUN pnpm install

# Generate Prisma Client
RUN npx prisma generate --schema=packages/server/prisma/schema.prisma

# Build TypeScript
RUN pnpm run build

EXPOSE 4000
CMD ["node", "packages/server/dist/index.js"]
