<?php

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;

final class AuditPlanController
{
    public function calendar(Request $request): void
    {
        Response::json([
            'status' => 'success',
            'data' => [
                'month' => 'November 2024',
                'focus' => '3 major milestones remaining for Q4 compliance closure',
                'progress' => 65,
                'calendarSlots' => 35,
                'upcomingAlerts' => [
                    [
                        'level' => 'High Priority',
                        'title' => 'ISO 27001 Review',
                        'detail' => 'External controls and access logs review.',
                    ],
                    [
                        'level' => 'In Progress',
                        'title' => 'IT Audit Phase 2',
                        'detail' => 'Cloud endpoint and API authorization testing.',
                    ],
                    [
                        'level' => 'Action Required',
                        'title' => 'Compliance Team Sync',
                        'detail' => 'Resolve blockers in remediation tasks.',
                    ],
                ],
            ],
        ]);
    }
}
