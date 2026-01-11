# Build backend
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# Copy package files and install dependencies (including dev dependencies for build)
COPY backend/package*.json ./
RUN npm install

# Copy all source files and build
COPY backend/ ./
RUN npm run build

# Production backend stage
FROM node:18-alpine AS backend

WORKDIR /app/backend

# Copy package files and install only production dependencies
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy built dist from builder
COPY --from=backend-builder /app/backend/dist ./dist

# Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files and install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy source files and build
COPY frontend/ ./
RUN npm run build

# Final stage
FROM node:18-alpine

# Copy backend from backend stage
COPY --from=backend /app/backend /app/backend

# Copy frontend build from frontend-builder
COPY --from=frontend-builder /app/frontend/build /app/frontend

# Copy config files
COPY config.json /app/config.json
COPY backend/cache.json /app/backend/cache.json

# Install serve and jq
RUN npm install -g serve && \
    apk update && \
    apk add --no-cache jq

CMD sh -c '\
  BACKEND_PORT=$(jq -r ".backendPort" /app/config.json); \
  echo $BACKEND_PORT;\
  FRONTEND_PORT=$(jq -r ".frontendPort" /app/config.json); \
  node /app/backend/dist/src/main.js --port $BACKEND_PORT & \
  serve -s /app/frontend -l $FRONTEND_PORT \
'
