FROM node:24-slim
WORKDIR /app
COPY package.json package-lock.json* ./
# Instalamos con npm (esto creará carpetas reales, no symlinks)
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]