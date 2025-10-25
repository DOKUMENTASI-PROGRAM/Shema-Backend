# Git Submodule Migration Report

## Overview
Dokumen ini menjelaskan proses migrasi service dari monorepo ke git submodule untuk meningkatkan manajemen kode dan independensi setiap service.

## Tujuan
- Memisahkan setiap service menjadi repository GitHub independen
- Memudahkan manajemen versi dan deployment per service
- Meningkatkan kolaborasi tim development
- Mengurangi dependensi antar service

## Service yang Dimigrasi

### 1. Admin Service
- **Repository**: https://github.com/DOKUMENTASI-PROGRAM/Admin-Service.git
- **Port**: 3002
- **Deskripsi**: Service untuk manajemen admin dan autentikasi admin
- **Status**: ✅ Selesai dimigrasi

### 2. API Gateway Service
- **Repository**: https://github.com/DOKUMENTASI-PROGRAM/Api-Gateway.git
- **Port**: 3000
- **Deskripsi**: Gateway untuk mengatur routing antar service
- **Status**: ✅ Selesai dimigrasi

### 3. Auth Service
- **Repository**: https://github.com/DOKUMENTASI-PROGRAM/Auth-Service.git
- **Port**: 3001
- **Deskripsi**: Service untuk autentikasi user
- **Status**: ✅ Selesai dimigrasi

### 4. Booking Service
- **Repository**: https://github.com/DOKUMENTASI-PROGRAM/Booking-Service.git
- **Port**: 3004
- **Deskripsi**: Service untuk manajemen booking kursus
- **Status**: ✅ Selesai dimigrasi

### 5. Course Service
- **Repository**: https://github.com/DOKUMENTASI-PROGRAM/Course-Service.git
- **Port**: 3003
- **Deskripsi**: Service untuk manajemen kursus
- **Status**: ✅ Selesai dimigrasi

### 6. Recommendation Service
- **Repository**: https://github.com/DOKUMENTASI-PROGRAM/Recommedation-Service.git
- **Port**: 3005
- **Deskripsi**: Service untuk rekomendasi kursus menggunakan AI
- **Status**: ✅ Selesai dimigrasi

### 7. Documentation Service
- **Repository**: https://github.com/DOKUMENTASI-PROGRAM/Documentation-Service.git
- **Port**: 3007
- **Deskripsi**: Service untuk dokumentasi API
- **Status**: ⚠️ Perlu dibuat repository terlebih dahulu

## Proses Migrasi

### Langkah 1: Inisialisasi Repository
```bash
# Setiap service diinisialisasi sebagai git repository terpisah
cd [service-name]
git init
git remote add origin [repository-url]
```

### Langkah 2: Konfigurasi .gitignore
Setiap service dikonfigurasi dengan .gitignore untuk:
- `node_modules/`
- `bun.lock`
- `.env` files
- Build outputs
- Logs

### Langkah 3: Push ke Repository
```bash
git add .
git commit -m "Initial commit - [Service Name]"
git push -u origin master
```

### Langkah 4: Hapus Folder dari Repository Utama
```bash
# Menghapus folder service dari repository utama
rmdir /s /q [service-name]
```

### Langkah 5: Tambahkan sebagai Submodule
```bash
# Menambahkan service sebagai submodule
git submodule add [repository-url] [service-name]
```

### Langkah 6: Update Docker Compose
- Memastikan path build context mengarah ke folder submodule
- Memperbaiki typo pada nama service
- Menambahkan documentation service yang hilang

## Perubahan Docker Compose

### Service yang Diperbaiki:
1. **Recommendation Service**: 
   - Path: `./recommendation` → `./recommendation`
   - Container name: `shema-recommendation-service` → `shema-recommendation-service`
   - Service name: `recommendation-service` → `recommendation-service`

2. **Documentation Service**:
   - Ditambahkan konfigurasi yang hilang
   - Port: 3007
   - Context: `./documentation`

## Struktur Repository Baru

```
Shema-Backend/
├── .gitmodules
├── .git/
├── admin/ (submodule)
├── api-gateway/ (submodule)
├── auth/ (submodule)
├── booking/ (submodule)
├── course/ (submodule)
├── recommendation/ (submodule)
├── documentation/ (submodule)
├── docs/
├── scripts/
├── supabase/
├── docker-compose.yml
└── .env
```

## Cara Penggunaan Submodule

### Clone Repository dengan Submodule
```bash
git clone https://github.com/DOKUMENTASI-PROGRAM/Shema-Backend.git
cd Shema-Backend
git submodule update --init --recursive
```

### Update Submodule
```bash
# Update semua submodule ke versi terbaru
git submodule update --remote --merge

# Update submodule tertentu
cd [service-name]
git pull origin master
cd ..
git add [service-name]
git commit -m "Update [service-name] submodule"
```

### Switch Branch di Submodule
```bash
cd [service-name]
git checkout [branch-name]
cd ..
git add [service-name]
git commit -m "Switch [service-name] to [branch-name]"
```

## Manajemen Deployment

### Docker Compose
- Setiap service tetap dapat di-build menggunakan Docker
- Path build context mengarah ke folder submodule
- Environment variables tetap menggunakan file `.env` utama

### Development Workflow
1. **Perubahan di Service Tertentu**:
   - Masuk ke folder service
   - Lakukan perubahan
   - Commit dan push ke repository service
   - Update submodule di repository utama

2. **Perubahan Global**:
   - Perubahan di docker-compose.yml
   - Perubahan di environment variables
   - Perubahan di shared scripts

## Keuntungan Arsitektur Baru

1. **Independensi Service**: Setiap service dapat dikembangkan secara independen
2. **Version Control**: Setiap service memiliki version control terpisah
3. **Deployment**: Deployment dapat dilakukan per service
4. **Kolaborasi**: Tim dapat bekerja di service yang berbeda tanpa konflik
5. **Testing**: Testing dapat dilakukan per service secara terisolasi

## Catatan Penting

1. **Documentation Service**: Repository belum dibuat, perlu dibuat terlebih dahulu
2. **Environment Variables**: Pastikan environment variables konsisten antar service
3. **Network Configuration**: Service tetap berkomunikasi melalui Docker network
4. **Database Access**: Semua service tetap mengakses database yang sama

## Troubleshooting

### Submodule Tidak Ter-update
```bash
git submodule sync
git submodule update --init --recursive
```

### Build Error di Docker
- Pastikan path build context di docker-compose.yml benar
- Check apakah submodule sudah di-clone dengan benar

### Service Tidak Start
- Check environment variables
- Verify network configuration
- Check dependency service

## Next Steps

1. Membuat repository untuk Documentation Service
2. Testing deployment dengan konfigurasi submodule
3. Update CI/CD pipeline untuk mendukung submodule
4. Dokumentasi API untuk setiap service
5. Monitoring dan logging untuk setiap service

## Kontak

Untuk pertanyaan atau masalah terkait migrasi, hubungi:
- Development Team
- DevOps Team

---
*Report ini dibuat pada tanggal 25 Oktober 2025*