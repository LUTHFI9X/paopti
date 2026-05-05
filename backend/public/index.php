<?php

declare(strict_types=1);

use App\Core\Request;

require_once __DIR__ . '/../bootstrap/app.php';

$request = Request::capture();
$router->dispatch($request);
