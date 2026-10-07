#!/bin/sh
set -eu

: "${VITE_API_URL:=http://localhost:8080/api}"

cat > /usr/share/nginx/html/env-config.js <<EOF
(function (window) {
  window.__APP_ENV__ = {
    VITE_API_URL: "${VITE_API_URL}"
  };
})(this);
EOF

exec "$@"
