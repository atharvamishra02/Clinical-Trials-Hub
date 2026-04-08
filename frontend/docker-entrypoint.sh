#!/bin/sh
# Generate runtime config from environment variables
# This runs at container startup, BEFORE nginx starts

cat <<EOF > /usr/share/nginx/html/runtime-config.js
window.__RUNTIME_CONFIG__ = {
  API_URL: "${VITE_API_URL:-/api}"
};
EOF

echo "Runtime config generated: API_URL=${VITE_API_URL:-/api}"

# Start nginx
exec "$@"
