# Setup Guide - Frontend-Backend Connection

## Prerequisites

1. **MySQL** harus sudah terinstall dan running
2. **PHP** (minimal versi 8.0) untuk backend
3. **Node.js** untuk frontend

---

## Step 1: Setup Database MySQL

```bash
# Login ke MySQL
mysql -u root -p

# Buat database dan import schema
source backend/database/schema.sql
```

Atau jalankan SQL berikut di MySQL client Anda:

```sql
CREATE DATABASE IF NOT EXISTS spihub;
USE spihub;

-- Users table
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('admin', 'auditor', 'kspi') NOT NULL DEFAULT 'auditor',
    email VARCHAR(255) DEFAULT '',
    department VARCHAR(255) DEFAULT '',
    phone VARCHAR(50) DEFAULT '',
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Programs (Program Kerja) table
CREATE TABLE programs (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    year INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- WorkList (Tasks) table
CREATE TABLE worklist (
    id VARCHAR(50) PRIMARY KEY,
    task_id VARCHAR(50),
    program_id VARCHAR(50) NOT NULL,
    program_name VARCHAR(255) NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    location VARCHAR(255) DEFAULT '',
    pic VARCHAR(255) DEFAULT '',
    progress INT DEFAULT 0 CHECK (progress IN (0, 50, 100)),
    status ENUM('scheduled', 'in_progress', 'completed') DEFAULT 'scheduled',
    year INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);

-- Audit Plans (Agenda) table
CREATE TABLE audit_plans (
    id VARCHAR(50) PRIMARY KEY,
    task_id VARCHAR(50),
    program_name VARCHAR(255) NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    location VARCHAR(255) DEFAULT '',
    progress INT DEFAULT 0,
    status ENUM('scheduled', 'in_progress', 'completed') DEFAULT 'scheduled',
    completed BOOLEAN DEFAULT FALSE,
    is_agenda BOOLEAN DEFAULT TRUE,
    tahap_type ENUM('audit', 'non_audit') DEFAULT 'audit',
    phase_label VARCHAR(255) DEFAULT '',
    custom_percentage INT DEFAULT 0,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Audit Plan Team table
CREATE TABLE audit_plan_team (
    id INT AUTO_INCREMENT PRIMARY KEY,
    audit_plan_id VARCHAR(50) NOT NULL,
    role ENUM('pic', 'pt', 'ketua', 'anggota') NOT NULL,
    name VARCHAR(255) NOT NULL,
    FOREIGN KEY (audit_plan_id) REFERENCES audit_plans(id) ON DELETE CASCADE
);

-- Audit Plan Phases table
CREATE TABLE audit_plan_phases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    audit_plan_id VARCHAR(50) NOT NULL,
    phase VARCHAR(100) NOT NULL,
    date DATE,
    done BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (audit_plan_id) REFERENCES audit_plans(id) ON DELETE CASCADE
);

-- Activity Logs table
CREATE TABLE activity_logs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    user VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(50) DEFAULT '127.0.0.1',
    category VARCHAR(50) DEFAULT '',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default users (password: admin123, auditor123, kspi123)
INSERT INTO users (id, username, password, name, role, email, department, phone, status) VALUES
('u1', 'admin', 'admin123', 'Administrator', 'admin', 'admin@aopti.go.id', 'Pengawasan Intern', '021-1234567', 'active'),
('u2', 'auditor', 'auditor123', 'Ahmad Auditor', 'auditor', 'ahmad.auditor@aopti.go.id', 'Tim Audit 1', '021-2345678', 'active'),
('u3', 'kspi', 'kspi123', 'Budi KSPI', 'kspi', 'budi.kspi@aopti.go.id', 'KSPI', '021-3456789', 'active');

-- Insert default programs
INSERT INTO programs (id, name, year) VALUES
('prog1-2026', 'Pemenuhan Program Pengawasan', 2026),
('prog2-2026', 'HRADC', 2026),
('prog3-2026', 'Lainnya', 2026);

-- Insert default worklist
INSERT INTO worklist (id, task_id, program_id, program_name, task_name, start_date, end_date, progress, status, year) VALUES
('wl001', 'task001', 'prog1-2026', 'Pemenuhan Program Pengawasan', 'Audit MBG', '2026-04-12', '2026-04-19', 100, 'completed', 2026),
('wl002', 'task002', 'prog1-2026', 'Pemenuhan Program Pengawasan', 'Review Pengadaan Barang Strategis', '2026-04-20', '2026-05-02', 50, 'in_progress', 2026),
('wl003', 'task003', 'prog1-2026', 'Pemenuhan Program Pengawasan', 'Evaluasi Kepatuhan Kontrak Tahap I', '2026-05-03', '2026-05-12', 50, 'in_progress', 2026),
('wl004', 'task004', 'prog1-2026', 'Pemenuhan Program Pengawasan', 'Sampling Dokumen Pengeluaran', '2026-06-01', '2026-06-14', 0, 'scheduled', 2026);
```

---

## Step 2: Konfigurasi Backend

Edit file `backend/.env` sesuai dengan konfigurasi MySQL Anda:

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=spihub
DB_USER=root
DB_PASS=your_password_here
```

---

## Step 3: Jalankan Backend

```bash
cd backend
php -S localhost:8000 router.php
```

Backend akan running di `http://localhost:8000`

---

## Step 4: Jalankan Frontend

```bash
cd frontend
npm run dev
```

Frontend akan running di `http://localhost:5173`

---

## Step 5: Aktifkan Backend Connection (Opsional)

Untuk menggunakan MySQL backend, edit file `frontend/.env`:

```
VITE_USE_BACKEND=true
```

Untuk fallback ke localStorage:

```
VITE_USE_BACKEND=false
```

---

## Default Login Credentials

| Username   | Password     | Role     |
|------------|--------------|----------|
| admin      | admin123     | Admin    |
| auditor    | auditor123   | Auditor  |
| kspi       | kspi123      | KSPI     |

---

## API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Programs
- `GET /api/programs` - List programs
- `POST /api/programs` - Create program
- `PUT /api/programs/{id}` - Update program
- `DELETE /api/programs/{id}` - Delete program

### WorkList
- `GET /api/worklist` - List worklist
- `POST /api/worklist` - Create task
- `PUT /api/worklist/{id}` - Update task
- `DELETE /api/worklist/{id}` - Delete task
- `PUT /api/worklist/{id}/progress` - Update progress

### Audit Plans
- `GET /api/audit-plans` - List agenda
- `GET /api/audit-plan/calendar` - Calendar view
- `POST /api/audit-plans` - Create agenda
- `PUT /api/audit-plans/{id}` - Update agenda
- `DELETE /api/audit-plans/{id}` - Delete agenda