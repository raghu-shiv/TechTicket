FROM node:22.22-alpine

RUN npm install -g npm@11

WORKDIR /app

# Root workspace manifests
COPY package.json ./

# Application manifests
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json

# Workspace package manifests
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/schemas/package.json ./packages/schemas/package.json
COPY packages/config/package.json ./packages/config/package.json

# Install the complete npm workspace dependency graph.
# Dependencies remain inside the Docker image/container.
RUN npm install

# Copy the actual source
COPY . .

WORKDIR /app/apps/api

EXPOSE 4000

CMD ["npm", "run", "start:dev"]