<?php

namespace App\Repositories;

use App\Core\Database;

class WorklistRepository
{
    public function findById(string $id): ?array
    {
        return Database::queryOne(
            'SELECT * FROM worklist WHERE id = ?',
            [$id]
        );
    }

    public function findAll(): array
    {
        return Database::query('SELECT * FROM worklist ORDER BY start_date ASC');
    }

    public function findByYear(int $year): array
    {
        return Database::query(
            'SELECT * FROM worklist WHERE year = ? ORDER BY start_date ASC',
            [$year]
        );
    }

    public function findByProgram(string $programId): array
    {
        return Database::query(
            'SELECT * FROM worklist WHERE program_id = ? ORDER BY start_date ASC',
            [$programId]
        );
    }

    public function create(array $data): bool
    {
        return Database::execute(
            'INSERT INTO worklist (id, task_id, program_id, program_name, task_name, start_date, end_date, location, pic, progress, status, year)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $data['id'],
                $data['task_id'],
                $data['program_id'],
                $data['program_name'],
                $data['task_name'],
                $data['start_date'],
                $data['end_date'] ?? $data['start_date'],
                $data['location'] ?? '',
                $data['pic'] ?? '',
                $data['progress'] ?? 0,
                $data['status'] ?? 'scheduled',
                $data['year'],
            ]
        ) > 0;
    }

    public function update(string $id, array $data): bool
    {
        $fields = ['program_id', 'program_name', 'task_name', 'start_date', 'end_date', 'location', 'pic', 'progress', 'status'];
        $sets = [];
        $values = [];

        foreach ($fields as $field) {
            if (isset($data[$field])) {
                $sets[] = "$field = ?";
                $values[] = $data[$field];
            }
        }

        if (empty($sets)) return false;

        $values[] = $id;
        $sql = 'UPDATE worklist SET ' . implode(', ', $sets) . ' WHERE id = ?';

        return Database::execute($sql, $values) > 0;
    }

    public function updateProgress(string $id, int $progress): bool
    {
        $status = 'scheduled';
        if ($progress >= 100) $status = 'completed';
        elseif ($progress > 0) $status = 'in_progress';

        return Database::execute(
            'UPDATE worklist SET progress = ?, status = ? WHERE id = ?',
            [$progress, $status, $id]
        ) > 0;
    }

    public function delete(string $id): bool
    {
        return Database::execute('DELETE FROM worklist WHERE id = ?', [$id]) > 0;
    }

    public function countByStatus(int $year): array
    {
        return Database::query(
            'SELECT status, COUNT(*) as count FROM worklist WHERE year = ? GROUP BY status',
            [$year]
        );
    }
}