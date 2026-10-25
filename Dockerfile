# Imagen del modo HTTP, para hostear el servidor. Los datos (base y clave) van en /data.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts ./scripts
COPY tsconfig.json ./
COPY src ./src
# `prepare` copia pdf.js a vendor/ desde pdfjs-dist, que es devDependency, y compila a build/.
RUN npm ci
RUN npm prune --omit=dev

FROM node:22-slim
ENV NODE_ENV=production UTN_MCP_HOME=/data
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/vendor ./vendor
RUN mkdir -p /data && chown node:node /data
VOLUME /data
USER node
CMD ["node", "build/index.js", "--http"]
