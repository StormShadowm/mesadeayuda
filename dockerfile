FROM php:8.2-apache

# Copiar archivos del proyecto
COPY . /var/www/html/

# Activar mod_rewrite
RUN a2enmod rewrite

# Instalar mysqli
RUN docker-php-ext-install mysqli

# Permisos
RUN chown -R www-data:www-data /var/www/html