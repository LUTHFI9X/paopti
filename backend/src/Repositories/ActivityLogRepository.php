<?php

namespace App\Repositories;

use App\Core\Database;

class ActivityLogRepository
{
    public function findAll(int $limit = 50): array
    {
        return Database::query(
            'SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT ?',
            [$limit]
        );
    }

    public function findByUser(string $userId, int $limit = 50): array
    {
        return Database::query(
            'SELECT * FROM activity_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
            [$userId, $limit]
        );
    }

    public function create(array $data): bool
    {
        return Database::execute(
            'INSERT INTO activity_logs (id, user_id, user, user_role, action, details, ip_address, category)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $data['id'],
                $data['user_id'],
                $data['user'],
                $data['user_role'],
                $data['action'],
                $data['details'] ?? '',
                $data['ip_address'] ?? '127.0.0.1',
                $data['category'] ?? '',
            ]
        ) > 0;
    }

    public function deleteOlderThan(int $days): int
    {
        $date = date('Y-m-d H:i:s', strtotime("-{$days} days"));
        return Database::execute('DELETE FROM activity_logs WHERE timestamp < ?', [$date]);
    }
}