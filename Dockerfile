# Use Node.js 18 for better compatibility
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Install a simple HTTP server to serve the built app
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Start the server
CMD ["serve", "-s", "out", "-l", "3000"]