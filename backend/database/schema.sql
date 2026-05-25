-- SPI-Hub Database Schema
-- Run this script to create the database and tables

CREATE DATABASE IF NOT EXISTS spi_hub;
USE spi_hub;

-- Users table
CREATE TABLE IF NOT EXISTS users (
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
CREATE TABLE IF NOT EXISTS programs (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    year INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- WorkList (Tasks) table
CREATE TABLE IF NOT EXISTS worklist (
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
CREATE TABLE IF NOT EXISTS audit_plans (
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
    time VARCHAR(10) DEFAULT NULL,
    team JSON,
    phases JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Audit Plan Team (Team Anggota) table
CREATE TABLE IF NOT EXISTS audit_plan_team (
    id INT AUTO_INCREMENT PRIMARY KEY,
    audit_plan_id VARCHAR(50) NOT NULL,
    role ENUM('pic', 'pt', 'ketua', 'anggota') NOT NULL,
    name VARCHAR(255) NOT NULL,
    FOREIGN KEY (audit_plan_id) REFERENCES audit_plans(id) ON DELETE CASCADE
);

-- Audit Plan Phases table
CREATE TABLE IF NOT EXISTS audit_plan_phases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    audit_plan_id VARCHAR(50) NOT NULL,
    phase VARCHAR(100) NOT NULL,
    date DATE,
    done BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (audit_plan_id) REFERENCES audit_plans(id) ON DELETE CASCADE
);

-- Activity Logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    user VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(50) DEFAULT '127.0.0.1',
    category VARCHAR(50) DEFAULT '',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_activity_logs_user (user_id),
    INDEX idx_activity_logs_timestamp (timestamp)
);

-- Sessions table for session management
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    token VARCHAR(255) NOT NULL,
    ip_address VARCHAR(50) DEFAULT '127.0.0.1',
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_sessions_user (user_id),
    INDEX idx_sessions_token (token(100)),
    INDEX idx_sessions_expires (expires_at)
);

-- Chat Messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender VARCHAR(100) NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    recipient VARCHAR(100) DEFAULT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at),
    INDEX idx_sender (sender),
    INDEX idx_recipient (recipient)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes for better performance
CREATE INDEX idx_programs_year ON programs(year);
CREATE INDEX idx_worklist_program ON worklist(program_id);
CREATE INDEX idx_worklist_year ON worklist(year);
CREATE INDEX idx_worklist_status ON worklist(status);
CREATE INDEX idx_audit_plans_date ON audit_plans(start_date);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp);

-- Insert default users (password: admin123, auditor123, kspi123)
INSERT INTO users (id, username, password, name, role, email, department, phone, status) VALUES
('u1', 'admin', 'admin123', 'Administrator', 'admin', 'admin@aopti.go.id', 'Pengawasan Intern', '021-1234567', 'active'),
('u2', 'auditor', 'auditor123', 'Ahmad Auditor', 'auditor', 'ahmad.auditor@aopti.go.id', 'Tim Audit 1', '021-2345678', 'active'),
('u3', 'kspi', 'kspi123', 'Budi KSPI', 'kspi', 'budi.kspi@aopti.go.id', 'KSPI', '021-3456789', 'active')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert default programs
INSERT INTO programs (id, name, year) VALUES
('prog1-2026', 'Pemenuhan Program Pengawasan', 2026),
('prog2-2026', 'HRADC', 2026),
('prog3-2026', 'Lainnya', 2026)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Insert default worklist items
INSERT INTO worklist (id, task_id, program_id, program_name, task_name, start_date, end_date, progress, status, year) VALUES
('wl001', 'task001', 'prog1-2026', 'Pemenuhan Program Pengawasan', 'Audit MBG', '2026-04-12', '2026-04-19', 100, 'completed', 2026),
('wl002', 'task002', 'prog1-2026', 'Pemenuhan Program Pengawasan', 'Review Pengadaan Barang Strategis', '2026-04-20', '2026-05-02', 50, 'in_progress', 2026),
('wl003', 'task003', 'prog1-2026', 'Pemenuhan Program Pengawasan', 'Evaluasi Kepatuhan Kontrak Tahap I', '2026-05-03', '2026-05-12', 50, 'in_progress', 2026),
('wl004', 'task004', 'prog1-2026', 'Pemenuhan Program Pengawasan', 'Sampling Dokumen Pengeluaran', '2026-06-01', '2026-06-14', 0, 'scheduled', 2026)
ON DUPLICATE KEY UPDATE task_name = VALUES(task_name);