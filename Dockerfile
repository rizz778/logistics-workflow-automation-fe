# --- Build Stage ---
# Use Debian-based Node (glibc) so @tailwindcss/oxide native bindings resolve.
# node:18-alpine uses musl libc which breaks the oxide prebuilt binary.
FROM node:20-slim AS build

WORKDIR /app

# Copy only package.json — drop the lock file so npm resolves
# the correct Linux native binaries (e.g. @tailwindcss/oxide)
# instead of using the Windows-generated lock file.
COPY package.json ./

# Install packages fresh (no lock file = correct platform binaries)
RUN npm install

# Copy project files (lock file excluded via .dockerignore)
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
