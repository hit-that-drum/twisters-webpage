FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Vite's default dev port
EXPOSE 5173

# Run vite dev
CMD ["npm", "run", "dev", "--", "--host"]