<?php

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Database;

final class AuthController
{
    public function login(Request $request): void
    {
        $username = trim((string) ($request->body['username'] ?? ''));
        $password = trim((string) ($request->body['password'] ?? ''));

        if ($username === '' || $password === '') {
            Response::json([
                'status' => 'error',
                'message' => 'Username dan password wajib diisi',
            ], 422);
            return;
        }

        $user = null;

        set_time_limit(5);
        try {
            $dbUser = Database::queryOne(
                "SELECT id, username, password, name, email, role, department,
                        COALESCE(must_change_password, 0) AS must_change_password
                 FROM users WHERE username = ? AND status = 'active'",
                [$username]
            );

            if ($dbUser && (password_verify($password, $dbUser['password']) || $dbUser['password'] === $password)) {
                $user = [
                    'id' => $dbUser['id'],
                    'username' => $dbUser['username'],
                    'name' => $dbUser['name'],
                    'role' => $dbUser['role'] ?? 'auditor',
                    'email' => $dbUser['email'] ?? '',
                    'department' => $dbUser['department'] ?? '',
                    'must_change_password' => (int) ($dbUser['must_change_password'] ?? 0) === 1,
                ];
            }
        } catch (\Exception $e) {
            Response::json([
                'status' => 'error',
                'message' => 'Tidak dapat terhubung ke database',
            ], 500);
            return;
        }

        if (!$user) {
            // Log failed login attempt
            $this->logActivity(null, 'Login Gagal', "Percobaan login gagal untuk username: $username", 'auth', $request);

            Response::json([
                'status' => 'error',
                'message' => 'Username atau password salah',
            ], 401);
            return;
        }

        // Generate token
        $token = base64_encode(json_encode([
            'user_id' => $user['id'],
            'username' => $user['username'],
            'role' => $user['role'],
            'exp' => time() + 86400,
            'sid' => uniqid('sess_'),
        ]));

        // Store session in database
        $sessionId = uniqid('sess_');
        $expiresAt = date('Y-m-d H:i:s', time() + 86400);
        $ipAddress = $request->headers['X-Forwarded-For'] ?? $request->headers['X-Real-IP'] ?? '127.0.0.1';
        $userAgent = $request->headers['User-Agent'] ?? '';

        try {
            Database::execute(
                "INSERT INTO sessions (id, user_id, token, ip_address, user_agent, expires_at)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE token = VALUES(token), last_activity = CURRENT_TIMESTAMP, expires_at = VALUES(expires_at), is_active = TRUE",
                [$sessionId, $user['id'], $token, $ipAddress, $userAgent, $expiresAt]
            );
        } catch (\Exception $e) {
            // Session storage failed, continue without session tracking
        }

        // Log successful login
        $this->logActivity($user['id'], 'Login', "User {$user['name']} berhasil login", 'auth', $request);

        Response::json([
            'status' => 'success',
            'message' => 'Login berhasil',
            'data' => [
                'token' => $token,
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'name' => $user['name'],
                    'role' => $user['role'],
                    'email' => $user['email'] ?? '',
                    'department' => $user['department'] ?? '',
                    'must_change_password' => (bool) ($user['must_change_password'] ?? false),
                ],
            ],
        ]);
    }

    public function changePassword(Request $request): void
    {
        $authHeader = $request->headers['Authorization'] ?? '';
        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            Response::json(['status' => 'error', 'message' => 'Unauthorized'], 401);
            return;
        }
        $token = substr($authHeader, 7);
        $decoded = json_decode(base64_decode($token), true);
        if (!$decoded || !isset($decoded['user_id'])) {
            Response::json(['status' => 'error', 'message' => 'Token tidak valid'], 401);
            return;
        }

        $currentPassword = (string) ($request->body['current_password'] ?? '');
        $newPassword = (string) ($request->body['new_password'] ?? '');
        $forced = (bool) ($request->body['forced'] ?? false);

        if ($newPassword === '' || strlen($newPassword) < 8) {
            Response::json(['status' => 'error', 'message' => 'Password baru minimal 8 karakter'], 422);
            return;
        }
        if (!preg_match('/[A-Za-z]/', $newPassword) || !preg_match('/[0-9]/', $newPassword)) {
            Response::json(['status' => 'error', 'message' => 'Password baru harus mengandung huruf dan angka'], 422);
            return;
        }

        try {
            $row = Database::queryOne(
                "SELECT id, password, COALESCE(must_change_password,0) AS must_change_password FROM users WHERE id = ?",
                [$decoded['user_id']]
            );
        } catch (\Exception $e) {
            Response::json(['status' => 'error', 'message' => 'Gagal memuat user'], 500);
            return;
        }
        if (!$row) {
            Response::json(['status' => 'error', 'message' => 'User tidak ditemukan'], 404);
            return;
        }

        $isForcedFlow = $forced && (int) $row['must_change_password'] === 1;
        if (!$isForcedFlow) {
            if ($currentPassword === '') {
                Response::json(['status' => 'error', 'message' => 'Password saat ini wajib diisi'], 422);
                return;
            }
            $ok = password_verify($currentPassword, $row['password']) || $row['password'] === $currentPassword;
            if (!$ok) {
                Response::json(['status' => 'error', 'message' => 'Password saat ini salah'], 401);
                return;
            }
        }

        if (password_verify($newPassword, $row['password']) || $row['password'] === $newPassword) {
            Response::json(['status' => 'error', 'message' => 'Password baru tidak boleh sama dengan password lama'], 422);
            return;
        }

        $hashed = password_hash($newPassword, PASSWORD_DEFAULT);
        try {
            Database::execute(
                "UPDATE users SET password = ?, must_change_password = 0, password_changed_at = CURRENT_TIMESTAMP WHERE id = ?",
                [$hashed, $decoded['user_id']]
            );
        } catch (\Exception $e) {
            Response::json(['status' => 'error', 'message' => 'Gagal memperbarui password'], 500);
            return;
        }

        $this->logActivity($decoded['user_id'], 'Ganti Password', 'User mengganti password' . ($isForcedFlow ? ' (login pertama)' : ''), 'auth', $request);

        Response::json(['status' => 'success', 'message' => 'Password berhasil diperbarui']);
    }

    public function logout(Request $request): void
    {
        $authHeader = $request->headers['Authorization'] ?? '';

        if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
            $token = substr($authHeader, 7);
            $decoded = json_decode(base64_decode($token), true);

            if ($decoded && isset($decoded['user_id'])) {
                $user = $this->findUserById($decoded['user_id']);

                // Invalidate session in database
                try {
                    Database::execute(
                        "UPDATE sessions SET is_active = FALSE WHERE token = ?",
                        [$token]
                    );
                } catch (\Exception $e) {
                    // Session invalidation failed, continue
                }

                // Log logout activity
                if ($user) {
                    $this->logActivity($user['id'], 'Logout', "User {$user['name']} keluar dari sistem", 'auth', $request);
                }
            }
        }

        Response::json([
            'status' => 'success',
            'message' => 'Logout berhasil',
        ]);
    }

    public function me(Request $request): void
    {
        $authHeader = $request->headers['Authorization'] ?? '';

        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            Response::json([
                'status' => 'error',
                'message' => 'Unauthorized',
            ], 401);
            return;
        }

        $token = substr($authHeader, 7);
        $decoded = json_decode(base64_decode($token), true);

        if (!$decoded || !isset($decoded['user_id'])) {
            Response::json([
                'status' => 'error',
                'message' => 'Invalid token',
            ], 401);
            return;
        }

        if (isset($decoded['exp']) && $decoded['exp'] < time()) {
            // Token expired - invalidate session
            try {
                Database::execute("UPDATE sessions SET is_active = FALSE WHERE token = ?", [$token]);
            } catch (\Exception $e) {}

            Response::json([
                'status' => 'error',
                'message' => 'Token expired',
            ], 401);
            return;
        }

        $userId = $decoded['user_id'];

        $user = $this->findUserById($userId);

        if (!$user) {
            Response::json([
                'status' => 'error',
                'message' => 'User not found',
            ], 404);
            return;
        }

        // Update last activity in session
        try {
            Database::execute(
                "UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE token = ? AND is_active = TRUE",
                [$token]
            );
        } catch (\Exception $e) {}

        Response::json([
            'status' => 'success',
            'data' => $user,
        ]);
    }

    public function refresh(Request $request): void
    {
        $authHeader = $request->headers['Authorization'] ?? '';

        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            Response::json([
                'status' => 'error',
                'message' => 'Unauthorized',
            ], 401);
            return;
        }

        $token = substr($authHeader, 7);
        $decoded = json_decode(base64_decode($token), true);

        if (!$decoded || !isset($decoded['user_id'])) {
            Response::json([
                'status' => 'error',
                'message' => 'Invalid token',
            ], 401);
            return;
        }

        $userId = $decoded['user_id'];
        $user = $this->findUserById($userId);

        if (!$user) {
            Response::json([
                'status' => 'error',
                'message' => 'User not found',
            ], 404);
            return;
        }

        // Generate new token
        $newToken = base64_encode(json_encode([
            'user_id' => $user['id'],
            'username' => $user['username'],
            'role' => $user['role'],
            'exp' => time() + 86400,
            'sid' => uniqid('sess_'),
        ]));

        // Update session
        $expiresAt = date('Y-m-d H:i:s', time() + 86400);
        $ipAddress = $request->headers['X-Forwarded-For'] ?? $request->headers['X-Real-IP'] ?? '127.0.0.1';
        $userAgent = $request->headers['User-Agent'] ?? '';

        try {
            Database::execute(
                "UPDATE sessions SET token = ?, expires_at = ?, last_activity = CURRENT_TIMESTAMP WHERE token = ?",
                [$newToken, $expiresAt, $token]
            );
        } catch (\Exception $e) {}

        Response::json([
            'status' => 'success',
            'message' => 'Token refreshed',
            'data' => [
                'token' => $newToken,
                'user' => $user,
            ],
        ]);
    }

    public function activeSessions(Request $request): void
    {
        $authHeader = $request->headers['Authorization'] ?? '';

        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            Response::json([
                'status' => 'error',
                'message' => 'Unauthorized',
            ], 401);
            return;
        }

        $token = substr($authHeader, 7);
        $decoded = json_decode(base64_decode($token), true);

        if (!$decoded || !isset($decoded['user_id'])) {
            Response::json([
                'status' => 'error',
                'message' => 'Invalid token',
            ], 401);
            return;
        }

        try {
            $sessions = Database::query(
                "SELECT id, ip_address, user_agent, created_at, last_activity, expires_at
                 FROM sessions WHERE user_id = ? AND is_active = TRUE
                 ORDER BY last_activity DESC",
                [$decoded['user_id']]
            );

            // Mark current session
            foreach ($sessions as &$session) {
                $session['is_current'] = ($session['id'] === ($decoded['sid'] ?? ''));
            }

            Response::json([
                'status' => 'success',
                'data' => $sessions,
            ]);
        } catch (\Exception $e) {
            Response::json([
                'status' => 'error',
                'message' => 'Gagal mengambil sesi aktif',
            ], 500);
        }
    }

    public function revokeSession(Request $request, string $sessionId): void
    {
        $authHeader = $request->headers['Authorization'] ?? '';

        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            Response::json([
                'status' => 'error',
                'message' => 'Unauthorized',
            ], 401);
            return;
        }

        try {
            Database::execute(
                "UPDATE sessions SET is_active = FALSE WHERE id = ?",
                [$sessionId]
            );

            Response::json([
                'status' => 'success',
                'message' => 'Sesi berhasil diinvalidasi',
            ]);
        } catch (\Exception $e) {
            Response::json([
                'status' => 'error',
                'message' => 'Gagal menginvalidasi sesi',
            ], 500);
        }
    }

    private function findUserById(string $userId): ?array
    {
        try {
            $result = Database::queryOne(
                "SELECT id, username, name, email, role, department, COALESCE(must_change_password,0) AS must_change_password FROM users WHERE id = ? AND status = 'active'",
                [$userId]
            );

            if ($result) {
                return [
                    'id' => $result['id'],
                    'username' => $result['username'],
                    'name' => $result['name'],
                    'role' => $result['role'],
                    'email' => $result['email'] ?? '',
                    'department' => $result['department'] ?? '',
                    'must_change_password' => (int) ($result['must_change_password'] ?? 0) === 1,
                ];
            }
            return null;
        } catch (\Exception $e) {
            return null;
        }
    }

    private function logActivity(?string $userId, string $action, string $details, string $category, Request $request): void
    {
        try {
            $id = 'log-' . uniqid() . '-' . time();
            $ipAddress = $request->headers['X-Forwarded-For'] ?? $request->headers['X-Real-IP'] ?? '127.0.0.1';

            // Get user info if available
            $userName = 'System';
            $userRole = '';

            if ($userId) {
                $user = $this->findUserById($userId);
                if ($user) {
                    $userName = $user['name'];
                    $userRole = $user['role'];
                }
            }

            Database::execute(
                "INSERT INTO activity_logs (id, user_id, user, user_role, action, details, ip_address, category)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [$id, $userId ?? '', $userName, $userRole, $action, $details, $ipAddress, $category]
            );
        } catch (\Exception $e) {
            // Silently fail - don't break the main flow
        }
    }

    // Helper method to log activities from other controllers
    public static function log(string $userId, string $userName, string $userRole, string $action, string $details, string $category = 'general', string $ipAddress = '127.0.0.1'): void
    {
        try {
            $id = 'log-' . uniqid() . '-' . time();
            Database::execute(
                "INSERT INTO activity_logs (id, user_id, user, user_role, action, details, ip_address, category)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [$id, $userId, $userName, $userRole, $action, $details, $ipAddress, $category]
            );
        } catch (\Exception $e) {
            // Silently fail
        }
    }
}