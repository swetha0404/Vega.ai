# Frontend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Use nginx to serve the built files
FROM nginx:alpine

# Install netcat for backend health checking
RUN apk add --no-cache netcat-openbsd

COPY --from=0 /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy and make entry-point script executable
COPY entry-point.sh /entry-point.sh
RUN chmod +x /entry-point.sh

EXPOSE 80

CMD ["/entry-point.sh"]
