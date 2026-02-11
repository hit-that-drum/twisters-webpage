# Use Node.js as the base image
FROM node:22.12-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the code
COPY . .

# Expose the port your backend runs on (usually 5000 or 3000)
EXPOSE 5050

# Start the app using tsx (as seen in your earlier logs)
CMD ["npm", "run", "dev"]
