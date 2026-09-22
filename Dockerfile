# Build the Vite/React application
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Vite embeds this value into the browser bundle at build time.
ARG VITE_API_URL=http://localhost:8080/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# Serve the static SPA with Nginx
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
