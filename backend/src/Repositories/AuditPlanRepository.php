<?php

namespace App\Repositories;

use App\Core\Database;

class AuditPlanRepository
{
    public function findById(string $id): ?array
    {
        return Database::queryOne(
            'SELECT * FROM audit_plans WHERE id = ?',
            [$id]
        );
    }

    public function findAll(): array
    {
        return Database::query('SELECT * FROM audit_plans ORDER BY start_date ASC');
    }

    public function findByDateRange(string $startDate, string $endDate): array
    {
        return Database::query(
            'SELECT * FROM audit_plans WHERE start_date >= ? AND start_date <= ? ORDER BY start_date ASC',
            [$startDate, $endDate]
        );
    }

    public function findByMonth(int $year, int $month): array
    {
        $startDate = sprintf('%04d-%02d-01', $year, $month);
        $endDate = sprintf('%04d-%02d-31', $year, $month);

        return Database::query(
            'SELECT * FROM audit_plans WHERE start_date >= ? AND start_date <= ? ORDER BY start_date ASC',
            [$startDate, $endDate]
        );
    }

    public function findByTask(string $taskId): array
    {
        return Database::query(
            'SELECT * FROM audit_plans WHERE task_id = ? ORDER BY start_date ASC',
            [$taskId]
        );
    }

    public function create(array $data): bool
    {
        return Database::execute(
            'INSERT INTO audit_plans (id, task_id, program_name, task_name, start_date, end_date, location, progress, status, completed, is_agenda, tahap_type, phase_label, custom_percentage, note)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $data['id'],
                $data['task_id'] ?? null,
                $data['program_name'],
                $data['task_name'],
                $data['start_date'],
                $data['end_date'] ?? $data['start_date'],
                $data['location'] ?? '',
                $data['progress'] ?? 0,
                $data['status'] ?? 'scheduled',
                $data['completed'] ?? false,
                $data['is_agenda'] ?? true,
                $data['tahap_type'] ?? 'audit',
                $data['phase_label'] ?? '',
                $data['custom_percentage'] ?? 0,
                $data['note'] ?? '',
            ]
        ) > 0;
    }

    public function update(string $id, array $data): bool
    {
        $fields = ['program_name', 'task_name', 'start_date', 'end_date', 'location', 'progress', 'status', 'completed', 'is_agenda', 'tahap_type', 'phase_label', 'custom_percentage', 'note'];
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
        $sql = 'UPDATE audit_plans SET ' . implode(', ', $sets) . ' WHERE id = ?';

        return Database::execute($sql, $values) > 0;
    }

    public function delete(string $id): bool
    {
        return Database::execute('DELETE FROM audit_plans WHERE id = ?', [$id]) > 0;
    }

    public function getTeam(string $auditPlanId): array
    {
        return Database::query(
            'SELECT * FROM audit_plan_team WHERE audit_plan_id = ?',
            [$auditPlanId]
        );
    }

    public function addTeamMember(string $auditPlanId, string $role, string $name): bool
    {
        return Database::execute(
            'INSERT INTO audit_plan_team (audit_plan_id, role, name) VALUES (?, ?, ?)',
            [$auditPlanId, $role, $name]
        ) > 0;
    }

    public function clearTeam(string $auditPlanId): bool
    {
        return Database::execute(
            'DELETE FROM audit_plan_team WHERE audit_plan_id = ?',
            [$auditPlanId]
        ) > 0;
    }

    public function getPhases(string $auditPlanId): array
    {
        return Database::query(
            'SELECT * FROM audit_plan_phases WHERE audit_plan_id = ?',
            [$auditPlanId]
        );
    }

    public function savePhases(string $auditPlanId, array $phases): bool
    {
        Database::execute('DELETE FROM audit_plan_phases WHERE audit_plan_id = ?', [$auditPlanId]);

        foreach ($phases as $phase) {
            Database::execute(
                'INSERT INTO audit_plan_phases (audit_plan_id, phase, date, done) VALUES (?, ?, ?, ?)',
                [$auditPlanId, $phase['phase'], $phase['date'] ?? null, $phase['done'] ?? false]
            );
        }

        return true;
    }
}