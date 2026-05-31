FROM php:8.3-cli-alpine

WORKDIR /app

# Install PDO MySQL extension required by backend database layer.
RUN docker-php-ext-install pdo pdo_mysql

COPY . /app

EXPOSE 8080

CMD ["sh", "-c", "php -S 0.0.0.0:${PORT:-8080} router.php"]
