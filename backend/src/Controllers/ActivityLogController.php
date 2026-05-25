<?php

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Database;

final class ActivityLogController
{
    public function index(Request $request): void
    {
        $limit = isset($request->query['limit']) ? (int) $request->query['limit'] : 50;
        $offset = isset($request->query['offset']) ? (int) $request->query['offset'] : 0;

        set_time_limit(5);

        try {
            $logs = Database::query(
                "SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?",
                [$limit, $offset]
            );

            $countResult = Database::queryOne(
                "SELECT COUNT(*) as total FROM activity_logs"
            );

            Response::json([
                'status' => 'success',
                'data' => $logs,
                'total' => $countResult['total'] ?? 0,
            ]);
        } catch (\Exception $e) {
            Response::json([
                'status' => 'error',
                'message' => 'Gagal mengambil data log aktivitas',
            ], 500);
        }
    }

    public function store(Request $request): void
    {
        $body = $request->body;

        $userId = $body['user_id'] ?? null;
        $user = $body['user'] ?? 'System';
        $userRole = $body['user_role'] ?? '';
        $action = $body['action'] ?? '';
        $details = $body['details'] ?? '';
        $category = $body['category'] ?? '';
        $ipAddress = $request->headers['X-Forwarded-For']
            ?? $request->headers['X-Real-IP']
            ?? '127.0.0.1';

        if (!$action) {
            Response::json([
                'status' => 'error',
                'message' => 'Action wajib diisi',
            ], 422);
            return;
        }

        try {
            $id = 'log-' . uniqid() . '-' . time();

            Database::execute(
                "INSERT INTO activity_logs (id, user_id, user, user_role, action, details, ip_address, category)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [$id, $userId, $user, $userRole, $action, $details, $ipAddress, $category]
            );

            $newLog = Database::queryOne(
                "SELECT * FROM activity_logs WHERE id = ?",
                [$id]
            );

            Response::json([
                'status' => 'success',
                'message' => 'Log aktivitas berhasil disimpan',
                'data' => $newLog,
            ], 201);
        } catch (\Exception $e) {
            Response::json([
                'status' => 'error',
                'message' => 'Gagal menyimpan log aktivitas',
            ], 500);
        }
    }

    public function getByUser(Request $request, string $userId): void
    {
        $limit = isset($request->query['limit']) ? (int) $request->query['limit'] : 50;

        try {
            $logs = Database::query(
                "SELECT * FROM activity_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?",
                [$userId, $limit]
            );

            Response::json([
                'status' => 'success',
                'data' => $logs,
            ]);
        } catch (\Exception $e) {
            Response::json([
                'status' => 'error',
                'message' => 'Gagal mengambil data log aktivitas',
            ], 500);
        }
    }

    public function getByCategory(Request $request, string $category): void
    {
        $limit = isset($request->query['limit']) ? (int) $request->query['limit'] : 50;

        try {
            $logs = Database::query(
                "SELECT * FROM activity_logs WHERE category = ? ORDER BY timestamp DESC LIMIT ?",
                [$category, $limit]
            );

            Response::json([
                'status' => 'success',
                'data' => $logs,
            ]);
        } catch (\Exception $e) {
            Response::json([
                'status' => 'error',
                'message' => 'Gagal mengambil data log aktivitas',
            ], 500);
        }
    }

    public function stats(Request $request): void
    {
        try {
            $total = Database::queryOne("SELECT COUNT(*) as count FROM activity_logs");
            $today = Database::queryOne(
                "SELECT COUNT(*) as count FROM activity_logs WHERE DATE(timestamp) = CURDATE()"
            );
            $weekAgo = Database::queryOne(
                "SELECT COUNT(*) as count FROM activity_logs WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
            );

            // Activity by category
            $byCategory = Database::query(
                "SELECT category, COUNT(*) as count FROM activity_logs GROUP BY category ORDER BY count DESC"
            );

            // Recent activity (last 24 hours)
            $recentActivity = Database::query(
                "SELECT HOUR(timestamp) as hour, COUNT(*) as count
                 FROM activity_logs
                 WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
                 GROUP BY HOUR(timestamp)
                 ORDER BY hour"
            );

            Response::json([
                'status' => 'success',
                'data' => [
                    'total' => $total['count'] ?? 0,
                    'today' => $today['count'] ?? 0,
                    'this_week' => $weekAgo['count'] ?? 0,
                    'by_category' => $byCategory,
                    'recent_activity' => $recentActivity,
                ],
            ]);
        } catch (\Exception $e) {
            Response::json([
                'status' => 'error',
                'message' => 'Gagal mengambil statistik',
            ], 500);
        }
    }
}