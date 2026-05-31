<?php

$defaultOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
];

$allowAll = true;
$allowAllRaw = getenv('CORS_ALLOW_ALL');
if ($allowAllRaw !== false && trim($allowAllRaw) !== '') {
    $parsedAllowAll = filter_var($allowAllRaw, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
    if ($parsedAllowAll !== null) {
        $allowAll = $parsedAllowAll;
    }
}

$allowedOrigins = $defaultOrigins;
$allowedOriginsRaw = getenv('CORS_ALLOWED_ORIGINS');
if ($allowedOriginsRaw !== false && trim($allowedOriginsRaw) !== '') {
    $allowedOrigins = array_values(array_filter(array_map(
        static fn(string $origin): string => trim($origin),
        str_getcsv($allowedOriginsRaw)
    )));
}

return [
    'allow_all' => $allowAll,
    'allowed_origins' => $allowedOrigins,
];
