<?php

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Database;

final class WorklistController
{
    public function index(Request $request): void
    {
        $year = isset($request->query['year']) ? (int) $request->query['year'] : (int) date('Y');

        try {
            $programs = Database::query("SELECT id, name, year FROM programs WHERE year = ?", [$year]);
            $worklist = Database::query("SELECT * FROM worklist WHERE year = ? ORDER BY start_date", [$year]);
        } catch (\Exception $e) {
            $programs = [];
            $worklist = [];
        }

        $total = count($worklist);
        $scheduled = count(array_filter($worklist, fn($w) => $w['status'] === 'scheduled'));
        $in_progress = count(array_filter($worklist, fn($w) => $w['status'] === 'in_progress'));
        $completed = count(array_filter($worklist, fn($w) => $w['status'] === 'completed'));

        $avgProgress = $total > 0 ? round(array_sum(array_column($worklist, 'progress')) / $total) : 0;

        Response::json([
            'status' => 'success',
            'data' => [
                'programs' => array_values($programs),
                'worklist' => array_values($worklist),
                'stats' => [
                    'total' => $total,
                    'scheduled' => $scheduled,
                    'in_progress' => $in_progress,
                    'completed' => $completed,
                    'avgProgress' => $avgProgress,
                ],
            ],
        ]);
    }

    public function show(Request $request, string $id): void
    {
        try {
            $worklist = Database::queryOne("SELECT * FROM worklist WHERE id = ?", [$id]);
        } catch (\Exception $e) {
            $worklist = null;
        }

        if (!$worklist) {
            Response::json(['status' => 'error', 'message' => 'Tugas tidak ditemukan'], 404);
            return;
        }

        Response::json(['status' => 'success', 'data' => $worklist]);
    }

    public function store(Request $request): void
    {
        $body = $request->body;

        if (empty($body['program_id']) || empty($body['task_name'])) {
            Response::json(['status' => 'error', 'message' => 'Program dan nama tugas wajib diisi'], 422);
            return;
        }

        $id = $body['id'] ?? 'wl' . time();
        $progress = isset($body['progress']) ? (int) $body['progress'] : 0;

        $status = 'scheduled';
        if ($progress >= 100) $status = 'completed';
        elseif ($progress > 0) $status = 'in_progress';

        $programName = $body['program_name'] ?? '';
        try {
            $program = Database::queryOne("SELECT name FROM programs WHERE id = ?", [$body['program_id']]);
            if ($program) $programName = $program['name'];
        } catch (\Exception $e) {}

        try {
            Database::execute(
                "INSERT INTO worklist (id, task_id, program_id, program_name, task_name, start_date, end_date, location, pic, progress, status, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [$id, $body['task_id'] ?? 'task' . time(), $body['program_id'], $programName, $body['task_name'], $body['start_date'] ?? date('Y-m-d'), $body['end_date'] ?? $body['start_date'] ?? date('Y-m-d'), $body['location'] ?? '', $body['pic'] ?? '', $progress, $status, $body['year'] ?? (int) date('Y')]
            );
        } catch (\Exception $e) {
            Response::json(['status' => 'error', 'message' => 'Gagal menyimpan tugas'], 500);
            return;
        }

        $newItem = [
            'id' => $id,
            'task_id' => $body['task_id'] ?? 'task' . time(),
            'program_id' => $body['program_id'],
            'program_name' => $programName,
            'task_name' => $body['task_name'],
            'start_date' => $body['start_date'] ?? date('Y-m-d'),
            'end_date' => $body['end_date'] ?? $body['start_date'] ?? date('Y-m-d'),
            'location' => $body['location'] ?? '',
            'pic' => $body['pic'] ?? '',
            'progress' => $progress,
            'status' => $status,
            'year' => $body['year'] ?? (int) date('Y'),
        ];

        Response::json(['status' => 'success', 'message' => 'Tugas berhasil ditambahkan', 'data' => $newItem], 201);
    }

    public function update(Request $request, string $id): void
    {
        $body = $request->body;

        try {
            $existing = Database::queryOne("SELECT id FROM worklist WHERE id = ?", [$id]);
        } catch (\Exception $e) {
            $existing = null;
        }

        if (!$existing) {
            Response::json(['status' => 'error', 'message' => 'Tugas tidak ditemukan'], 404);
            return;
        }

        if (isset($body['progress'])) {
            $progress = (int) $body['progress'];
            if ($progress >= 100) $body['status'] = 'completed';
            elseif ($progress > 0) $body['status'] = 'in_progress';
            else $body['status'] = 'scheduled';
        }

        $fields = [];
        $values = [];
        foreach ($body as $key => $value) {
            $fields[] = "{$key} = ?";
            $values[] = $value;
        }
        $values[] = $id;

        try {
            Database::execute("UPDATE worklist SET " . implode(', ', $fields) . " WHERE id = ?", $values);
            $updated = Database::queryOne("SELECT * FROM worklist WHERE id = ?", [$id]);
        } catch (\Exception $e) {
            Response::json(['status' => 'error', 'message' => 'Gagal mengupdate tugas'], 500);
            return;
        }

        Response::json(['status' => 'success', 'message' => 'Tugas berhasil diupdate', 'data' => $updated]);
    }

    public function destroy(Request $request, string $id): void
    {
        try {
            $existing = Database::queryOne("SELECT id FROM worklist WHERE id = ?", [$id]);
        } catch (\Exception $e) {
            $existing = null;
        }

        if (!$existing) {
            Response::json(['status' => 'error', 'message' => 'Tugas tidak ditemukan'], 404);
            return;
        }

        try {
            // Hapus audit plans terkait terlebih dahulu
            Database::execute("DELETE FROM audit_plans WHERE task_id = ?", [$id]);
            // Hapus juga plans yang id-nya mengandung task id
            Database::execute("DELETE FROM audit_plans WHERE id LIKE ?", ['%' . $id . '%']);
            // Hapus worklist
            Database::execute("DELETE FROM worklist WHERE id = ?", [$id]);
        } catch (\Exception $e) {
            Response::json(['status' => 'error', 'message' => 'Gagal menghapus tugas'], 500);
            return;
        }

        Response::json(['status' => 'success', 'message' => 'Tugas berhasil dihapus']);
    }

    public function updateProgress(Request $request, string $id): void
    {
        $progress = isset($request->body['progress']) ? (int) $request->body['progress'] : 0;

        try {
            $existing = Database::queryOne("SELECT id FROM worklist WHERE id = ?", [$id]);
        } catch (\Exception $e) {
            $existing = null;
        }

        if (!$existing) {
            Response::json(['status' => 'error', 'message' => 'Tugas tidak ditemukan'], 404);
            return;
        }

        $status = 'scheduled';
        if ($progress >= 100) $status = 'completed';
        elseif ($progress > 0) $status = 'in_progress';

        try {
            Database::execute("UPDATE worklist SET progress = ?, status = ? WHERE id = ?", [$progress, $status, $id]);
            $updated = Database::queryOne("SELECT * FROM worklist WHERE id = ?", [$id]);
        } catch (\Exception $e) {
            Response::json(['status' => 'error', 'message' => 'Gagal mengupdate progress'], 500);
            return;
        }

        Response::json(['status' => 'success', 'message' => 'Progress berhasil diupdate', 'data' => $updated]);
    }
}