<?php

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Database;

final class ChatController
{
    public function index(Request $request): void
    {
        $lastId = isset($request->query['last_id']) ? (int) $request->query['last_id'] : 0;
        $limit = isset($request->query['limit']) ? (int) $request->query['limit'] : 50;
        $type = $request->query['type'] ?? 'all';
        $userId = $request->query['user_id'] ?? null;
        $currentUserId = $request->query['current_user_id'] ?? null;

        set_time_limit(3);

        $messages = [];
        try {
            if ($type === 'group') {
                $messages = Database::query(
                    "SELECT id, sender, sender_name, recipient, message, created_at FROM chat_messages WHERE id > ? AND recipient IS NULL ORDER BY id DESC LIMIT ?",
                    [$lastId, $limit]
                );
            } elseif ($type === 'private' && $userId && $currentUserId) {
                $messages = Database::query(
                    "SELECT id, sender, sender_name, recipient, message, created_at FROM chat_messages WHERE id > ? AND ((sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?)) ORDER BY id DESC LIMIT ?",
                    [$lastId, $userId, $currentUserId, $currentUserId, $userId, $limit]
                );
            } else {
                $messages = Database::query(
                    "SELECT id, sender, sender_name, recipient, message, created_at FROM chat_messages WHERE id > ? ORDER BY id DESC LIMIT ?",
                    [$lastId, $limit]
                );
            }
            $messages = array_reverse($messages);
        } catch (\Exception $e) {}

        Response::json([
            'status' => 'success',
            'data' => $messages,
        ]);
    }

    public function store(Request $request): void
    {
        $body = $request->body;

        if (empty($body['message'])) {
            Response::json(['status' => 'error', 'message' => 'Pesan tidak boleh kosong'], 422);
            return;
        }

        $sender = $body['sender'] ?? 'anonymous';
        $senderName = $body['sender_name'] ?? 'Anonymous';
        $recipient = null;
        $messageType = $body['message_type'] ?? 'group';
        $message = trim($body['message']);

        if ($messageType === 'private' && !empty($body['recipient'])) {
            $recipient = $body['recipient'];
        }

        try {
            Database::execute(
                "INSERT INTO chat_messages (sender, sender_name, recipient, message) VALUES (?, ?, ?, ?)",
                [$sender, $senderName, $recipient, $message]
            );

            $id = Database::lastInsertId();
            $newMessage = Database::queryOne(
                "SELECT id, sender, sender_name, recipient, message, created_at FROM chat_messages WHERE id = ?",
                [$id]
            );
        } catch (\Exception $e) {
            Response::json(['status' => 'error', 'message' => 'Gagal mengirim pesan'], 500);
            return;
        }

        Response::json([
            'status' => 'success',
            'message' => 'Pesan berhasil dikirim',
            'data' => $newMessage,
        ], 201);
    }

    public function stream(Request $request): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }

        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
        header('Connection: keep-alive');
        header('X-Accel-Buffering: no');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Credentials: true');
        header('Max-Age: 0');

        while (ob_get_level()) {
            ob_end_clean();
        }

        $lastId = isset($request->query['last_id']) ? (int) $request->query['last_id'] : 0;
        $clientId = uniqid('client_');
        $startTime = time();
        $lastMessageId = $lastId;

        set_time_limit(300);

        echo "event: connected\n";
        echo "data: " . json_encode(['client_id' => $clientId, 'timestamp' => date('c'), 'last_id' => $lastMessageId]) . "\n\n";
        flush();

        $sleepCount = 0;
        $maxSleep = 600;

        while ($sleepCount < $maxSleep) {
            if (connection_aborted()) {
                break;
            }

            try {
                $messages = Database::query(
                    "SELECT id, sender, sender_name, recipient, message, created_at FROM chat_messages WHERE id > ? ORDER BY id ASC LIMIT 10",
                    [$lastMessageId]
                );

                if (!empty($messages)) {
                    foreach ($messages as $msg) {
                        echo "event: message\n";
                        echo "data: " . json_encode($msg) . "\n\n";
                        $lastMessageId = $msg['id'];
                    }
                    flush();
                }
            } catch (\Exception $e) {
                error_log('Chat SSE error: ' . $e->getMessage());
            }

            usleep(500000);
            $sleepCount++;
        }

        echo "event: close\n";
        echo "data: " . json_encode(['reason' => 'timeout']) . "\n\n";
        flush();
    }
}