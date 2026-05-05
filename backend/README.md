# SPI-Hub Backend (PHP)

Backend API sederhana berbasis PHP native dengan struktur berlapis.

## Menjalankan

```bash
cd backend
php -S localhost:8000 -t public
```

## Endpoint

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/dashboard/summary`
- `GET /api/audit-plan/calendar`
- `GET /api/fieldwork`
- `GET /api/reports`
- `GET /api/analytics`
- `GET /api/chat`

## Struktur

- `public/` Front controller
- `bootstrap/` Bootstrapping app
- `config/` Konfigurasi
- `src/Controllers/` API controllers
- `src/Core/` Kernel sederhana (Router, Request, Response)
- `src/Routes/` Definisi route
