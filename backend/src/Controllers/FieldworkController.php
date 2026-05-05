<?php

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;

final class FieldworkController
{
    public function index(Request $request): void
    {
        Response::json([
            'status' => 'success',
            'data' => [
                'module' => 'Fieldwork',
                'description' => 'Track findings, evidence, and remediation tasks.',
            ],
        ]);
    }
}
