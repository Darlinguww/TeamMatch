FROM node:24-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
EXPOSE 8000
CMD ["npm", "run", "dev"]