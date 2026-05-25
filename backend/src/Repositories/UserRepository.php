<?php

namespace App\Repositories;

use App\Core\Database;

class UserRepository
{
    public function findByUsername(string $username): ?array
    {
        return Database::queryOne(
            'SELECT * FROM users WHERE username = ?',
            [$username]
        );
    }

    public function findById(string $id): ?array
    {
        return Database::queryOne(
            'SELECT * FROM users WHERE id = ?',
            [$id]
        );
    }

    public function findAll(): array
    {
        return Database::query('SELECT * FROM users ORDER BY created_at DESC');
    }

    public function create(array $data): bool
    {
        return Database::execute(
            'INSERT INTO users (id, username, password, name, role, email, department, phone, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $data['id'],
                $data['username'],
                $data['password'],
                $data['name'],
                $data['role'] ?? 'auditor',
                $data['email'] ?? '',
                $data['department'] ?? '',
                $data['phone'] ?? '',
                $data['status'] ?? 'active',
            ]
        ) > 0;
    }

    public function update(string $id, array $data): bool
    {
        $fields = [];
        $values = [];

        foreach ($data as $key => $value) {
            $fields[] = "$key = ?";
            $values[] = $value;
        }

        $values[] = $id;
        $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?';

        return Database::execute($sql, $values) > 0;
    }

    public function delete(string $id): bool
    {
        return Database::execute('DELETE FROM users WHERE id = ?', [$id]) > 0;
    }

    public function existsByUsername(string $username, ?string $excludeId = null): bool
    {
        if ($excludeId) {
            $result = Database::queryOne(
                'SELECT id FROM users WHERE username = ? AND id != ?',
                [$username, $excludeId]
            );
        } else {
            $result = Database::queryOne(
                'SELECT id FROM users WHERE username = ?',
                [$username]
            );
        }
        return $result !== null;
    }
}