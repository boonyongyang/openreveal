FROM node:22.12-bookworm-slim AS build

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:22.12-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_URL=file:/data/openreveal.sqlite
ENV WEB_DIST_DIR=/app/apps/web/dist

RUN corepack enable && mkdir -p /data
COPY --from=build /app /app

EXPOSE 4000
VOLUME ["/data"]

CMD ["pnpm", "--filter", "@openreveal/api", "start"]
