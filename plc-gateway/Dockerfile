# =====================================================================
#  PLC Data Gateway - 컨테이너 이미지
#  빌드: docker build -t plc-gateway ./plc-gateway
#  실행: docker run -p 4000:4000 -e PLC_DRIVER=modbus-tcp -e PLC_HOST=192.168.0.10 plc-gateway
# =====================================================================
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HTTP_PORT=4000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
COPY public ./public
RUN addgroup -S gateway && adduser -S gateway -G gateway && mkdir -p /app/data && chown gateway:gateway /app/data
USER gateway
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s CMD wget -qO- http://127.0.0.1:${HTTP_PORT}/health || exit 1
CMD ["node", "dist/index.js"]
