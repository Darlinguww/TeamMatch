FROM node:24-slim
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias y recompilar
RUN apt-get update && \
    apt-get install -y python3 g++ make && \
    npm install --build-from-source && \
    apt-get purge -y --auto-remove python3 g++ make && \
    rm -rf /var/lib/apt/lists/*

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

EXPOSE 3000

# Ejecutar aplicación compilada
CMD ["node", "dist/index.js"]