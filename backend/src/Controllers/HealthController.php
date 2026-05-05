<?php

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;

final class HealthController
{
    public function index(Request $request): void
    {
        Response::json([
            'status' => 'ok',
            'service' => 'SPI-Hub API',
            'timestamp' => date(DATE_ATOM),
            'method' => $request->method,
        ]);
    }
}
