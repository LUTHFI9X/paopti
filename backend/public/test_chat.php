<?php
// Test script to send a message directly

require_once __DIR__ . '/../src/Core/Database.php';
require_once __DIR__ . '/../src/Core/Response.php';

use App\Core\Database;
use App\Core\Response;

// Insert test message
try {
    Database::execute(
        "INSERT INTO chat_messages (sender, sender_name, message) VALUES (?, ?, ?)",
        ['u2', 'Ahmad Auditor', 'Test message from direct insert']
    );
    echo "Message inserted successfully!\n";

    // Verify
    $messages = Database::query("SELECT * FROM chat_messages ORDER BY id DESC LIMIT 5", []);
    foreach ($messages as $msg) {
        echo "ID: {$msg['id']} | From: {$msg['sender_name']} | Message: {$msg['message']}\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}