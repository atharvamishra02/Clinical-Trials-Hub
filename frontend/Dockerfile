# Build stage
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Default backend URL for Docker Compose; override via env var on Render
ENV BACKEND_URL=http://backend:3001

# Only substitute BACKEND_URL, leave nginx variables ($host, $uri, etc.) untouched
ENV NGINX_ENVSUBST_FILTER=^BACKEND_

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
