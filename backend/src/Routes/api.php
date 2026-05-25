<?php

use App\Controllers\ActivityLogController;
use App\Controllers\AuditPlanController;
use App\Controllers\AuthController;
use App\Controllers\ChatController;
use App\Controllers\DashboardController;
use App\Controllers\HealthController;
use App\Controllers\WorklistController;
use App\Controllers\ProgramController;
use App\Controllers\UsersController;

// Health check
$router->get('/api/health', [HealthController::class, 'index']);

// Auth routes
$router->post('/api/auth/login', [AuthController::class, 'login']);
$router->post('/api/auth/logout', [AuthController::class, 'logout']);
$router->get('/api/auth/me', [AuthController::class, 'me']);
$router->post('/api/auth/refresh', [AuthController::class, 'refresh']);
$router->get('/api/auth/sessions', [AuthController::class, 'activeSessions']);
$router->delete('/api/auth/sessions/{sessionId}', [AuthController::class, 'revokeSession']);

// Dashboard
$router->get('/api/dashboard/summary', [DashboardController::class, 'summary']);

// Programs (Program Kerja)
$router->get('/api/programs', [ProgramController::class, 'index']);
$router->get('/api/programs/{id}', [ProgramController::class, 'show']);
$router->post('/api/programs', [ProgramController::class, 'store']);
$router->put('/api/programs/{id}', [ProgramController::class, 'update']);
$router->delete('/api/programs/{id}', [ProgramController::class, 'destroy']);

// WorkList (Tugas)
$router->get('/api/worklist', [WorklistController::class, 'index']);
$router->get('/api/worklist/{id}', [WorklistController::class, 'show']);
$router->post('/api/worklist', [WorklistController::class, 'store']);
$router->put('/api/worklist/{id}', [WorklistController::class, 'update']);
$router->delete('/api/worklist/{id}', [WorklistController::class, 'destroy']);
$router->put('/api/worklist/{id}/progress', [WorklistController::class, 'updateProgress']);

// Audit Plans (Agenda)
$router->get('/api/audit-plan/calendar', [AuditPlanController::class, 'calendar']);
$router->get('/api/audit-plans', [AuditPlanController::class, 'index']);
$router->get('/api/audit-plans/{id}', [AuditPlanController::class, 'show']);
$router->post('/api/audit-plans', [AuditPlanController::class, 'store']);
$router->put('/api/audit-plans/{id}', [AuditPlanController::class, 'update']);
$router->delete('/api/audit-plans/{id}', [AuditPlanController::class, 'destroy']);

// Chat / Team Chat
$router->get('/api/chat', [ChatController::class, 'index']);
$router->post('/api/chat', [ChatController::class, 'store']);
$router->get('/api/chat/stream', [ChatController::class, 'stream']);

// Users Management
$router->get('/api/users', [UsersController::class, 'index']);
$router->get('/api/users/{id}', [UsersController::class, 'show']);
$router->post('/api/users', [UsersController::class, 'store']);
$router->put('/api/users/{id}', [UsersController::class, 'update']);
$router->delete('/api/users/{id}', [UsersController::class, 'destroy']);
$router->put('/api/users/{id}/reset-password', [UsersController::class, 'resetPassword']);

// Activity Logs
$router->get('/api/activity-logs', [ActivityLogController::class, 'index']);
$router->post('/api/activity-logs', [ActivityLogController::class, 'store']);
$router->get('/api/activity-logs/stats', [ActivityLogController::class, 'stats']);
$router->get('/api/activity-logs/user/{userId}', [ActivityLogController::class, 'getByUser']);
$router->get('/api/activity-logs/category/{category}', [ActivityLogController::class, 'getByCategory']);