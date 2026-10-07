# Builds the client, then runs the API which serves it from the same origin.
#
# Debian slim rather than Alpine on purpose: bcrypt is a native module and
# ships prebuilt binaries for glibc, but usually not for musl, where it would
# fall back to compiling from source and fail without a toolchain.
FROM node:22-slim AS build

WORKDIR /app

# Dependencies first so this layer caches across code changes.
COPY package.json package-lock.json ./
COPY client/package.json client/package-lock.json ./client/
RUN npm ci --omit=dev && npm --prefix client ci

COPY . .
RUN npm --prefix client run build


FROM node:22-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Carry the installed modules over rather than reinstalling, so the native
# bcrypt binding is the one that was already resolved in the build stage.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/src ./src
COPY --from=build /app/client/dist ./client/dist

# Run unprivileged; the base image ships this user.
USER node

EXPOSE 8000

# Honour SIGTERM so the graceful shutdown in src/index.js actually runs.
STOPSIGNAL SIGTERM

CMD ["node", "src/index.js"]
