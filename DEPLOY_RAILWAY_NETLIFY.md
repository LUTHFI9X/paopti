# Deploy Railway + Netlify (SPI-Hub)

## 1. Deploy backend ke Railway

Project ini sudah disiapkan dengan konfigurasi Railway di dua lokasi:

- `railway.toml` + `Dockerfile` di root repo
- `backend/railway.toml` + `backend/Dockerfile` jika root directory service diatur ke `backend`

Railway harus menjalankan backend PHP (bukan static hosting), dan bind ke `PORT` otomatis.

Langkah:

1. Buka Railway, buat project baru.
2. Pilih `Deploy from GitHub repo` dan pilih repo ini.
3. Di service backend Railway, pastikan:

- Root Directory = `/backend` (disarankan), atau `/` jika memakai Dockerfile root.
- Config-as-code file = `/backend/railway.toml` (atau `/railway.toml` jika root `/`).
- Build method = Dockerfile (bukan static/railpack default).

4. Setelah service terbentuk, tambahkan environment variables berikut:

- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_URL=https://<railway-domain>`
- `DB_HOST=<railway-mysql-host>`
- `DB_PORT=<railway-mysql-port>`
- `DB_NAME=<railway-mysql-dbname>`
- `DB_USER=<railway-mysql-user>`
- `DB_PASS=<railway-mysql-password>`
- `DB_SOCKET=`
- `CORS_ALLOW_ALL=false`
- `CORS_ALLOWED_ORIGINS=https://<netlify-domain>`

5. Deploy service sampai status `Healthy`.
6. Catat URL backend, misalnya:

`https://your-service.up.railway.app`

## 2. Sambungkan frontend Netlify ke Railway

Di Netlify (site frontend):

1. Site settings -> Environment variables.
2. Tambahkan:

`VITE_API_BASE_URL=https://your-service.up.railway.app/api`

3. Trigger `Clear cache and deploy`.

## 3. Verifikasi cepat

Backend:

`https://your-service.up.railway.app/api/health`

harus mengembalikan JSON sukses.

Jika masih 404, cek Deployment Details di Railway dan pastikan:

- Build source berasal dari file `railway.toml`
- Build pakai Dockerfile
- Health check path ` /api/health `

Frontend:

- Buka site Netlify.
- Coba login dan cek modul Dashboard/Worklist.
- Jika data tidak muncul, buka browser DevTools -> Network:
  - pastikan request menuju domain Railway.
  - pastikan tidak ada error CORS.

## 4. Catatan penting

- Netlify tidak menjalankan backend PHP, jadi API wajib di Railway.
- Jika domain Netlify berubah (preview/branch), update `CORS_ALLOWED_ORIGINS` di Railway.
- Jika perlu sementara saat testing, set `CORS_ALLOW_ALL=true`.
