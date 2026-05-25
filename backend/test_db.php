<?php

require_once __DIR__ . '/bootstrap/app.php';

try {
    $pdo = \App\Core\Database::getConnection();
    echo "Database connection successful!\n";

    // Test query
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Tables in database: " . implode(', ', $tables) . "\n";

    // Check programs table
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM programs");
    $result = $stmt->fetch();
    echo "Programs count: " . $result['count'] . "\n";

} catch (Exception $e) {
    echo "Database connection failed: " . $e->getMessage() . "\n";
}