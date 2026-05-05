<?php

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;

final class ReportsController
{
    public function index(Request $request): void
    {
        Response::json([
            'status' => 'success',
            'data' => [
                'module' => 'Reports',
                'description' => 'Generate reports and track approval metadata.',
            ],
        ]);
    }
}
