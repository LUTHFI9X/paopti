<?php

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;

final class DashboardController
{
    public function summary(Request $request): void
    {
        Response::json([
            'status' => 'success',
            'data' => [
                'totalAuditPlan' => 48,
                'completedAudits' => 34,
                'realizationPercentage' => 72,
                'pendingReview' => 14,
                'growthVsLastYear' => 12,
                'trend' => [42, 64, 55, 70],
                'progressRows' => [
                    [
                        'title' => 'Internal Audit Integrity',
                        'unit' => 'Governance Dept.',
                        'value' => 100,
                        'status' => 'Done',
                    ],
                    [
                        'title' => 'IACM Assessment',
                        'unit' => 'Compliance Unit',
                        'value' => 64,
                        'status' => 'On Process',
                    ],
                    [
                        'title' => 'Procurement Risk Map',
                        'unit' => 'Procurement Dept.',
                        'value' => 32,
                        'status' => 'On Process',
                    ],
                    [
                        'title' => 'Data Center Infrastructure',
                        'unit' => 'IT Operations',
                        'value' => 0,
                        'status' => 'Not Started',
                    ],
                ],
            ],
        ]);
    }
}
