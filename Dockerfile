FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY . .
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node", "server/index.js"]
