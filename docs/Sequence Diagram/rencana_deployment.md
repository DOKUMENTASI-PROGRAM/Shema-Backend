# Rencana Deployment Backend SHEMA

**Dokumen ini menjelaskan cara deploy backend SHEMA dengan biaya minimal hingga gratis.**

---

## 📋 Ringkasan Arsitektur

Backend SHEMA terdiri dari komponen berikut:

### Services yang Di-Deploy (Docker)
| Service | Port | Memory Est. | Deskripsi |
|---------|------|-------------|-----------|
| API Gateway | 3000, 8080, 8081 | ~150MB | Entry point semua request |
| Auth Service | 3001 | ~100MB | Autentikasi admin |
| Admin Service | 3002 | ~100MB | Manajemen admin |
| Course Service | 3003 | ~100MB | Manajemen kursus |
| Booking Service | 3008 | ~100MB | Booking & registrasi |
| Recommendation Service | 3005 | ~150MB | Rekomendasi AI |
| Notification Service | 3009 | ~100MB | WebSocket notifikasi |
| Documentation Service | 3007 | ~50MB | API docs |
| Redis | 6379 | ~100MB | Cache & session |
| Zookeeper | 2181 | ~256MB | Kafka coordinator |
| Kafka | 9092 | ~1.5GB | Message queue |

**Total Estimasi RAM: 3-4GB minimum, 6-8GB recommended**

### External Services (Sudah Digunakan)
- ✅ **Supabase** - Database PostgreSQL (menggunakan remote, bukan local)
- ✅ **Firebase** - Authentication
- ✅ **Google AI API** - Recommendation engine

---

## 💰 Opsi Deployment Berdasarkan Budget

### 🆓 OPSI 1: GRATIS TOTAL - Oracle Cloud Always Free (RECOMMENDED)

**Spesifikasi Oracle Cloud Free Tier:**
- 4 ARM Ampere A1 cores
- 24 GB RAM
- 200 GB Block Storage
- 10 TB outbound data/month
- **Biaya: $0/bulan selamanya**

**Kelebihan:**
- ✅ RAM sangat besar (24GB), lebih dari cukup untuk Kafka
- ✅ Storage besar (200GB)
- ✅ Tidak ada batas waktu (Always Free)
- ✅ Lokasi server tersedia di beberapa region

**Kekurangan:**
- ⚠️ Proses sign-up bisa sulit (perlu kartu kredit untuk verifikasi)
- ⚠️ ARM architecture (tapi Docker images sudah support)
- ⚠️ Availability bisa terbatas di beberapa region

**Cara Daftar:**
1. Kunjungi https://www.oracle.com/cloud/free/
2. Buat akun dengan email dan kartu kredit (hanya verifikasi, tidak dicharge)
3. Pilih region terdekat (Singapore/Japan untuk Indonesia)
4. Buat Compute Instance dengan shape "VM.Standard.A1.Flex"
5. Alokasikan 4 OCPU dan 24GB RAM

---

### 💵 OPSI 2: BUDGET MINIMAL - Hetzner Cloud (~€4-9/bulan)

**Hetzner CX22 (€4.59/bulan ≈ Rp 78.000/bulan):**
| Spec | Value |
|------|-------|
| CPU | 2 vCPU (shared) |
| RAM | 4 GB |
| Storage | 40 GB SSD |
| Traffic | 20 TB/bulan |

**Hetzner CX32 (€8.49/bulan ≈ Rp 145.000/bulan) - RECOMMENDED:**
| Spec | Value |
|------|-------|
| CPU | 4 vCPU (shared) |
| RAM | 8 GB |
| Storage | 80 GB SSD |
| Traffic | 20 TB/bulan |

**Kelebihan:**
- ✅ Murah dan reliable
- ✅ Data center di Eropa (Jerman, Finlandia)
- ✅ Uptime tinggi
- ✅ Mudah scale up

**Link:** https://www.hetzner.com/cloud

---

### 💵 OPSI 3: BUDGET ALTERNATIVE - Contabo (~€5-7/bulan)

**Contabo VPS S (€4.99/bulan ≈ Rp 85.000/bulan):**
| Spec | Value |
|------|-------|
| CPU | 4 vCPU |
| RAM | 8 GB |
| Storage | 200 GB SSD |
| Traffic | 32 TB/bulan |

**Kelebihan:**
- ✅ Sangat murah dengan spek tinggi
- ✅ Storage besar

**Kekurangan:**
- ⚠️ Network performance bisa bervariasi
- ⚠️ Support lebih lambat

**Link:** https://contabo.com/en/vps/

---

### 💵 OPSI 4: IDCloudHost - Penyedia Lokal Indonesia (~Rp 87.000-300.000/bulan)

**Kelebihan IDCloudHost:**
- ✅ **Server di Indonesia** - Latency rendah untuk pengguna lokal
- ✅ **Support 24/7 berbahasa Indonesia**
- ✅ **Pembayaran mudah** - Transfer bank lokal (BCA, BNI, BRI, Mandiri), OVO, GoPay, Alfamart, Indomaret
- ✅ **One-Click Deploy Docker** - Sudah tersedia template Docker
- ✅ **Anti DDoS Protection** bawaan
- ✅ **ISO 27001 & ISO 9001 certified**
- ✅ **Data Center di Indonesia & Singapore**

**Paket yang Tersedia:**

| Paket | Spesifikasi | Harga/bulan | Cocok Untuk |
|-------|-------------|-------------|-------------|
| **Basic Standard** | 2 vCPU, 2GB RAM, 20GB SSD | Rp 87.000 | ⚠️ Kurang memadai |
| **Basic Standard+** | 2 vCPU, 4GB RAM, 40GB SSD | ~Rp 150.000 | ✅ Minimum |
| **Intel eXtreme** | 4 vCPU, 8GB RAM, 80GB NVMe | ~Rp 250.000 | ✅ Recommended |
| **AMD eXtreme** | 4 vCPU, 8GB RAM, 80GB NVMe | ~Rp 250.000 | ✅ Recommended (Performa 6-8x) |

> **Catatan:** Harga bisa berbeda, cek langsung di https://console.idcloudhost.com untuk konfigurasi custom.

**Fitur Unggulan:**
- Object Storage S3 Compatible (untuk backup)
- Managed Database (opsional)
- Load Balancer (untuk scaling)
- Instant Deploy < 60 detik

**Link:** https://idcloudhost.com/cloud-vps/

---

### 💵 OPSI 5: PREMIUM - DigitalOcean/Vultr (~$12-24/bulan)

**DigitalOcean Droplet:**
- Basic $12/bulan: 2 vCPU, 2GB RAM (kurang memadai)
- Basic $24/bulan: 2 vCPU, 4GB RAM (minimum)
- Basic $48/bulan: 4 vCPU, 8GB RAM (recommended)

**Tidak disarankan untuk budget minimal karena harga lebih mahal.**

---

## 📊 Perbandingan Opsi

| Provider | RAM | CPU | Storage | Harga/bulan | Server Lokasi | Rating |
|----------|-----|-----|---------|-------------|---------------|--------|
| **Oracle Free** | 24GB | 4 ARM | 200GB | **GRATIS** | Singapore/Japan | ⭐⭐⭐⭐⭐ |
| **Contabo VPS S** | 8GB | 4 vCPU | 200GB | ~Rp 85.000 | Eropa/Asia | ⭐⭐⭐⭐ |
| **Hetzner CX32** | 8GB | 4 vCPU | 80GB | ~Rp 145.000 | Eropa | ⭐⭐⭐⭐ |
| **IDCloudHost Basic** | 4GB | 2 vCPU | 40GB | ~Rp 150.000 | 🇮🇩 Indonesia | ⭐⭐⭐⭐ |
| **IDCloudHost eXtreme** | 8GB | 4 vCPU | 80GB | ~Rp 250.000 | 🇮🇩 Indonesia | ⭐⭐⭐⭐⭐ |
| **Hetzner CX22** | 4GB | 2 vCPU | 40GB | ~Rp 78.000 | Eropa | ⭐⭐⭐ |
| DigitalOcean | 4GB | 2 vCPU | 80GB | ~Rp 380.000 | Singapore | ⭐⭐ |

### 🏆 Rekomendasi Berdasarkan Kebutuhan:

| Kebutuhan | Pilihan Terbaik | Alasan |
|-----------|-----------------|--------|
| **Budget Minimal** | Oracle Cloud Free | GRATIS, RAM besar |
| **Server di Indonesia** | IDCloudHost | Latency rendah, support lokal |
| **Balance Harga-Performa** | Contabo/Hetzner | Murah dengan spek tinggi |
| **Production Serius** | IDCloudHost eXtreme / Hetzner CX32 | Performa stabil |

---

## 🔧 Spesifikasi Minimum Server

### Minimum (Dapat Berjalan):
```
CPU: 2 cores
RAM: 4 GB
Storage: 40 GB SSD
OS: Ubuntu 22.04 LTS
```

### Recommended (Optimal):
```
CPU: 4 cores
RAM: 8 GB
Storage: 80 GB SSD
OS: Ubuntu 22.04 LTS / Debian 12
```

### Production Ready:
```
CPU: 4-8 cores
RAM: 16 GB
Storage: 160 GB SSD
OS: Ubuntu 22.04 LTS
```

---

## ✅ Checklist Yang Perlu Disiapkan

### 1. Akun Cloud Services (GRATIS)

| Service | Link | Free Tier |
|---------|------|-----------|
| ✅ Supabase | https://supabase.com | 500MB DB, 2GB storage |
| ✅ Firebase | https://firebase.google.com | 10K auth/bulan |
| ✅ Google AI | https://aistudio.google.com | Free quota |
| ⬜ Oracle Cloud (opsional) | https://oracle.com/cloud | VPS gratis |
| ⬜ Cloudflare | https://cloudflare.com | DNS, CDN gratis |

### 2. Domain (Opsional)

**Opsi Gratis:**
- Subdomain dari Railway: `app.railway.app`
- Subdomain dari Render: `app.onrender.com`
- DuckDNS: `yourname.duckdns.org`
- Freenom (terbatas): `.tk`, `.ml`, `.ga`

**Opsi Murah:**
- Namecheap: ~$10/tahun untuk `.com`
- Cloudflare Registrar: Harga cost (tanpa markup)
- Niagahoster: ~Rp 14.000/tahun untuk `.my.id`

### 3. Environment Variables

Siapkan file `.env` dengan nilai berikut:
```env
# Node Environment
NODE_ENV=production

# JWT Secrets (generate random string 64 char)
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
SERVICE_JWT_SECRET=your_service_jwt_secret_here

# Supabase (dari dashboard Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Redis
REDIS_URL=redis://redis:6379

# Google AI
GOOGLE_AI_API_KEY=your_google_ai_key

# CORS
CORS_ORIGIN=https://your-frontend-domain.com
```

### 4. SSL Certificate

**Gratis dengan Let's Encrypt:**
- Otomatis dengan Caddy (recommended)
- Manual dengan Certbot untuk Nginx

---

## 🚀 Step-by-Step Deployment

### Step 1: Siapkan VPS

```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Tambahkan user ke grup docker
sudo usermod -aG docker $USER
newgrp docker
```

### Step 2: Clone Repository

```bash
# Clone repo
git clone https://github.com/DOKUMENTASI-PROGRAM/Shema-Backend.git
cd Shema-Backend

# Buat file .env
cp .env.example .env
nano .env  # Edit dengan nilai production
```

### Step 3: Konfigurasi Firewall

```bash
# Buka port yang diperlukan
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # API Gateway (jika tanpa reverse proxy)
sudo ufw enable
```

### Step 4: Setup Reverse Proxy (Caddy - Recommended)

Buat file `Caddyfile`:
```
api.yourdomain.com {
    reverse_proxy localhost:3000
}

ws.yourdomain.com {
    reverse_proxy localhost:8080
}

docs.yourdomain.com {
    reverse_proxy localhost:3007
}
```

Install Caddy:
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

### Step 5: Jalankan Services

```bash
# Build dan jalankan semua services
docker compose up -d --build

# Cek status
docker compose ps

# Lihat logs
docker compose logs -f
```

### Step 6: Verifikasi Deployment

```bash
# Test health check
curl http://localhost:3000/health

# Test API Gateway
curl http://localhost:3000/api/v1/courses
```

---

## 🔒 Keamanan Production

### 1. Hardening Server
```bash
# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Change SSH port (opsional)
sudo sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config

# Restart SSH
sudo systemctl restart sshd
```

### 2. Fail2ban
```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Update Otomatis
```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 📈 Monitoring (Gratis)

### 1. Uptime Monitoring
- **UptimeRobot** (free): https://uptimerobot.com - 50 monitors gratis
- **Freshping** (free): https://freshping.io - 50 checks gratis

### 2. Log Monitoring
```bash
# Lihat logs real-time
docker compose logs -f api-gateway

# Lihat logs service tertentu
docker compose logs -f auth-service
```

### 3. Container Metrics
```bash
# Resource usage
docker stats

# Disk usage
docker system df
```

---

## 💡 Tips Optimasi untuk RAM Minimal

Jika RAM terbatas (4GB), pertimbangkan:

### 1. Disable Supabase Local
Karena sudah menggunakan Supabase remote, hapus service `supabase` dari docker-compose:
```yaml
# Comment atau hapus bagian ini
# supabase:
#   image: supabase/postgres:15.1.0.147
#   ...
```

### 2. Kurangi Kafka Memory
Tambahkan environment variable:
```yaml
kafka:
  environment:
    KAFKA_HEAP_OPTS: "-Xmx512M -Xms512M"
```

### 3. Gunakan Redis sebagai Alternatif Kafka
Untuk traffic rendah, bisa menggunakan Redis Pub/Sub sebagai pengganti Kafka.

---

## 📞 Troubleshooting

### Service Tidak Mau Start
```bash
# Lihat logs error
docker compose logs service-name

# Restart service
docker compose restart service-name
```

### Out of Memory
```bash
# Cek memory usage
free -h
docker stats

# Kurangi Kafka memory atau upgrade RAM
```

### Port Conflict
```bash
# Cek port yang digunakan
sudo netstat -tulpn | grep LISTEN

# Kill process yang menggunakan port
sudo kill -9 $(sudo lsof -t -i:3000)
```

---

## 📝 Kesimpulan

### Rekomendasi Final:

| Budget | Pilihan | Biaya/bulan | Catatan |
|--------|---------|-------------|---------|
| **GRATIS** | Oracle Cloud Free | Rp 0 | RAM 24GB, terbaik untuk testing/produksi kecil |
| **Minimal** | Contabo VPS S | ~Rp 85.000 | Murah tapi server di Eropa |
| **Lokal Indonesia** | IDCloudHost Basic+ | ~Rp 150.000 | Latency rendah, support lokal |
| **Recommended** | IDCloudHost eXtreme | ~Rp 250.000 | Performa tinggi, server Indonesia |
| **Alternative** | Hetzner CX32 | ~Rp 145.000 | Reliable, server Eropa |

### Kapan Memilih IDCloudHost?

✅ **Pilih IDCloudHost jika:**
- Target pengguna di Indonesia (latency rendah)
- Butuh support berbahasa Indonesia 24/7
- Ingin pembayaran mudah (transfer bank lokal, e-wallet, minimarket)
- Butuh invoice/faktur pajak untuk perusahaan
- Prefer data center lokal untuk compliance

❌ **Pilih Provider Luar jika:**
- Budget sangat terbatas (Oracle Free)
- Tidak masalah dengan latency lebih tinggi
- Bisa handle support dalam bahasa Inggris

### Yang TIDAK Perlu Dibeli:
- ❌ Server fisik sendiri
- ❌ Database hosting (sudah ada Supabase free)
- ❌ Auth service (sudah ada Firebase free)
- ❌ SSL Certificate (Let's Encrypt gratis)
- ❌ CDN (Cloudflare gratis)
- ❌ Monitoring (UptimeRobot gratis)

### Yang Perlu Disiapkan:
- ✅ VPS (gratis di Oracle atau murah di Hetzner/Contabo)
- ✅ Domain (opsional, bisa pakai subdomain gratis)
- ✅ Environment variables yang benar
- ✅ Basic Linux knowledge untuk maintenance

---

**Dokumen dibuat:** 2 Desember 2024  
**Terakhir diupdate:** 2 Desember 2024
