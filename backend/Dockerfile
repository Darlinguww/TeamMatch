FROM node:24-slim
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Dependencias de sistema para PDF digital, pdf2pic (GraphicsMagick + Ghostscript) y OCR (Tesseract)
RUN apt-get update && apt-get install -y \
    graphicsmagick \
    ghostscript \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-spa \
    poppler-utils \
    python3 \
    g++ \
    make \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias Node
RUN npm install --build-from-source

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

EXPOSE 3000

# Ejecutar aplicación compilada
CMD ["node", "dist/index.js"]