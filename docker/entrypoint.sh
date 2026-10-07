#!/bin/sh
set -e

# Write runtime config that overrides the build-time value
cat > /usr/share/nginx/html/config.js << EOF
window.__ENV__ = {
  VITE_API_URL: "${VITE_API_URL:-http://localhost:8080/api}"
};
EOF

echo "Runtime config written: VITE_API_URL=${VITE_API_URL}"

# Start Nginx
exec "$@"
