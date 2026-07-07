# Tipulog – clinic management system
# Build:  docker build -t tipulog .
# Run:    docker run -d -p 3000:3000 -v tipulog-data:/app/data \
#           -e SESSION_SECRET=change-me tipulog
FROM node:22-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
# SQLite database + uploaded documents live here — mount a volume to persist
VOLUME /app/data
EXPOSE 3000
CMD ["npm", "run", "start"]
