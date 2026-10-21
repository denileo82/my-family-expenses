# Dockerfile para Angular App (myfamily-expenses)
# Multi-stage build para otimizar o tamanho da imagem

# Stage 1: Dependências
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json yarn.lock ./

# Instalar dependências
RUN yarn install --frozen-lockfile

# Stage 2: Builder
FROM node:22-alpine AS builder
WORKDIR /app

# Copiar dependências da stage anterior
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build da aplicação
RUN yarn build

# Stage 3: Runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copiar arquivos de dependências para instalar apenas deps de produção
COPY package.json yarn.lock ./

# Instalar apenas dependências de produção (express)
RUN yarn install --frozen-lockfile --production

# Criar usuário não-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 angular

# Copiar build da aplicação e server
COPY --from=builder --chown=angular:nodejs /app/dist ./dist
COPY --from=builder --chown=angular:nodejs /app/server.js ./server.js

USER angular

EXPOSE 3000

CMD ["node", "server.js"]
