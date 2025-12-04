# Filosofi Yogya - Directus CMS Backend

Backend admin panel dan API untuk proyek Filosofi Yogya menggunakan Directus CMS.

## Prerequisites
- Git Bash 
- Node.js >= 22 (gunakan fnm: `fnm use 22`)
- PostgreSQL >= 12 (sudah terinstall di localhost:5432)
- npm >= 10
- fnm

### Quick Start (Untuk yang sudah setup)

**⚠️ PENTING:** Selalu gunakan **Git Bash** untuk menjalankan Directus, bukan CMD/PowerShell/WSL!

### Cara 1: Menggunakan Start Script (Recommended)

```bash
# Buka Git Bash
cd D:/Dev/next-budaya/filosofi-yogya-directus
./start.sh
```

### Cara 2: Manual (Git Bash)

```bash
# 1. Buka Git Bash
cd D:/Dev/next-budaya/filosofi-yogya-directus

# 2. Load fnm environment (jika belum auto-load)
source ~/.bashrc

# 3. Switch ke Node.js 22
fnm use 22

# 4. Verify Node version (harus v22.21.1)
node --version

# 5. Start Directus
npm start
 ```
 **Server berjalan di:** http://localhost:8055

**Stop server:** Tekan `Ctrl + C` di Git Bash

---


## Setup Instructions (First Time Setup)

### 1. Install Dependencies

```bash
npm install
```

### 2. Create PostgreSQL Database

Buka PostgreSQL command line atau pgAdmin, lalu jalankan:

```sql
CREATE DATABASE filosofi_yogya_directus;
```

Atau via command line:

```bash
# Windows (jika psql ada di PATH)
psql -U postgres -c "CREATE DATABASE filosofi_yogya_directus;"

# Atau login dulu
psql -U postgres
# Lalu jalankan:
CREATE DATABASE filosofi_yogya_directus;
\q
```

### 3. Configure Environment Variables

Copy file `.env.example` ke `.env`:

```bash
cp .env.example .env
```

Edit file `.env` dan isi nilai-nilai berikut:

```env
# Database - Ganti dengan kredensial PostgreSQL Anda
DB_PASSWORD=your_actual_postgres_password

# Security Keys - Generate dengan:
# openssl rand -base64 32
KEY=generated_random_key_here
SECRET=generated_random_secret_here

# Admin Account - Ganti jika perlu
ADMIN_EMAIL=admin@filosofi-yogya.local
ADMIN_PASSWORD=SecurePassword123!
```

### 4. Initialize Directus

Bootstrap Directus (membuat tabel dan admin user):

```bash
npx directus bootstrap
```

### 5. Run Directus

Start development server:

```bash
npx directus start
```

Directus akan berjalan di: **http://localhost:8055**

## Scripts

Tambahkan ke `package.json` untuk kemudahan:

```json
{
  "scripts": {
    "start": "directus start",
    "bootstrap": "directus bootstrap",
    "dev": "directus start"
  }
}
```

## Login ke Admin Panel

1. Buka browser: http://localhost:8055
2. Login dengan:
   - **Email**: `admin@filosofi-yogya.local` (atau sesuai .env)
   - **Password**: `SecurePassword123!` (atau sesuai .env)

## Data Migration

Data mock sudah disiapkan di folder `../filosofi-yogya-mod/lib/data/mock/`:

- **Map Locations** (29 items) - Ready to migrate
- **Agenda Events** (5 items)
- **Destinasi Wisata** (5 items)
- **Spot Nongkrong** (6 items)
- **Trending Articles** (6 items)
- **Encyclopedia** (6 entries + 6 categories)
- **UMKM Lokal** (6 items)

Lihat dokumentasi lengkap di: `../filosofi-yogya-mod/lib/data/mock/README.md`

## Next Steps

1. **Create Collections**: Buat collections di Directus untuk setiap data type
2. **Import Data**: Import mock data ke Directus
3. **Configure Permissions**: Setup roles & permissions untuk public API access
4. **Test API**: Test endpoints dari Next.js frontend
5. **Connect Frontend**: Update frontend untuk consume Directus API

## API Endpoints

Setelah setup, API akan tersedia di:

```
http://localhost:8055/items/{collection_name}
```

Example:
```
http://localhost:8055/items/map_locations
http://localhost:8055/items/agenda_events
```

## Troubleshooting

### Port 8055 sudah digunakan

Edit `.env`:
```env
PORT=8056
PUBLIC_URL=http://localhost:8056
```

### Database connection error

- Pastikan PostgreSQL running: `netstat -an | grep 5432`
- Cek kredensial di `.env` sudah benar
- Pastikan database `filosofi_yogya_directus` sudah dibuat

### Node version error

Gunakan Node.js 22+:
```bash
fnm use 22
node --version  # Should show v22.x.x
```

## Useful Commands

```bash
# Check Directus version
npx directus --version

# Create new admin user
npx directus users create --email user@example.com --password password --role administrator

# Database migrations
npx directus database migrate:latest
npx directus database migrate:up
npx directus database migrate:down
```

## Documentation

- Directus Docs: https://docs.directus.io
- API Reference: https://docs.directus.io/reference/introduction
- SDK for Next.js: https://docs.directus.io/guides/sdk/getting-started
