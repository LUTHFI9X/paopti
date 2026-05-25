<?php
// Debug script to check users table

$dsn = 'mysql:unix_socket=/Applications/XAMPP/xamppfiles/var/mysql/mysql.sock;dbname=spi_hub;charset=utf8mb4';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO($dsn, $user, $pass);
    echo "Database connection: OK\n";

    // Check users table structure
    $stmt = $pdo->query("DESCRIBE users");
    echo "Users table structure:\n";
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "  - {$row['Field']}: {$row['Type']}\n";
    }

    // Count users
    $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM users");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "\nUser count: " . $result['cnt'] . "\n";

    // Show current users
    echo "\nCurrent users:\n";
    $stmt = $pdo->query("SELECT id, username, name, role FROM users LIMIT 5");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "  - {$row['id']} | {$row['username']} | {$row['name']} | {$row['role']}\n";
    }
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}