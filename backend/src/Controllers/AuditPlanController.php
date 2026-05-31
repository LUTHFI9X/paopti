<?php

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Database;

final class AuditPlanController
{
    public function calendar(Request $request): void
    {
        $year = isset($request->query['year']) ? (int) $request->query['year'] : (int) date('Y');
        $month = isset($request->query['month']) ? (int) $request->query['month'] : (int) date('n');

        try {
            $plans = Database::query(
                "SELECT * FROM audit_plans WHERE YEAR(start_date) = ? AND MONTH(start_date) = ?",
                [$year, $month]
            );
        } catch (\Exception $e) {
            $plans = [];
        }

        $upcomingAlerts = array_map(function ($plan) {
            $status = 'scheduled';
            if (!empty($plan['completed'])) $status = 'completed';
            elseif ($plan['status'] === 'in_progress') $status = 'in_progress';

            return [
                'level' => ucfirst($status),
                'title' => $plan['task_name'],
                'detail' => ($plan['program_name'] ?? '') . ' - ' . ($plan['phase_label'] ?? $plan['tahap_type'] ?? ''),
            ];
        }, array_slice(array_values($plans), 0, 5));

        Response::json([
            'status' => 'success',
            'data' => [
                'month' => date('F Y', strtotime("{$year}-{$month}-01")),
                'focus' => count($plans) . ' agenda pada bulan ini',
                'progress' => 0,
                'calendarSlots' => count($plans),
                'upcomingAlerts' => $upcomingAlerts,
                'agendas' => array_values($plans),
            ],
        ]);
    }

    public function index(Request $request): void
    {
        $year = isset($request->query['year']) ? (int) $request->query['year'] : (int) date('Y');
        $month = isset($request->query['month']) ? (int) $request->query['month'] : null;

        try {
            if ($month) {
                $plans = Database::query(
                    "SELECT * FROM audit_plans WHERE YEAR(start_date) = ? AND MONTH(start_date) = ? ORDER BY start_date",
                    [$year, $month]
                );
            } else {
                $plans = Database::query(
                    "SELECT * FROM audit_plans WHERE YEAR(start_date) = ? ORDER BY start_date",
                    [$year]
                );
            }
        } catch (\Exception $e) {
            $plans = [];
        }

        Response::json([
            'status' => 'success',
            'data' => array_values($plans),
        ]);
    }

    public function show(Request $request, string $id): void
    {
        try {
            $plan = Database::queryOne("SELECT * FROM audit_plans WHERE id = ?", [$id]);
        } catch (\Exception $e) {
            $plan = null;
        }

        if (!$plan) {
            Response::json(['status' => 'error', 'message' => 'Agenda tidak ditemukan'], 404);
            return;
        }

        Response::json(['status' => 'success', 'data' => $plan]);
    }

    public function store(Request $request): void
    {
        $body = $request->body;

        if (empty($body['task_name']) || empty($body['start_date'])) {
            Response::json(['status' => 'error', 'message' => 'Nama tugas dan tanggal wajib diisi'], 422);
            return;
        }

        $id = $body['id'] ?? 'ap-' . time();
        $progress = isset($body['progress']) ? (int) $body['progress'] : 0;

        $status = 'scheduled';
        if ($progress >= 100 || !empty($body['completed'])) $status = 'completed';
        elseif ($progress > 0) $status = 'in_progress';

        try {
            Database::execute(
                "INSERT INTO audit_plans (id, task_id, program_name, task_name, start_date, end_date, location, progress, status, completed, is_agenda, tahap_type, phase_label, custom_percentage, note, team, phases) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    $id,
                    $body['task_id'] ?? null,
                    $body['program_name'] ?? '',
                    $body['task_name'],
                    $body['start_date'],
                    $body['end_date'] ?? $body['start_date'],
                    $body['location'] ?? '',
                    $progress,
                    $status,
                    !empty($body['completed']) || $progress >= 100 ? 1 : 0,
                    !empty($body['is_agenda']) ? 1 : 0,
                    $body['tahap_type'] ?? 'audit',
                    $body['phase_label'] ?? '',
                    $body['custom_percentage'] ?? 0,
                    $body['note'] ?? '',
                    json_encode($body['team'] ?? []),
                    json_encode($body['phases'] ?? []),
                ]
            );

            $this->syncWorklistProgressFromAgendas($body['task_id'] ?? null);

        } catch (\Exception $e) {
            Response::json(['status' => 'error', 'message' => 'Gagal menyimpan agenda'], 500);
            return;
        }

        $newPlan = [
            'id' => $id,
            'task_id' => $body['task_id'] ?? null,
            'program_name' => $body['program_name'] ?? '',
            'task_name' => $body['task_name'],
            'start_date' => $body['start_date'],
            'end_date' => $body['end_date'] ?? $body['start_date'],
            'location' => $body['location'] ?? '',
            'progress' => $progress,
            'status' => $status,
            'completed' => !empty($body['completed']) || $progress >= 100,
            'is_agenda' => !empty($body['is_agenda']),
            'tahap_type' => $body['tahap_type'] ?? 'audit',
            'phase_label' => $body['phase_label'] ?? '',
            'custom_percentage' => $body['custom_percentage'] ?? 0,
            'note' => $body['note'] ?? '',
            'team' => $body['team'] ?? [],
            'phases' => $body['phases'] ?? [],
        ];

        Response::json(['status' => 'success', 'message' => 'Agenda berhasil ditambahkan', 'data' => $newPlan], 201);
    }

    public function update(Request $request, string $id): void
    {
        $body = $request->body;

        try {
            $existing = Database::queryOne("SELECT id, task_id FROM audit_plans WHERE id = ?", [$id]);
        } catch (\Exception $e) {
            error_log("Error checking existing plan: " . $e->getMessage());
            $existing = null;
        }

        if (!$existing) {
            Response::json(['status' => 'error', 'message' => 'Agenda tidak ditemukan'], 404);
            return;
        }

        $originalTaskId = $existing['task_id'] ?? null;

        if (isset($body['progress'])) {
            $progress = (int) $body['progress'];
            $body['status'] = $progress >= 100 ? 'completed' : ($progress > 0 ? 'in_progress' : 'scheduled');
            $body['completed'] = $progress >= 100 ? 1 : 0;
        }

        // Build update query with only valid fields
        $fields = [];
        $values = [];
        $allowedFields = ['start_date', 'end_date', 'location', 'progress', 'status', 'completed', 'is_agenda', 'tahap_type', 'phase_label', 'custom_percentage', 'note', 'team', 'phases', 'time', 'task_id', 'program_name', 'task_name'];

        foreach ($body as $key => $value) {
            if (!in_array($key, $allowedFields)) {
                continue;
            }
            if (in_array($key, ['team', 'phases'])) {
                $value = is_array($value) ? json_encode($value) : $value;
            }
            if (in_array($key, ['completed', 'is_agenda'])) {
                $value = $value ? 1 : 0;
            }
            $fields[] = "`{$key}` = ?";
            $values[] = $value;
        }
        $values[] = $id;

        if (empty($fields)) {
            Response::json(['status' => 'error', 'message' => 'Tidak ada data untuk diupdate'], 400);
            return;
        }

        try {
            $sql = "UPDATE audit_plans SET " . implode(', ', $fields) . " WHERE id = ?";
            error_log("Executing: " . $sql . " with values: " . json_encode($values));
            Database::execute($sql, $values);
            $updated = Database::queryOne("SELECT * FROM audit_plans WHERE id = ?", [$id]);

            $updatedTaskId = $updated['task_id'] ?? ($body['task_id'] ?? $originalTaskId);
            $this->syncWorklistProgressFromAgendas($originalTaskId);
            if ($updatedTaskId !== $originalTaskId) {
                $this->syncWorklistProgressFromAgendas($updatedTaskId);
            }

            Response::json(['status' => 'success', 'message' => 'Agenda berhasil diupdate', 'data' => $updated]);
        } catch (\Exception $e) {
            error_log("Error updating audit plan: " . $e->getMessage() . " - SQL: " . $sql);
            Response::json(['status' => 'error', 'message' => 'Gagal mengupdate agenda: ' . $e->getMessage()], 500);
            return;
        }
    }

    public function destroy(Request $request, string $id): void
    {
        try {
            $existing = Database::queryOne("SELECT id, task_id FROM audit_plans WHERE id = ?", [$id]);
        } catch (\Exception $e) {
            $existing = null;
        }

        if (!$existing) {
            Response::json(['status' => 'error', 'message' => 'Agenda tidak ditemukan'], 404);
            return;
        }

        try {
            Database::execute("DELETE FROM audit_plans WHERE id = ?", [$id]);

            $this->syncWorklistProgressFromAgendas($existing['task_id'] ?? null);
        } catch (\Exception $e) {
            Response::json(['status' => 'error', 'message' => 'Gagal menghapus agenda'], 500);
            return;
        }

        Response::json(['status' => 'success', 'message' => 'Agenda berhasil dihapus']);
    }

    private function syncWorklistProgressFromAgendas(?string $taskIdentifier): void
    {
        if (empty($taskIdentifier)) {
            return;
        }

        try {
            // Ambil semua agenda (audit DAN non_audit) untuk tugas ini
            $agendas = Database::query(
                "SELECT phase_label, progress, tahap_type
                 FROM audit_plans
                 WHERE task_id = ? AND is_agenda = 1",
                [$taskIdentifier]
            );

            $maxProgress = 0;
            foreach ($agendas as $agenda) {
                if (($agenda['tahap_type'] ?? 'audit') === 'audit') {
                    // Audit: progress ditentukan dari phase label
                    $phaseProgress = $this->progressFromPhaseLabel($agenda['phase_label'] ?? '');
                } else {
                    // Non-audit: gunakan nilai progress yang tersimpan langsung
                    $phaseProgress = (int) ($agenda['progress'] ?? 0);
                }
                $maxProgress = max($maxProgress, $phaseProgress);
            }

            $normalizedProgress = $this->normalizeWorklistProgress($maxProgress);
            $status = $this->statusFromProgress($normalizedProgress);

            Database::execute(
                "UPDATE worklist SET progress = ?, status = ? WHERE id = ? OR task_id = ?",
                [$normalizedProgress, $status, $taskIdentifier, $taskIdentifier]
            );
        } catch (\Exception $e) {
            error_log('Failed syncing worklist progress: ' . $e->getMessage());
        }
    }

    private function progressFromPhaseLabel(string $phaseLabel): int
    {
        $normalized = strtolower(trim($phaseLabel));

        if (str_contains($normalized, 'entry')) {
            return 25;
        }
        if (str_contains($normalized, 'konfirmasi')) {
            return 50;
        }
        if (str_contains($normalized, 'expose')) {
            return 75;
        }
        if (str_contains($normalized, 'exit')) {
            return 100;
        }

        return 0;
    }

    private function normalizeWorklistProgress(int $progress): int
    {
        if ($progress >= 100) {
            return 100;
        }
        if ($progress >= 75) {
            return 75;
        }
        if ($progress >= 50) {
            return 50;
        }
        if ($progress >= 25) {
            return 25;
        }

        return 0;
    }

    private function statusFromProgress(int $progress): string
    {
        if ($progress >= 100) {
            return 'completed';
        }
        if ($progress > 0) {
            return 'in_progress';
        }

        return 'scheduled';
    }
}