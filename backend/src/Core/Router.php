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

    private function register(string $method, string $path, callable|array $handler): void
    {
        $this->routes[$method][$path] = $handler;
    }

    public function dispatch(Request $request): void
    {
        $handler = $this->routes[$request->method][$request->path] ?? null;

        if ($handler === null) {
            Response::json([
                'status' => 'error',
                'message' => 'Route not found',
                'path' => $request->path,
            ], 404);
            return;
        }

        if (is_array($handler)) {
            [$class, $method] = $handler;
            $instance = new $class();
            $instance->{$method}($request);
            return;
        }

        $handler($request);
    }
}
