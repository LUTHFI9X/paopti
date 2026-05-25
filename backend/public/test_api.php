<?php

// Test API for programs
require_once __DIR__ . '/../bootstrap/app.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = $_SERVER['REQUEST_URI'] ?? '/';

if ($method === 'POST' && $uri === '/api/programs') {
    $body = json_decode(file_get_contents('php://input'), true);

    if (empty($body['name'])) {
        http_response_code(422);
        echo json_encode(['status' => 'error', 'message' => 'Nama program wajib diisi']);
        exit;
    }

    $year = $body['year'] ?? (int) date('Y');
    $id = $body['id'] ?? "prog" . time() . "-{$year}";

    try {
        \App\Core\Database::execute(
            "INSERT INTO programs (id, name, year) VALUES (?, ?, ?)",
            [$id, $body['name'], $year]
        );

        $newProgram = [
            'id' => $id,
            'name' => $body['name'],
            'year' => $year,
        ];

        http_response_code(201);
        echo json_encode(['status' => 'success', 'message' => 'Program berhasil ditambahkan', 'data' => $newProgram]);
    } catch (\Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Gagal menyimpan program']);
    }
    exit;
}

if ($method === 'GET' && $uri === '/api/programs') {
    $year = isset($_GET['year']) ? (int) $_GET['year'] : (int) date('Y');

    try {
        $programs = \App\Core\Database::query(
            "SELECT id, name, year, created_at FROM programs WHERE year = ? ORDER BY name",
            [$year]
        );
    } catch (\Exception $e) {
        $programs = [];
    }

    echo json_encode([
        'status' => 'success',
        'data' => array_values($programs),
    ]);
    exit;
}

echo json_encode(['status' => 'error', 'message' => 'Endpoint not found']);