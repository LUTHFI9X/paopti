<?php

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Database;

final class UsersController
{
    public function index(Request $request): void
    {
        try {
            $users = Database::query(
                "SELECT id, username, name, email, role, department, phone, status, created_at FROM users ORDER BY name",
                []
            );

            // Map role from database format to frontend format
            $users = array_map(function ($user) {
                $user['role'] = $this->extractRole($user['role']);
                unset($user['password']);
                return $user;
            }, $users);
        } catch (\Exception $e) {
            $users = [];
        }

        Response::json([
            'status' => 'success',
            'data' => $users,
        ]);
    }

    public function show(Request $request, string $id): void
    {
        try {
            $user = Database::queryOne(
                "SELECT id, username, name, email, role, department, phone, status, created_at FROM users WHERE id = ?",
                [$id]
            );

            if (!$user) {
                Response::json(['status' => 'error', 'message' => 'User tidak ditemukan'], 404);
                return;
            }

            $user['role'] = $this->extractRole($user['role']);
            unset($user['password']);
        } catch (\Exception $e) {
            Response::json(['status' => 'error', 'message' => 'User tidak ditemukan'], 404);
            return;
        }

        Response::json(['status' => 'success', 'data' => $user]);
    }

    public function store(Request $request): void
    {
        $body = $request->body;

        if (empty($body['username']) || empty($body['password']) || empty($body['name'])) {
            Response::json(['status' => 'error', 'message' => 'Username, password, dan nama wajib diisi'], 422);
            return;
        }

        $id = $body['id'] ?? 'user-' . uniqid();
        $username = trim($body['username']);
        $password = $body['password'];
        $name = trim($body['name']);
        $role = $body['role'] ?? 'auditor';
        $email = $body['email'] ?? '';
        $department = $body['department'] ?? '';
        $phone = $body['phone'] ?? '';
        $status = $body['status'] ?? 'active';

        // Check if username already exists
        try {
            $existing = Database::queryOne("SELECT id FROM users WHERE username = ?", [$username]);
            if ($existing) {
                Response::json(['status' => 'error', 'message' => 'Username sudah digunakan'], 409);
                return;
            }
        } catch (\Exception $e) {}

        // Validate role
        $validRoles = ['admin', 'auditor', 'kspi'];
        if (!in_array($role, $validRoles)) {
            $role = 'auditor';
        }

        // Hash password
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        try {
            Database::execute(
                "INSERT INTO users (id, username, password, name, role, email, department, phone, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [$id, $username, $hashedPassword, $name, $role, $email, $department, $phone, $status]
            );
        } catch (\Exception $e) {
            Response::json(['status' => 'error', 'message' => 'Gagal membuat user: ' . $e->getMessage()], 500);
            return;
        }

        Response::json([
            'status' => 'success',
            'message' => 'User berhasil dibuat',
            'data' => [
                'id' => $id,
                'username' => $username,
                'name' => $name,
                'role' => $role,
                'email' => $email,
                'department' => $department,
                'phone' => $phone,
                'status' => $status,
            ],
        ], 201);
    }

    public function update(Request $request, string $id): void
    {
        $body = $request->body;

        try {
            $existing = Database::queryOne("SELECT id FROM users WHERE id = ?", [$id]);
            if (!$existing) {
                Response::json(['status' => 'error', 'message' => 'User tidak ditemukan'], 404);
                return;
            }
        } catch (\Exception $e) {
            Response::json(['status' => 'error', 'message' => 'User tidak ditemukan'], 404);
            return;
        }

        // Check if username is being changed and already exists
        if (isset($body['username'])) {
            try {
                $existingUsername = Database::queryOne(
                    "SELECT id FROM users WHERE username = ? AND id != ?",
                    [$body['username'], $id]
                );
                if ($existingUsername) {
                    Response::json(['status' => 'error', 'message' => 'Username sudah digunakan'], 409);
                    return;
                }
            } catch (\Exception $e) {}
        }

        // Build update query
        $fields = [];
        $values = [];

        if (isset($body['username'])) {
            $fields[] = 'username = ?';
            $values[] = $body['username'];
        }
        if (isset($body['password']) && $body['password']) {
            $fields[] = 'password = ?';
            $values[] = password_hash($body['password'], PASSWORD_DEFAULT);
        }
        if (isset($body['name'])) {
            $fields[] = 'name = ?';
            $values[] = $body['name'];
        }
        if (isset($body['role'])) {
            $fields[] = 'role = ?';
            $validRoles = ['admin', 'auditor', 'kspi'];
            $values[] = in_array($body['role'], $validRoles) ? $body['role'] : 'auditor';
        }
        if (isset($body['email'])) {
            $fields[] = 'email = ?';
            $values[] = $body['email'];
        }
        if (isset($body['department'])) {
            $fields[] = 'department = ?';
            $values[] = $body['department'];
        }
        if (isset($body['phone'])) {
            $fields[] = 'phone = ?';
            $values[] = $body['phone'];
        }
        if (isset($body['status'])) {
            $fields[] = 'status = ?';
            $values[] = $body['status'];
        }

        if (empty($fields)) {
            Response::json(['status' => 'error', 'message' => 'Tidak ada data yang diupdate'], 400);
            return;
        }

        $values[] = $id;

        try {
            Database::execute("UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?", $values);
        } catch (\Exception $e) {
            Response::json(['status' => 'error', 'message' => 'Gagal mengupdate user'], 500);
            return;
        }

        $updated = Database::queryOne(
            "SELECT id, username, name, email, role, department, phone, status FROM users WHERE id = ?",
            [$id]
        );
        $updated['role'] = $this->extractRole($updated['role']);
        unset($updated['password']);

        Response::json([
            'status' => 'success',
            'message' => 'User berhasil diupdate',
            'data' => $updated,
        ]);
    }

    public function destroy(Request $request, string $id): void
    {
        try {
            $existing = Database::queryOne("SELECT id FROM users WHERE id = ?", [$id]);
            if (!$existing) {
                Response::json(['status' => 'error', 'message' => 'User tidak ditemukan'], 404);
                return;
            }
        } catch (\Exception $e) {
            Response::json(['status' => 'error', 'message' => 'User tidak ditemukan'], 404);
            return;
        }

        try {
            Database::execute("DELETE FROM users WHERE id = ?", [$id]);
        } catch (\Exception $e) {
            Response::json(['status' => 'error', 'message' => 'Gagal menghapus user'], 500);
            return;
        }

        Response::json(['status' => 'success', 'message' => 'User berhasil dihapus']);
    }

    public function resetPassword(Request $request, string $id): void
    {
        $body = $request->body;

        if (empty($body['password'])) {
            Response::json(['status' => 'error', 'message' => 'Password baru wajib diisi'], 422);
            return;
        }

        try {
            $existing = Database::queryOne("SELECT id FROM users WHERE id = ?", [$id]);
            if (!$existing) {
                Response::json(['status' => 'error', 'message' => 'User tidak ditemukan'], 404);
                return;
            }
        } catch (\Exception $e) {
            Response::json(['status' => 'error', 'message' => 'User tidak ditemukan'], 404);
            return;
        }

        $hashedPassword = password_hash($body['password'], PASSWORD_DEFAULT);

        try {
            Database::execute("UPDATE users SET password = ? WHERE id = ?", [$hashedPassword, $id]);
        } catch (\Exception $e) {
            Response::json(['status' => 'error', 'message' => 'Gagal mereset password'], 500);
            return;
        }

        Response::json(['status' => 'success', 'message' => 'Password berhasil direset']);
    }

    private function extractRole(string $role): string
    {
        // Handle both 'role-admin' and 'admin' formats
        if (str_starts_with($role, 'role-')) {
            return substr($role, 5);
        }
        return $role;
    }
}