FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma.config.ts tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

RUN npm run build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY prisma.config.ts ./
COPY prisma ./prisma
COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["sh", "-c", "npm run db:migrate && if [ \"${BOOTSTRAP_USER:-false}\" = \"true\" ]; then npm run db:bootstrap-user; fi && if [ \"${SEED_DEMO_DATA:-false}\" = \"true\" ]; then npm run db:seed:runtime; fi && npm run start"]
