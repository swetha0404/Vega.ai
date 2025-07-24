# Use Node 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Install serve to serve the built app
RUN npm install -g serve

# Copy and make start script executable
COPY start.sh .
RUN chmod +x start.sh

# Expose port
EXPOSE 3000

# Command to serve the built application
CMD ["./start.sh"]
