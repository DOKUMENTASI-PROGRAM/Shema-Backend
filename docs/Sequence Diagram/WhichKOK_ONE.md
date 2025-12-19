# Analisis Perbandingan: Self-Hosted Kafka vs Upstash Kafka untuk Shema Music Backend

## Pendahuluan

Dokumen ini menyajikan analisis komprehensif tentang kemungkinan migrasi dari Apache Kafka self-hosted ke Upstash Kafka, dampak perubahan pada setiap service backend, dan rekomendasi message broker yang paling cocok untuk proyek Shema Music.

---

## ⚠️ TEMUAN KRITIS: Upstash Kafka Sudah Dihentikan (Deprecated)

**PENTING:** Berdasarkan penelusuran pada dokumentasi dan website Upstash (Desember 2025), layanan **Upstash Kafka sudah tidak tersedia lagi**. Meskipun platform Upstash masih aktif beroperasi, layanan Kafka serverless mereka telah dihentikan.

### Status Upstash Platform

| Status | Detail |
|--------|--------|
| ✅ Platform Upstash | AKTIF - https://upstash.com/docs/introduction bisa diakses |
| ❌ Upstash Kafka | TIDAK TERSEDIA - Layanan sudah dihentikan |

### Produk Upstash yang MASIH AKTIF (per Desember 2025)

1. **Redis** - Serverless key-value store
2. **Vector** - Database untuk AI/LLM
3. **QStash** - Serverless messaging dan scheduling
4. **Workflow** - Durable serverless functions
5. **Search** - Serverless search (produk terbaru)

### Bukti Upstash Kafka Tidak Tersedia

| URL | Hasil |
|-----|-------|
| https://upstash.com/docs/kafka | 404 Page Not Found |
| https://console.upstash.com/kafka | "Sorry, that page could not be found" |
| https://upstash.com/pricing | Tidak ada tab/opsi Kafka |
| Navigation menu Upstash | Tidak ada menu Kafka |

**Kesimpulan Awal:** Migrasi ke Upstash Kafka **TIDAK MUNGKIN** dilakukan karena layanan tersebut sudah dihentikan.

Namun, dokumen ini tetap menyediakan analisis lengkap untuk keperluan:
1. Dokumentasi historis dan pembelajaran
2. Referensi jika Upstash memutuskan mengaktifkan kembali layanan Kafka
3. Sebagai bahan pertimbangan untuk alternatif managed Kafka lainnya

---

## 1. Kondisi Saat Ini: Penggunaan Kafka Self-Hosted

### 1.1 Infrastructure Dependencies

Saat ini, proyek menggunakan dua container untuk message broker:

| Container | Image | Port | Fungsi |
|-----------|-------|------|--------|
| Zookeeper | confluentinc/cp-zookeeper:7.4.0 | 2181 | Koordinasi cluster Kafka |
| Kafka | confluentinc/cp-kafka:7.4.0 | 9092 | Message broker utama |

### 1.2 Analisis Per-Service: Implementasi Kafka

#### Auth Service (Port 3001)

| Aspek | Detail |
|-------|--------|
| Role | Producer |
| Library | kafkajs@2.3.0-beta.3 |
| Client ID | auth-service |
| Consumer Group | auth-service-group |
| Topics Published | user.registered, user.logged_in, user.logged_out |
| Konfigurasi Khusus | LegacyPartitioner, allowAutoTopicCreation, retry dengan exponential backoff |
| Error Handling | Fire-and-forget dengan retry mechanism (3 attempts) |

**Fitur Implementasi:**
- Request timeout 5 menit untuk menghindari timeout issues
- Connection timeout 60 detik
- Session timeout 30 detik
- Heartbeat interval 3 detik
- Validasi koneksi dengan test message

---

#### Admin Service (Port 3002)

| Aspek | Detail |
|-------|--------|
| Role | Producer |
| Library | kafkajs@2.2.4 |
| Client ID | admin-service |
| Consumer Group | admin-service-group |
| Topics Published | admin.notifications, schedule-updates |
| Konfigurasi Khusus | Retry dengan delay configurable |
| Error Handling | Simple retry loop dengan MAX_RETRIES dan RETRY_DELAY |

**Fitur Implementasi:**
- publishAdminNotification helper untuk standardisasi format notifikasi
- Retry attempts hingga 5 kali
- Retry delay 3 detik (configurable via environment)

---

#### Booking Service (Port 3008)

| Aspek | Detail |
|-------|--------|
| Role | Producer |
| Library | kafkajs@2.2.4 |
| Client ID | booking-service |
| Consumer Group | booking-service-group |
| Topics Published | booking.created, booking.cancelled, booking.updated, availability-updates |
| Konfigurasi Khusus | Simple configuration |
| Error Handling | Retry loop dengan configurable parameters |

**Fitur Implementasi:**
- Standard producer/consumer pattern
- Events untuk lifecycle booking (created, cancelled)
- Availability updates untuk realtime slot availability

---

#### Course Service (Port 3003)

| Aspek | Detail |
|-------|--------|
| Role | Producer & Consumer |
| Library | kafkajs@2.2.4 |
| Client ID | course-service |
| Consumer Group | course-service-group |
| Topics Published | course.updated |
| Topics Consumed | booking.created (untuk sync course data) |
| Konfigurasi Khusus | subscribeToTopic helper dengan fromBeginning: false |
| Error Handling | Retry mechanism untuk producer |

**Fitur Implementasi:**
- Dual-role sebagai producer dan consumer
- subscribeToTopic dengan error handling per-message
- Consumer run dengan eachMessage pattern

---

#### Recommendation Service (Port 3005)

| Aspek | Detail |
|-------|--------|
| Role | Producer |
| Library | kafkajs@2.2.4 |
| Client ID | recommendation-service |
| Consumer Group | recommendation-service-group |
| Topics Published | assessment.submitted, assessment.processed, assessment.failed |
| Topics Consumed | (commented out: booking.created, course.updated) |
| Konfigurasi Khusus | startConsumer untuk batch subscription |
| Error Handling | Try-catch dengan logging |

**Fitur Implementasi:**
- Assessment lifecycle events
- Integration dengan queueWorker untuk async processing
- Subscription array pattern untuk multiple topic handling

---

#### Notification Service (Port 3009)

| Aspek | Detail |
|-------|--------|
| Role | Consumer |
| Library | kafkajs@2.2.4 |
| Client ID | auth-service (note: salah konfigurasi, seharusnya notification-service) |
| Consumer Group | notification-group |
| Topics Consumed | schedule-updates, availability-updates, admin.notifications |
| Konfigurasi Khusus | fromBeginning: true untuk schedule/availability updates |
| Error Handling | Fire-and-forget dengan logging |

**Fitur Implementasi:**
- WebSocket broadcast ke subscribed clients
- Multiple topic subscription
- Real-time notification delivery

---

#### API Gateway (Port 3000)

| Aspek | Detail |
|-------|--------|
| Role | Consumer (untuk WebSocket) |
| Library | kafkajs@2.2.4 |
| Client ID | api-gateway-websocket |
| Consumer Group | availability-websocket-group |
| Topics Consumed | booking.created, booking.cancelled, booking.confirmed, schedule.updated |
| Konfigurasi Khusus | Increased timeouts untuk stability |
| Error Handling | Graceful degradation jika Kafka unavailable |

**Fitur Implementasi:**
- AvailabilityWebSocketServer class
- Multiple WebSocket paths (/ws/availability, /ws)
- Admin notification routing
- Kafka status check endpoint

---

### 1.3 Kafka Topics yang Digunakan

| Topic | Producer | Consumer | Deskripsi |
|-------|----------|----------|-----------|
| user.registered | Auth Service | Admin Service | Event registrasi user baru |
| user.logged_in | Auth Service | - | Event user login |
| user.logged_out | Auth Service | - | Event user logout |
| booking.created | Booking Service | Notification, Course | Event booking baru dibuat |
| booking.cancelled | Booking Service | Notification | Event booking dibatalkan |
| booking.updated | Booking Service | Notification | Event booking diupdate |
| course.updated | Course Service | Notification | Event course diupdate |
| assessment.submitted | Recommendation | - | Event assessment baru |
| assessment.processed | Recommendation | - | Event assessment selesai diproses |
| assessment.failed | Recommendation | - | Event assessment gagal |
| schedule-updates | Admin Service | Notification | Update jadwal realtime |
| availability-updates | Booking Service | Notification | Update ketersediaan slot |
| admin.notifications | Various | Notification | Notifikasi admin dashboard |

### 1.4 Environment Variables Kafka Saat Ini

| Variable | Value | Service |
|----------|-------|---------|
| KAFKA_BROKER_URL | kafka:9092 | Semua service |
| KAFKA_BROKERS | kafka:9092 | API Gateway |
| KAFKA_CONNECTION_RETRY_DELAY | 5000 | Auth, Admin, Booking, Course, Recommendation, Notification |
| KAFKA_CONNECTION_MAX_RETRIES | 10 | Auth, Admin, Booking, Course, Recommendation, Notification |
| KAFKAJS_NO_PARTITIONER_WARNING | 1 | Auth Service |

---

## 2. Analisis Hipotetis: Jika Upstash Kafka Masih Tersedia

### 2.1 Apa Itu Upstash Kafka (Sebelum Dihentikan)

Upstash Kafka adalah layanan Kafka serverless yang menyediakan:
- REST API untuk produce/consume messages
- Kompatibel dengan protokol Kafka standar via kafkajs
- Serverless pricing (pay-per-request)
- Managed infrastructure tanpa perlu Zookeeper
- Global replication

### 2.2 Perubahan yang Diperlukan (Hipotetis)

#### 2.2.1 Perubahan Infrastructure (docker-compose.yml)

**Yang Dihapus:**
- Container Zookeeper beserta healthcheck dan environment variables
- Container Kafka beserta healthcheck dan environment variables
- Volume kafka-data
- Semua depends_on kafka untuk services

**Yang Ditambahkan:**
- Environment variables baru untuk Upstash credentials

#### 2.2.2 Perubahan Environment Variables

**Dihapus dari semua services:**
- KAFKA_BROKER_URL=kafka:9092

**Ditambahkan:**
- UPSTASH_KAFKA_REST_URL (REST endpoint)
- UPSTASH_KAFKA_REST_USERNAME
- UPSTASH_KAFKA_REST_PASSWORD
- UPSTASH_KAFKA_BROKER_URL (untuk kafkajs native)

#### 2.2.3 File yang Perlu Diubah

| File Path | Jenis Perubahan |
|-----------|-----------------|
| docker-compose.yml | Hapus Zookeeper & Kafka containers |
| auth/shared/utils/kafka.ts | Update broker URL configuration |
| admin/shared/utils/kafka.ts | Update broker URL configuration |
| booking/shared/utils/kafka.ts | Update broker URL configuration |
| course/shared/utils/kafka.ts | Update broker URL configuration |
| recommendation/shared/utils/kafka.ts | Update broker URL configuration |
| notification/shared/utils/kafka.ts | Update broker URL configuration |
| api-gateway/src/websocket/availabilityWebSocket.ts | Update Kafka client configuration |

#### 2.2.4 Perubahan Konfigurasi Kafka Client

Upstash Kafka memerlukan konfigurasi SASL/SSL:

| Konfigurasi | Self-Hosted | Upstash Kafka |
|-------------|-------------|---------------|
| SSL | Tidak (internal Docker) | Wajib (TLS) |
| Authentication | Tidak | SASL SCRAM-SHA-256 |
| Broker URL | kafka:9092 | xxxxx.upstash.io:9092 |
| Zookeeper | Diperlukan | Tidak diperlukan |

### 2.3 Dampak Perubahan (Hipotetis)

#### 2.3.1 Dampak Positif

1. **Pengurangan Kompleksitas Infrastructure**
   - Menghapus 2 containers (Zookeeper & Kafka)
   - Tidak perlu manage storage untuk Kafka logs
   - Startup time lebih cepat

2. **Operational Simplicity**
   - Managed service = tidak perlu patching/upgrade
   - Auto-scaling built-in
   - Monitoring dashboard dari Upstash

3. **Cost Optimization**
   - Pay-per-request untuk low-volume usage
   - Tidak ada idle cost jika tidak ada traffic

4. **Latency Global**
   - Multi-region replication tersedia
   - Edge-optimized untuk latency rendah

#### 2.3.2 Dampak Negatif

1. **Network Dependency**
   - Memerlukan koneksi internet untuk semua Kafka operations
   - Latency tambahan untuk inter-service communication
   - Tidak bisa jalan offline/local only

2. **Vendor Lock-in**
   - Tergantung pada availability Upstash
   - (TERBUKTI: Layanan sudah dihentikan!)

3. **Cost Unpredictability**
   - Pay-per-request bisa mahal untuk high-volume
   - Perlu monitoring usage untuk cost control

4. **SSL/SASL Complexity**
   - Semua client perlu konfigurasi SSL
   - Credential management tambahan

---

## 3. Alternatif yang Tersedia

Karena Upstash Kafka sudah tidak tersedia, berikut alternatif yang bisa dipertimbangkan:

### 3.1 Tetap dengan Self-Hosted Kafka (Current)

| Aspek | Nilai |
|-------|-------|
| Kompleksitas | Medium-High |
| Biaya | Rendah (hanya resource server) |
| Control | Penuh |
| Reliability | Tergantung infrastructure |
| Scalability | Manual scaling diperlukan |

**Cocok untuk:** Proyek dengan tim DevOps yang kompeten dan budget terbatas

### 3.2 Migrasi ke RabbitMQ

| Aspek | Nilai |
|-------|-------|
| Kompleksitas | Medium |
| Biaya | Rendah |
| Control | Penuh |
| Reliability | Tinggi |
| Scalability | Medium |

**Referensi:** Lihat dokumen Which_ONE.md untuk analisis lengkap

### 3.3 Upstash QStash (Alternatif Messaging Serverless)

| Aspek | Nilai |
|-------|-------|
| Kompleksitas | Rendah |
| Biaya | Pay-per-request |
| Control | Terbatas |
| Reliability | Tinggi (managed) |
| Scalability | Otomatis |

**Perbedaan dengan Kafka:**
- HTTP-based, bukan protokol Kafka
- Push model ke endpoint URL
- Built-in retry dan scheduling
- Perlu perubahan arsitektur signifikan

### 3.4 Confluent Cloud

| Aspek | Nilai |
|-------|-------|
| Kompleksitas | Rendah-Medium |
| Biaya | Moderate-High |
| Control | Medium |
| Reliability | Sangat Tinggi |
| Scalability | Otomatis |

**Keuntungan:**
- Fully managed Apache Kafka
- Kompatibel 100% dengan kafkajs
- Minimal code changes

### 3.5 AWS MSK (Managed Streaming for Kafka)

| Aspek | Nilai |
|-------|-------|
| Kompleksitas | Medium |
| Biaya | High |
| Control | Medium-High |
| Reliability | Sangat Tinggi |
| Scalability | Otomatis |

**Keuntungan:**
- Native AWS integration
- VPC support
- IAM authentication

### 3.6 Aiven for Apache Kafka

| Aspek | Nilai |
|-------|-------|
| Kompleksitas | Rendah |
| Biaya | Moderate |
| Control | Medium |
| Reliability | Tinggi |
| Scalability | Otomatis |

**Keuntungan:**
- Multi-cloud support
- Simple pricing
- Good documentation

---

## 4. Perbandingan Teknis

### 4.1 Perbandingan Fitur

| Fitur | Self-Hosted | Upstash Kafka* | Confluent | AWS MSK | RabbitMQ |
|-------|-------------|----------------|-----------|---------|----------|
| Managed | ❌ | ✅ | ✅ | ✅ | ❌ |
| Serverless | ❌ | ✅ | Partial | ❌ | ❌ |
| Protocol | Kafka | Kafka | Kafka | Kafka | AMQP |
| Code Changes | N/A | Minimal | Minimal | Minimal | Signifikan |
| Zookeeper | Diperlukan | Tidak | Tidak | Tidak | Tidak |
| Cost Model | Fixed | Pay-per-use | Subscription | Hourly | Fixed |

*Tidak tersedia lagi

### 4.2 Perbandingan untuk Proyek Shema Music

| Kriteria | Self-Hosted | Confluent | AWS MSK | RabbitMQ | QStash |
|----------|-------------|-----------|---------|----------|--------|
| Volume Message | ✅ | ✅ | ✅ | ✅ | ✅ |
| Budget | ✅✅ | ⚠️ | ⚠️ | ✅✅ | ✅ |
| Ease of Migration | N/A | ✅✅ | ✅ | ⚠️ | ❌ |
| Learning Curve | N/A | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Local Development | ✅✅ | ⚠️ | ❌ | ✅✅ | ⚠️ |

---

## 5. Rekomendasi Final

### 5.1 Untuk Proyek Shema Music Backend

Berdasarkan analisis komprehensif, **rekomendasi adalah tetap menggunakan Self-Hosted Kafka** dengan pertimbangan:

1. **Biaya Rendah**
   - Docker-based deployment sudah berjalan
   - Tidak ada biaya subscription tambahan

2. **Full Control**
   - Dapat dioptimasi sesuai kebutuhan
   - Tidak tergantung vendor eksternal

3. **Local Development Friendly**
   - Tim dapat develop dan test secara lokal
   - Tidak perlu koneksi internet untuk development

4. **Pattern Sudah Mature**
   - Implementasi saat ini sudah robust
   - Error handling dan retry mechanism sudah baik

### 5.2 Alternatif Jika Butuh Managed Service

Jika ada kebutuhan untuk managed service (production deployment, tim kecil, dll):

1. **Pilihan Pertama: Confluent Cloud**
   - Perubahan kode minimal
   - Documentation baik
   - Free tier tersedia

2. **Pilihan Kedua: Aiven**
   - Multi-cloud
   - Pricing transparan
   - Good support

3. **Pilihan Ketiga: RabbitMQ (Self-Hosted)**
   - Jika ingin simplifikasi
   - Resource lebih rendah
   - Lihat Which_ONE.md untuk detail

### 5.3 TIDAK DIREKOMENDASIKAN

- **Upstash Kafka** - Layanan sudah dihentikan
- **Upstash QStash** - Memerlukan redesign arsitektur signifikan
- **AWS MSK** - Overkill untuk skala proyek ini, biaya tinggi

---

## 6. Ringkasan

| Kriteria | Rekomendasi |
|----------|-------------|
| Message Broker | Self-Hosted Kafka (tetap) |
| Alternatif #1 | Confluent Cloud |
| Alternatif #2 | RabbitMQ |
| Upstash Kafka | ❌ Tidak tersedia lagi |

### Alasan Utama Tetap dengan Self-Hosted Kafka:

1. ✅ Sudah berjalan dengan baik
2. ✅ Biaya rendah
3. ✅ Full control
4. ✅ Local development friendly
5. ✅ Tidak ada vendor lock-in
6. ✅ Pattern dan implementasi sudah mature

### Lesson Learned dari Kasus Upstash Kafka:

- **Vendor lock-in adalah risiko nyata** - layanan bisa dihentikan kapan saja
- **Self-hosted memberikan kontrol penuh** atas lifecycle produk
- **Evaluasi vendor** harus mempertimbangkan track record dan sustainability

---

*Dokumen ini dibuat pada: 2 Desember 2025*
*Versi: 1.0*
*Referensi: Which_ONE.md, docker-compose.yml, implementasi kafka.ts di semua services*
