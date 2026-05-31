<?php

namespace App\Core;

final class Router
{
    private array $routes = [];

    public function get(string $path, callable|array $handler): void
    {
        $this->register('GET', $path, $handler);
    }

    public function post(string $path, callable|array $handler): void
    {
        $this->register('POST', $path, $handler);
    }

    public function put(string $path, callable|array $handler): void
    {
        $this->register('PUT', $path, $handler);
    }

    public function patch(string $path, callable|array $handler): void
    {
        $this->register('PATCH', $path, $handler);
    }

    public function delete(string $path, callable|array $handler): void
    {
        $this->register('DELETE', $path, $handler);
    }

    public function options(string $path, callable|array $handler): void
    {
        $this->register('OPTIONS', $path, $handler);
    }

    private function register(string $method, string $path, callable|array $handler): void
    {
        $this->routes[$method][$path] = $handler;
    }

    public function dispatch(Request $request): void
    {
        $method = $request->method;
        $path = $request->path;

        if (isset($this->routes[$method][$path])) {
            $this->executeHandler($this->routes[$method][$path], $request);
            return;
        }

        foreach ($this->routes[$method] ?? [] as $routePath => $handler) {
            $params = $this->matchRoute($routePath, $path);
            if ($params !== false) {
                $request = new Request(
                    $request->method,
                    $request->path,
                    $request->query,
                    $request->body,
                    $request->server,
                    $request->headers,
                    $params
                );
                $this->executeHandler($handler, $request);
                return;
            }
        }

        // Serve static files for non-API routes
        if (!str_starts_with($path, '/api')) {
            $this->serveStaticFile($path);
            return;
        }

        Response::json([
            'status' => 'error',
            'message' => 'Route not found',
            'path' => $path,
            'method' => $method,
        ], 404);
    }

    private function serveStaticFile(string $path): void
    {
        $publicDir = dirname(__DIR__, 2) . '/public';
        $requestedFile = $publicDir . ($path === '/' ? '/index.html' : $path);

        // Security: prevent directory traversal
        $realPath = realpath($requestedFile);
        if ($realPath === false || !str_starts_with($realPath, realpath($publicDir))) {
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => 'File not found']);
            return;
        }

        $mimeTypes = [
            'html' => 'text/html',
            'js' => 'application/javascript',
            'css' => 'text/css',
            'json' => 'application/json',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'svg' => 'image/svg+xml',
            'ico' => 'image/x-icon',
        ];

        $ext = pathinfo($realPath, PATHINFO_EXTENSION);
        $mime = $mimeTypes[$ext] ?? 'application/octet-stream';

        header('Content-Type: ' . $mime);
        header('Cache-Control: public, max-age=3600');
        readfile($realPath);
    }

    private function matchRoute(string $routePath, string $requestPath): array|false
    {
        $routeParts = explode('/', trim($routePath, '/'));
        $pathParts = explode('/', trim($requestPath, '/'));

        if (count($routeParts) !== count($pathParts)) {
            return false;
        }

        $params = [];
        for ($i = 0; $i < count($routeParts); $i++) {
            if (preg_match('/^\{(.+)\}$/', $routeParts[$i], $matches)) {
                $params[$matches[1]] = $pathParts[$i];
            } elseif ($routeParts[$i] !== $pathParts[$i]) {
                return false;
            }
        }

        return $params;
    }

    private function executeHandler(callable|array $handler, Request $request): void
    {
        if (is_array($handler)) {
            [$class, $method] = $handler;
            $instance = new $class();

            if (isset($request->params) && !empty($request->params)) {
                $paramKey = array_key_first($request->params);
                $paramValue = $request->params[$paramKey];
                $instance->{$method}($request, $paramValue);
            } else {
                $instance->{$method}($request);
            }
            return;
        }

        $handler($request);
    }
}
