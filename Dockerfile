FROM node:18-alpine AS base

RUN apk update && apk add --no-cache \
    build-base \
    cairo-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    pango-dev

WORKDIR /app
COPY . .

FROM base as builder
RUN npm install
RUN npm run build

FROM builder as runner

ENV PORT 6100
EXPOSE 6100
CMD ["npm", "run", "start"]
