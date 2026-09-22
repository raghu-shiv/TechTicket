FROM node:22-alpine

RUN npm install -g npm@11

WORKDIR /app

COPY package.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/schemas/package.json ./packages/schemas/package.json
COPY packages/config/package.json ./packages/config/package.json

RUN npm install --workspace=apps/web

COPY . .

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["npm", "run", "dev"]