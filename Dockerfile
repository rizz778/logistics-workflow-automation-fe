# --- Build Stage ---
FROM node:18-alpine AS build

WORKDIR /app

# Copy dependency configs
COPY package.json package-lock.json* ./

# Install packages
RUN npm install

# Copy project files
COPY . .

# Build the production bundle
RUN npm run build

# --- Production Stage ---
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production build assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
