<?php

namespace App\Services;

final class DashboardService
{
    public function getSummary(): array
    {
        return [
            'totalAuditPlan' => 48,
            'completedAudits' => 34,
            'realizationPercentage' => 72,
        ];
    }
}
