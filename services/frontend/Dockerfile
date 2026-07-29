FROM node:22.14-alpine AS builder
WORKDIR /app
ARG NEXT_TELEMETRY_DISABLED=1
ENV NEXT_TELEMETRY_DISABLED=${NEXT_TELEMETRY_DISABLED}
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22.14-alpine AS runner
WORKDIR /app
ARG NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=${NEXT_TELEMETRY_DISABLED}
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
