FROM nginx:stable-alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Se copia aquí los archivos estáticos de la App
# OJO: Aquí 'src' es la carpeta que genera Vite/React al compilar.
# Para probar voy a simplemente crear una carpeta dist con un index.html básico de prueba.
COPY ./src /usr/share/nginx/html

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]