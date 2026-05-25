<?php

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Database;

final class DashboardController
{
    public function summary(Request $request): void
    {
        $year = isset($request->query['year']) ? (int) $request->query['year'] : (int) date('Y');

        try {
            $totalPlans = Database::queryOne(
                "SELECT COUNT(*) as count FROM audit_plans WHERE YEAR(start_date) = ?",
                [$year]
            )['count'] ?? 0;

            $completedPlans = Database::queryOne(
                "SELECT COUNT(*) as count FROM audit_plans WHERE YEAR(start_date) = ? AND (status = 'completed' OR completed = 1)",
                [$year]
            )['count'] ?? 0;

            $inProgressPlans = Database::queryOne(
                "SELECT COUNT(*) as count FROM audit_plans WHERE YEAR(start_date) = ? AND status = 'in_progress'",
                [$year]
            )['count'] ?? 0;

            $totalWorklist = Database::queryOne(
                "SELECT COUNT(*) as count FROM worklist WHERE year = ?",
                [$year]
            )['count'] ?? 0;

            $completedWorklist = Database::queryOne(
                "SELECT COUNT(*) as count FROM worklist WHERE year = ? AND status = 'completed'",
                [$year]
            )['count'] ?? 0;

            $realizationPercentage = $totalWorklist > 0 ? round(($completedWorklist / $totalWorklist) * 100) : 0;
        } catch (\Exception $e) {
            $totalPlans = 0;
            $completedPlans = 0;
            $inProgressPlans = 0;
            $totalWorklist = 0;
            $completedWorklist = 0;
            $realizationPercentage = 0;
        }

        Response::json([
            'status' => 'success',
            'data' => [
                'totalAuditPlan' => $totalPlans,
                'completedAudits' => $completedPlans,
                'inProgressAudits' => $inProgressPlans,
                'realizationPercentage' => $realizationPercentage,
                'pendingReview' => 0,
                'growthVsLastYear' => 0,
                'trend' => [0, 0, 0, 0],
                'progressRows' => [],
            ],
        ]);
    }
}
