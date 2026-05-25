<?php

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Database;

final class ProgramController
{
    public function index(Request $request): void
    {
        $year = isset($request->query['year']) ? (int) $request->query['year'] : (int) date('Y');

        try {
            $programs = Database::query(
                "SELECT id, name, year, created_at FROM programs WHERE year = ? ORDER BY created_at ASC",
                [$year]
            );
        } catch (\Exception $e) {
            $programs = [];
        }

        Response::json([
            'status' => 'success',
            'data' => array_values($programs),
        ]);
    }

    public function show(Request $request, string $id): void
    {
        try {
            $program = Database::queryOne("SELECT id, name, year, created_at FROM programs WHERE id = ?", [$id]);
        } catch (\Exception $e) {
            $program = null;
        }

        if (!$program) {
            Response::json(['status' => 'error', 'message' => 'Program tidak ditemukan'], 404);
            return;
        }

        Response::json(['status' => 'success', 'data' => $program]);
    }

    public function store(Request $request): void
    {
        $body = $request->body;

        if (empty($body['name'])) {
            Response::json(['status' => 'error', 'message' => 'Nama program wajib diisi'], 422);
            return;
        }

        $year = $body['year'] ?? (int) date('Y');
        $id = $body['id'] ?? "prog" . time() . "-{$year}";

        try {
            Database::execute(
                "INSERT INTO programs (id, name, year) VALUES (?, ?, ?)",
                [$id, $body['name'], $year]
            );
        } catch (\Exception $e) {
            Response::json(['status' => 'error', 'message' => 'Gagal menyimpan program'], 500);
            return;
        }

        $newProgram = [
            'id' => $id,
            'name' => $body['name'],
            'year' => $year,
        ];

        Response::json(['status' => 'success', 'message' => 'Program berhasil ditambahkan', 'data' => $newProgram], 201);
    }

    public function update(Request $request, string $id): void
    {
        $body = $request->body;

        try {
            $existing = Database::queryOne("SELECT id FROM programs WHERE id = ?", [$id]);
        } catch (\Exception $e) {
            $existing = null;
        }

        if (!$existing) {
            Response::json(['status' => 'error', 'message' => 'Program tidak ditemukan'], 404);
            return;
        }

        $name = $body['name'] ?? $existing['name'];
        $year = $body['year'] ?? $existing['year'];

        try {
            Database::execute(
                "UPDATE programs SET name = ?, year = ? WHERE id = ?",
                [$name, $year, $id]
            );
        } catch (\Exception $e) {
            Response::json(['status' => 'error', 'message' => 'Gagal mengupdate program'], 500);
            return;
        }

        Response::json([
            'status' => 'success',
            'message' => 'Program berhasil diupdate',
            'data' => ['id' => $id, 'name' => $name, 'year' => $year]
        ]);
    }

    public function destroy(Request $request, string $id): void
    {
        try {
            $existing = Database::queryOne("SELECT id FROM programs WHERE id = ?", [$id]);
        } catch (\Exception $e) {
            $existing = null;
        }

        if (!$existing) {
            Response::json(['status' => 'error', 'message' => 'Program tidak ditemukan'], 404);
            return;
        }

        try {
            Database::execute("DELETE FROM programs WHERE id = ?", [$id]);
        } catch (\Exception $e) {
            Response::json(['status' => 'error', 'message' => 'Gagal menghapus program'], 500);
            return;
        }

        Response::json(['status' => 'success', 'message' => 'Program berhasil dihapus']);
    }
}