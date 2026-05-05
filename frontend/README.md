# SPI-Hub Frontend (React)

Frontend aplikasi SPI-Hub dibangun menggunakan React + Vite dengan layout modular.

## Menjalankan

```bash
cd frontend
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Konfigurasi API

Salin `.env.example` menjadi `.env` lalu sesuaikan:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

## Struktur Singkat

- `src/app/` Router dan layout global
- `src/components/` Komponen reusable
- `src/pages/` Halaman per menu utama
- `src/features/` Domain feature
- `src/services/` API client
- `src/styles/` Styling global
