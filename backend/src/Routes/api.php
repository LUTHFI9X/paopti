<?php

use App\Controllers\AnalyticsController;
use App\Controllers\AuditPlanController;
use App\Controllers\AuthController;
use App\Controllers\ChatController;
use App\Controllers\DashboardController;
use App\Controllers\FieldworkController;
use App\Controllers\HealthController;
use App\Controllers\ReportsController;

$router->get('/api/health', [HealthController::class, 'index']);
$router->post('/api/auth/login', [AuthController::class, 'login']);
$router->get('/api/dashboard/summary', [DashboardController::class, 'summary']);
$router->get('/api/audit-plan/calendar', [AuditPlanController::class, 'calendar']);
$router->get('/api/fieldwork', [FieldworkController::class, 'index']);
$router->get('/api/reports', [ReportsController::class, 'index']);
$router->get('/api/analytics', [AnalyticsController::class, 'index']);
$router->get('/api/chat', [ChatController::class, 'index']);
