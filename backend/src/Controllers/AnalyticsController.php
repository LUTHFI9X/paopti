<?php

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;

final class AnalyticsController
{
    public function index(Request $request): void
    {
        Response::json([
            'status' => 'success',
            'data' => [
                'module' => 'Analytics',
                'description' => 'Analyze audit trend and risk indicators.',
            ],
        ]);
    }
}
