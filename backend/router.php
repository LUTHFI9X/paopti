<?php

// Router for PHP built-in server with SPA support

$uri = $_SERVER['REQUEST_URI'] ?? '/';
$publicDir = __DIR__ . '/public';

// Remove query string from URI
$uri = parse_url($uri, PHP_URL_PATH);

// API routes - handle via application
if (str_starts_with($uri, '/api')) {
    require_once __DIR__ . '/bootstrap/app.php';

    $request = App\Core\Request::capture();
    $router->dispatch($request);
    exit;
}

// Serve static files from public directory
$file = $publicDir . $uri;

// Check for actual files (not directories)
if ($uri !== '/' && file_exists($file) && is_file($file)) {
    $ext = pathinfo($file, PATHINFO_EXTENSION);
    $mimeTypes = [
        'html' => 'text/html',
        'js' => 'application/javascript',
        'css' => 'text/css',
        'json' => 'application/json',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'svg' => 'image/svg+xml',
        'ico' => 'image/x-icon',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf' => 'font/ttf',
    ];

    $mime = $mimeTypes[$ext] ?? 'application/octet-stream';
    header('Content-Type: ' . $mime);
    header('Cache-Control: public, max-age=3600');
    readfile($file);
    exit;
}

// SPA fallback - serve index.html for all frontend routes
$indexPath = $publicDir . '/index.html';
if (file_exists($indexPath)) {
    header('Content-Type: text/html');
    header('Cache-Control: no-cache');
    readfile($indexPath);
    exit;
}

// 404 if index.html not found
http_response_code(404);
header('Content-Type: text/html');
echo '<h1>404 - File Not Found</h1>';