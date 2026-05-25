<?php

namespace App\Repositories;

use App\Core\Database;

class ProgramRepository
{
    public function findById(string $id): ?array
    {
        return Database::queryOne(
            'SELECT * FROM programs WHERE id = ?',
            [$id]
        );
    }

    public function findAll(): array
    {
        return Database::query('SELECT * FROM programs ORDER BY year DESC, name ASC');
    }

    public function findByYear(int $year): array
    {
        return Database::query(
            'SELECT * FROM programs WHERE year = ? ORDER BY name ASC',
            [$year]
        );
    }

    public function create(array $data): bool
    {
        return Database::execute(
            'INSERT INTO programs (id, name, year) VALUES (?, ?, ?)',
            [$data['id'], $data['name'], $data['year']]
        ) > 0;
    }

    public function update(string $id, array $data): bool
    {
        return Database::execute(
            'UPDATE programs SET name = ?, year = ? WHERE id = ?',
            [$data['name'], $data['year'], $id]
        ) > 0;
    }

    public function delete(string $id): bool
    {
        return Database::execute('DELETE FROM programs WHERE id = ?', [$id]) > 0;
    }

    public function hasWorklist(string $programId): bool
    {
        $result = Database::queryOne(
            'SELECT id FROM worklist WHERE program_id = ? LIMIT 1',
            [$programId]
        );
        return $result !== null;
    }
}