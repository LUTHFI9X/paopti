<?php

namespace App\Middleware;

use App\Core\Request;

final class AuthMiddleware
{
    public function handle(Request $request, callable $next): void
    {
        $next($request);
    }
}
