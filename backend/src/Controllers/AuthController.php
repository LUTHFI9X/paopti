<?php

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;

final class AuthController
{
    public function login(Request $request): void
    {
        $username = trim((string) ($request->body['username'] ?? ''));

        if ($username === '') {
            Response::json([
                'status' => 'error',
                'message' => 'Username is required',
            ], 422);
            return;
        }

        Response::json([
            'status' => 'success',
            'message' => 'Login success (mock)',
            'data' => [
                'token' => base64_encode($username . '-spi-hub-token'),
                'user' => [
                    'name' => $username,
                    'role' => 'Auditor',
                ],
            ],
        ]);
    }
}
