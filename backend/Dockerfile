FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma.config.ts tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npm run db:migrate && npm run db:seed && npm run start"]
