FROM node:22-slim AS build
WORKDIR /app
COPY web/package.json web/package.json
RUN cd web && npm install
COPY web web
RUN cd web && node node_modules/vite/bin/vite.js build

FROM node:22-slim
WORKDIR /app
COPY server/package.json server/package.json
RUN cd server && npm install --omit=dev
COPY server server
COPY --from=build /app/web/dist web/dist
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "server/index.js"]
