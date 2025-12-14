FROM node:18-alpine AS backend

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/dist ./dist

FROM nginx:alpine AS frontend
COPY frontend/build /usr/share/nginx/html

FROM node:18-alpine
COPY --from=backend /app/backend /app/backend
COPY --from=frontend /usr/share/nginx/html /app/frontend

COPY config.json /app/config.json
COPY backend/cache.json /app/backend/cache.json

RUN npm install -g serve

RUN apk update && apk add --no-cache jq

CMD sh -c '\
  BACKEND_PORT=$(jq -r ".backendPort" /app/config.json); \
  echo $BACKEND_PORT;\
  FRONTEND_PORT=$(jq -r ".frontendPort" /app/config.json); \
  node /app/backend/dist/src/main.js --port $BACKEND_PORT & \
  serve -s /app/frontend -l $FRONTEND_PORT \
'
