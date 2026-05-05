# SPI-Hub

SPI-Hub adalah aplikasi internal audit dengan stack:

- Frontend: ReactJS (Vite)
- Backend: PHP 8 (REST API sederhana)

## Struktur Folder

```text
SPI-Hub/
  frontend/
  backend/
  .github/
```

## Menjalankan Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend berjalan di `http://localhost:5173`.

## Menjalankan Backend

```bash
cd backend
php -S localhost:8000 -t public
```

Backend berjalan di `http://localhost:8000`.

## Endpoint API Utama

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/dashboard/summary`
- `GET /api/audit-plan/calendar`
- `GET /api/fieldwork`
- `GET /api/reports`
- `GET /api/analytics`
- `GET /api/chat`

## Menu Aplikasi (Frontend)

- Dashboard
- Audit Plan
- Fieldwork
- Reports
- Analytics
- Team Chat
- Login

## Catatan

Desain halaman mengikuti referensi mockup yang Anda berikan: login, dashboard, audit plan, dan team chat dengan sidebar + topbar konsisten.
