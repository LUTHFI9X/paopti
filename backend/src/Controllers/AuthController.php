<?php

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Database;

final class AuthController
{
    private static array $defaultUsers = [
        'admin' => ['id' => 'u1', 'username' => 'admin', 'password' => 'admin123', 'name' => 'Administrator', 'role' => 'admin', 'email' => 'admin@aopti.go.id', 'department' => 'Pengawasan Intern'],
        'auditor' => ['id' => 'u2', 'username' => 'auditor', 'password' => 'auditor123', 'name' => 'Ahmad Auditor', 'role' => 'auditor', 'email' => 'ahmad.auditor@aopti.go.id', 'department' => 'Tim Audit 1'],
        'kspi' => ['id' => 'u3', 'username' => 'kspi', 'password' => 'kspi123', 'name' => 'Budi KSPI', 'role' => 'kspi', 'email' => 'budi.kspi@aopti.go.id', 'department' => 'KSPI'],
    ];

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

        // Use default users for fast, reliable login
        $user = null;
        $defaultUser = self::$defaultUsers[$username] ?? null;
        if ($defaultUser && $defaultUser['password'] === $password) {
            $user = $defaultUser;
        }

        // If not a default user, try database (with timeout)
        if ($user === null) {
            set_time_limit(5);
            try {
                $dbUser = Database::queryOne(
                    "SELECT id, username, password, name, email, role, department FROM users WHERE username = ? AND status = 'active'",
                    [$username]
                );

                if ($dbUser) {
                    if (password_verify($password, $dbUser['password']) || $dbUser['password'] === $password) {
                        $user = [
                            'id' => $dbUser['id'],
                            'username' => $dbUser['username'],
                            'name' => $dbUser['name'],
                            'role' => $dbUser['role'] ?? 'auditor',
                            'email' => $dbUser['email'] ?? '',
                            'department' => $dbUser['department'] ?? '',
                        ];
                    }
                }
            } catch (\Exception $e) {
                // Database unavailable - login with default users only
            }
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
                ],
            ],
        ]);
    }

    public function logout(Request $request): void
    {
        $authHeader = $request->headers['Authorization'] ?? '';

        if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
            $token = substr($authHeader, 7);
            $decoded = json_decode(base64_decode($token), true);

            if ($decoded && isset($decoded['user_id'])) {
                // Get user info before invalidating
                $user = $this->findUserById($decoded['user_id']);
                if (!$user) {
                    $user = self::$defaultUsers[$decoded['user_id']] ?? null;
                }

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

        // Try database first
        $user = $this->findUserById($userId);

        // Fallback to default users
        if ($user === null) {
            $defaultUsers = [
                'u1' => ['id' => 'u1', 'username' => 'admin', 'name' => 'Administrator', 'role' => 'admin', 'email' => 'admin@aopti.go.id', 'department' => 'Pengawasan Intern'],
                'u2' => ['id' => 'u2', 'username' => 'auditor', 'name' => 'Ahmad Auditor', 'role' => 'auditor', 'email' => 'ahmad.auditor@aopti.go.id', 'department' => 'Tim Audit 1'],
                'u3' => ['id' => 'u3', 'username' => 'kspi', 'name' => 'Budi KSPI', 'role' => 'kspi', 'email' => 'budi.kspi@aopti.go.id', 'department' => 'KSPI'],
            ];
            $user = $defaultUsers[$userId] ?? null;
        }

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
            // Check default users
            $defaultUsers = [
                'u1' => ['id' => 'u1', 'username' => 'admin', 'name' => 'Administrator', 'role' => 'admin', 'email' => 'admin@aopti.go.id', 'department' => 'Pengawasan Intern'],
                'u2' => ['id' => 'u2', 'username' => 'auditor', 'name' => 'Ahmad Auditor', 'role' => 'auditor', 'email' => 'ahmad.auditor@aopti.go.id', 'department' => 'Tim Audit 1'],
                'u3' => ['id' => 'u3', 'username' => 'kspi', 'name' => 'Budi KSPI', 'role' => 'kspi', 'email' => 'budi.kspi@aopti.go.id', 'department' => 'KSPI'],
            ];
            $user = $defaultUsers[$userId] ?? null;
        }

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
                "SELECT id, username, name, email, role, department FROM users WHERE id = ? AND status = 'active'",
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
                } else {
                    // Check default users
                    $defaultUsers = [
                        'user-admin' => ['name' => 'Administrator', 'role' => 'admin'],
                        'user-auditor' => ['name' => 'Ahmad Auditor', 'role' => 'auditor'],
                        'user-kspi' => ['name' => 'Budi KSPI', 'role' => 'kspi'],
                    ];
                    $defaultUser = $defaultUsers[$userId] ?? null;
                    if ($defaultUser) {
                        $userName = $defaultUser['name'];
                        $userRole = $defaultUser['role'];
                    }
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