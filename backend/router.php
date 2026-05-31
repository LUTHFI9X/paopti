<?php

// Router for PHP built-in server with SPA support

$uri = $_SERVER['REQUEST_URI'] ?? '/';
$publicDir = __DIR__ . '/public';
$publicRoot = realpath($publicDir) ?: $publicDir;

// Remove query string from URI
$uri = parse_url($uri, PHP_URL_PATH);

// Load environment variables from backend/.env (so getenv() works)
$dotenvPath = __DIR__ . '/.env';
if (file_exists($dotenvPath)) {
    $lines = file($dotenvPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        if (strpos($line, '=') === false) {
            continue;
        }
        [$name, $value] = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        if (!array_key_exists($name, $_ENV)) {
            $_ENV[$name] = $value;
            putenv("$name=$value");
        }
    }
}

// API routes - handle via application
if (str_starts_with($uri, '/api')) {
    require_once __DIR__ . '/bootstrap/app.php';

    $request = App\Core\Request::capture();
    $router->dispatch($request);
    exit;
}

// Serve static files from public directory.
// Use realpath validation so requests cannot escape /public via path traversal.
$file = realpath($publicDir . $uri);

// Check for actual files (not directories) under /public only.
if (
    $uri !== '/'
    && $file !== false
    && is_file($file)
    && str_starts_with($file, $publicRoot . DIRECTORY_SEPARATOR)
) {
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));

    // Never expose PHP source code as static files.
    if ($ext === 'php') {
        http_response_code(404);
        header('Content-Type: text/plain');
        echo 'Not Found';
        exit;
    }

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

    if (!array_key_exists($ext, $mimeTypes)) {
        http_response_code(404);
        header('Content-Type: text/plain');
        echo 'Not Found';
        exit;
    }

    $mime = $mimeTypes[$ext];
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