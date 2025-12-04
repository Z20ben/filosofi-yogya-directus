# Quick Setup Guide

## Step-by-Step Setup

### 1. Pastikan Node.js 22+ Aktif

```bash
fnm use 22
node --version  # Harus v22.x.x
```

### 2. Buat Database PostgreSQL

**Opsi A: Via psql command line**

```bash
# Login ke PostgreSQL
psql -U postgres

# Buat database
CREATE DATABASE filosofi_yogya_directus;

# Cek database sudah dibuat
\l

# Keluar
\q
```

**Opsi B: Via pgAdmin**

1. Buka pgAdmin
2. Klik kanan "Databases" → "Create" → "Database..."
3. Nama: `filosofi_yogya_directus`
4. Owner: `postgres` (atau user PostgreSQL Anda)
5. Klik "Save"

### 3. Setup Environment Variables

Edit file `.env` dan ubah nilai berikut:

```env
# 1. Ganti password PostgreSQL Anda
DB_PASSWORD=your_actual_postgres_password

# 2. Generate KEY dan SECRET dengan command ini:
# openssl rand -base64 32

KEY=paste_generated_key_here
SECRET=paste_generated_secret_here

# 3. (Opsional) Ganti admin credentials
ADMIN_EMAIL=admin@filosofi-yogya.local
ADMIN_PASSWORD=YourSecurePassword123!
```

**Generate Keys:**

```bash
# Di Git Bash / Linux / Mac
openssl rand -base64 32  # Copy untuk KEY
openssl rand -base64 32  # Copy untuk SECRET

# Di Windows PowerShell
[Convert]::ToBase64String((1..32|%{Get-Random -Max 256}))
```

### 4. Bootstrap Directus

```bash
npm run bootstrap
```

Output yang diharapkan:
```
✔ Database created
✔ Migrations applied
✔ Admin user created
```

### 5. Start Directus

```bash
npm start
```

Buka browser: **http://localhost:8055**

### 6. Login

- Email: `admin@filosofi-yogya.local` (sesuai .env)
- Password: `YourSecurePassword123!` (sesuai .env)

---

## Troubleshooting

### Error: Database "filosofi_yogya_directus" does not exist

Database belum dibuat. Jalankan:
```sql
CREATE DATABASE filosofi_yogya_directus;
```

### Error: password authentication failed for user "postgres"

Password di `.env` salah. Cek kembali `DB_PASSWORD`.

### Error: connect ECONNREFUSED 127.0.0.1:5432

PostgreSQL tidak berjalan. Start PostgreSQL service:

**Windows:**
```bash
# Cek status
sc query postgresql-x64-15  # atau sesuai versi Anda

# Start service
net start postgresql-x64-15
```

### Port 8055 sudah digunakan

Edit `.env`:
```env
PORT=8056
PUBLIC_URL=http://localhost:8056
```

---

## Next Steps After Setup

1. **Create Collections** - Buat structure untuk data (map_locations, agenda_events, dll)
2. **Configure Fields** - Setup fields untuk setiap collection
3. **Set Permissions** - Configure public read access
4. **Import Data** - Import mock data dari `../filosofi-yogya-mod/lib/data/mock/`
5. **Test API** - Coba akses API endpoints
6. **Connect Frontend** - Integrate dengan Next.js

---

## Useful Commands

```bash
# Start Directus
npm start

# Bootstrap (first time setup)
npm run bootstrap

# Run migrations
npm run migrate
```
