FROM node:20

WORKDIR /app

# Copy workspace metadata
COPY package.json pnpm-workspace.yaml ./

# Copy all workspace packages
COPY packages ./packages

# Copy environment variables
COPY .env ./

# Install dependencies
RUN npm install

# Build TypeScript
RUN npm run build

# Generate Prisma Client inside Docker
RUN npx prisma generate --schema=packages/server/prisma/schema.prisma

EXPOSE 4000
CMD ["node", "packages/server/dist/index.js"]
