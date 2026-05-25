<?php
// Quick test to check database and create table if needed

$dsn = 'mysql:unix_socket=/Applications/XAMPP/xamppfiles/var/mysql/mysql.sock;dbname=spi_hub;charset=utf8mb4';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO($dsn, $user, $pass);
    echo "Database connection: OK\n";

    // Check if chat_messages table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'chat_messages'");
    if ($stmt->rowCount() > 0) {
        echo "Table chat_messages: EXISTS\n";

        // Count messages
        $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM chat_messages");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "Message count: " . $result['cnt'] . "\n";
    } else {
        echo "Table chat_messages: NOT FOUND\n";

        // Create table
        $sql = "CREATE TABLE chat_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sender VARCHAR(100) NOT NULL,
            sender_name VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_created_at (created_at),
            INDEX idx_sender (sender)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

        $pdo->exec($sql);
        echo "Table created successfully!\n";
    }
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}