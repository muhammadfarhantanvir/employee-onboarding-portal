# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Install all dependencies including devDependencies for build
RUN npm install --legacy-peer-deps
COPY . .
# Use npx to ensure nest command is found
RUN npx nest build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/main"]
