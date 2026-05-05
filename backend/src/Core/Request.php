<?php

namespace App\Core;

final class Request
{
    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query,
        public readonly array $body,
        public readonly array $server,
    ) {
    }

    public static function capture(): self
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $path = parse_url($uri, PHP_URL_PATH) ?: '/';

        $rawBody = file_get_contents('php://input') ?: '';
        $decoded = json_decode($rawBody, true);

        return new self(
            $method,
            $path,
            $_GET,
            is_array($decoded) ? $decoded : $_POST,
            $_SERVER,
        );
    }
}
