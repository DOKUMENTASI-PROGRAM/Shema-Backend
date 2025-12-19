# Analisis Perbandingan: Apache Kafka vs RabbitMQ untuk Shema Music Backend

## Pendahuluan

Dokumen ini menyajikan analisis komprehensif tentang penggunaan Apache Kafka saat ini dalam backend Shema Music, dampak jika dilakukan migrasi ke RabbitMQ, serta rekomendasi message broker yang paling cocok untuk proyek ini.

---

## 1. Kondisi Saat Ini: Penggunaan Kafka

### 1.1 Infrastructure Dependencies

Saat ini, proyek menggunakan dua container untuk message broker:

| Container | Image | Port | Fungsi |
|-----------|-------|------|--------|
| Zookeeper | confluentinc/cp-zookeeper:7.4.0 | 2181 | Koordinasi cluster Kafka |
| Kafka | confluentinc/cp-kafka:7.4.0 | 9092 | Message broker utama |

### 1.2 Services yang Menggunakan Kafka

**Total: 7 Services**

| Service | Port | Role | Library | Deskripsi Penggunaan |
|---------|------|------|---------|---------------------|
| Auth Service | 3001 | Producer | kafkajs@2.3.0-beta.3 | Publish user registration, login, logout events |
| Admin Service | 3002 | Producer | kafkajs@2.2.4 | Publish admin notification events |
| Booking Service | 3008 | Producer | kafkajs@2.2.4 | Publish booking created/cancelled/updated events |
| Course Service | 3003 | Producer & Consumer | kafkajs@2.2.4 | Publish course updates, consume booking events |
| Recommendation Service | 3005 | Producer | kafkajs@2.2.4 | Publish assessment events |
| Notification Service | 3009 | Consumer | kafkajs@2.2.4 | Consume semua events untuk WebSocket broadcast |
| API Gateway | 3000 | Status Check | kafkajs@2.2.4 | Monitor Kafka connection status |

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

### 1.4 Pola Penggunaan Kafka

**Karakteristik penggunaan saat ini:**

1. **Fire-and-forget pattern** - Semua publishEvent menggunakan try-catch dan tidak menggagalkan operasi utama jika Kafka gagal
2. **Simple pub/sub** - Tidak ada routing kompleks, topic-based subscription langsung
3. **No replay requirement** - Semua consumer menggunakan `fromBeginning: false`
4. **Event notification** - Fokus pada notifikasi realtime ke admin dan update availability
5. **Low to moderate throughput** - Volume message relatif rendah (hanya saat booking, login, dll)

---

## 2. Perubahan yang Diperlukan Jika Migrasi ke RabbitMQ

### 2.1 Perubahan Infrastructure (docker-compose.yml)

**Yang Dihapus:**
- Container Zookeeper beserta healthcheck dan environment variables
- Container Kafka beserta healthcheck dan environment variables
- Volume kafka-data

**Yang Ditambahkan:**
- Container RabbitMQ dengan management plugin
- Environment variables baru untuk RabbitMQ credentials

**Perubahan Dependencies:**
- Semua services yang depend on `kafka: condition: service_healthy` perlu diubah ke RabbitMQ

### 2.2 Perubahan Environment Variables

**Dihapus dari semua services:**
- KAFKA_BROKER_URL
- KAFKA_CONNECTION_RETRY_DELAY
- KAFKA_CONNECTION_MAX_RETRIES
- KAFKAJS_NO_PARTITIONER_WARNING

**Ditambahkan:**
- RABBITMQ_URL
- RABBITMQ_USER
- RABBITMQ_PASSWORD
- RABBITMQ_VHOST (opsional)
- RABBITMQ_EXCHANGE_NAME (opsional)

### 2.3 Perubahan Package Dependencies

**Untuk setiap service (7 package.json):**

| Service | Hapus | Tambah |
|---------|-------|--------|
| auth | kafkajs@2.3.0-beta.3 | amqplib@latest |
| admin | kafkajs@2.2.4 | amqplib@latest |
| booking | kafkajs@2.2.4 | amqplib@latest |
| course | kafkajs@2.2.4 | amqplib@latest |
| recommendation | kafkajs@2.2.4 | amqplib@latest |
| notification | kafkajs@2.2.4 | amqplib@latest |
| api-gateway | kafkajs@2.2.4 | amqplib@latest |

### 2.4 File yang Perlu Diubah/Ditulis Ulang

**Utility Files (6 files) - Perlu ditulis ulang sepenuhnya:**

| File Path | Perubahan |
|-----------|-----------|
| auth/shared/utils/kafka.ts → rabbitmq.ts | Ganti implementasi dengan amqplib |
| admin/shared/utils/kafka.ts → rabbitmq.ts | Ganti implementasi dengan amqplib |
| booking/shared/utils/kafka.ts → rabbitmq.ts | Ganti implementasi dengan amqplib |
| course/shared/utils/kafka.ts → rabbitmq.ts | Ganti implementasi dengan amqplib |
| recommendation/shared/utils/kafka.ts → rabbitmq.ts | Ganti implementasi dengan amqplib |
| notification/shared/utils/kafka.ts → rabbitmq.ts | Ganti implementasi dengan amqplib |

**Index Files (perlu update import):**
- auth/src/index.ts
- admin/src/index.ts
- booking/src/index.ts
- course/src/index.ts
- recommendation/src/index.ts
- notification/src/index.ts

**Controller Files (perlu update import):**
- auth/src/controllers/authController.ts
- booking/src/controllers/bookingController.ts
- course/src/controllers/courseController.ts
- recommendation/src/controllers/assessmentController.ts
- recommendation/src/utils/queueWorker.ts

### 2.5 Perubahan Konsep Arsitektur

| Aspek | Kafka | RabbitMQ |
|-------|-------|----------|
| Model | Log-based, pull | Queue-based, push |
| Topics → | Exchanges + Queues | |
| Consumer Groups → | Queue bindings | |
| Partitions → | Tidak relevan | |

**Mapping konseptual:**

| Kafka Concept | RabbitMQ Equivalent |
|---------------|---------------------|
| Topic | Exchange (topic/fanout) |
| Consumer Group | Queue dengan binding |
| Partition | Multiple queues (jika diperlukan) |
| Producer | Publisher |
| Consumer | Subscriber |

---

## 3. Dampak Perubahan dalam Backend

### 3.1 Dampak Positif

1. **Pengurangan Kompleksitas Infrastructure**
   - Menghapus Zookeeper (1 container berkurang)
   - RabbitMQ standalone tanpa koordinator eksternal

2. **Resource Usage Lebih Rendah**
   - Kafka + Zookeeper membutuhkan lebih banyak memory
   - RabbitMQ lebih ringan untuk volume message rendah

3. **Latency Lebih Baik**
   - RabbitMQ memiliki latency per-message lebih rendah
   - Cocok untuk pattern notifikasi realtime

4. **Management UI Bawaan**
   - RabbitMQ Management Plugin menyediakan dashboard
   - Monitoring dan debugging lebih mudah

5. **Startup Time Lebih Cepat**
   - RabbitMQ ready lebih cepat dari Kafka
   - Tidak perlu menunggu Zookeeper healthy terlebih dahulu

### 3.2 Dampak Netral

1. **API Pattern Tetap Sama**
   - publishEvent() tetap berfungsi sama
   - subscribeToTopic() tetap berfungsi sama
   - Perubahan hanya di implementasi internal

2. **Error Handling Pattern Tetap**
   - Try-catch pattern untuk fire-and-forget tetap valid

### 3.3 Dampak Negatif/Pertimbangan

1. **Hilangnya Message Retention**
   - Kafka menyimpan message dalam log
   - RabbitMQ menghapus message setelah di-consume
   - Tidak ada kemampuan replay events

2. **Perubahan Consumer Model**
   - Kafka: Pull model dengan consumer control
   - RabbitMQ: Push model dengan broker control
   - Perlu adjustment pada batching strategy

3. **Learning Curve**
   - Tim perlu memahami konsep Exchange, Queue, Binding
   - Berbeda dengan topic-based Kafka

4. **Scaling Consideration**
   - Jika volume message meningkat signifikan, RabbitMQ perlu clustering
   - Kafka lebih mudah di-scale horizontal

---

## 4. Perbandingan Teknis

### 4.1 Performance

| Metrik | Kafka | RabbitMQ | Konteks Proyek Ini |
|--------|-------|----------|-------------------|
| Throughput | Sangat tinggi (100K+ msg/s) | Tinggi (40K+ msg/s) | Rendah (< 100 msg/s) |
| Latency | Medium (beberapa ms) | Rendah (sub-ms) | RabbitMQ lebih baik |
| Memory Usage | Tinggi | Medium | RabbitMQ lebih efisien |
| Disk Usage | Tinggi (message retention) | Rendah | RabbitMQ lebih efisien |

### 4.2 Features

| Feature | Kafka | RabbitMQ | Kebutuhan Proyek |
|---------|-------|----------|------------------|
| Message Replay | Ya | Tidak | Tidak diperlukan |
| Ordering Guarantee | Per partition | Per queue | Tidak kritis |
| Complex Routing | Limited | Sangat fleksibel | Sederhana |
| Dead Letter Queue | Manual | Built-in | Berguna |
| Priority Queue | Tidak | Ya | Berguna untuk notifikasi |
| Message TTL | Ya | Ya | Sama |

### 4.3 Operational

| Aspek | Kafka | RabbitMQ |
|-------|-------|----------|
| Setup Complexity | Tinggi (Zookeeper) | Rendah |
| Monitoring | Perlu tools tambahan | Built-in management |
| Clustering | Complex | Simpler |
| Learning Curve | Steeper | Gentler |

---

## 5. Rekomendasi

### 5.1 Kesimpulan Analisis

Berdasarkan analisis mendalam terhadap penggunaan Kafka dalam proyek Shema Music Backend, ditemukan bahwa:

1. **Volume message rendah** - Hanya events saat booking, login, dan update jadwal
2. **Tidak ada kebutuhan replay** - Semua consumer menggunakan `fromBeginning: false`
3. **Pattern sederhana** - Hanya pub/sub notification tanpa complex stream processing
4. **Fire-and-forget** - Kafka failure tidak menggagalkan operasi utama
5. **Real-time notification focus** - Kebutuhan utama adalah push notification ke admin

### 5.2 Rekomendasi Final: RabbitMQ

**RabbitMQ lebih cocok untuk proyek Shema Music Backend** dengan alasan:

1. **Appropriate Complexity**
   - Pattern penggunaan saat ini terlalu sederhana untuk fitur Kafka yang powerful
   - RabbitMQ memberikan fitur yang cukup dengan kompleksitas lebih rendah

2. **Resource Efficiency**
   - Menghapus Zookeeper menghemat 1 container
   - Memory dan CPU usage lebih rendah
   - Cocok untuk deployment dengan resource terbatas

3. **Better Latency for This Use Case**
   - Notifikasi realtime mendapat manfaat dari latency rendah RabbitMQ
   - Push model cocok untuk WebSocket broadcast

4. **Operational Simplicity**
   - Tidak perlu mengelola Zookeeper
   - Management dashboard built-in
   - Debugging lebih mudah

5. **Faster Development Cycle**
   - Startup time lebih cepat saat development
   - Tidak perlu menunggu Kafka cluster ready

### 5.3 Kapan Tetap Menggunakan Kafka?

Pertimbangkan tetap menggunakan Kafka jika:

1. Ada rencana scaling besar (ribuan siswa concurrent)
2. Membutuhkan event sourcing atau audit trail
3. Perlu replay events untuk debugging atau recovery
4. Ada kebutuhan stream processing kompleks di masa depan
5. Tim sudah familiar dengan Kafka ecosystem

### 5.4 Migration Effort Estimation

| Aspek | Estimasi |
|-------|----------|
| Docker infrastructure changes | 2-3 jam |
| Utility files rewrite (6 files) | 4-6 jam |
| Import updates di services | 2-3 jam |
| Testing dan debugging | 4-6 jam |
| Documentation update | 2-3 jam |
| **Total** | **14-21 jam kerja** |

---

## 6. Ringkasan

| Aspek | Kafka | RabbitMQ | Winner untuk Proyek Ini |
|-------|-------|----------|------------------------|
| Kompleksitas Setup | Tinggi | Rendah | ✅ RabbitMQ |
| Resource Usage | Tinggi | Medium | ✅ RabbitMQ |
| Latency | Medium | Rendah | ✅ RabbitMQ |
| Throughput | Sangat Tinggi | Tinggi | ⚪ Draw (volume rendah) |
| Message Replay | Ya | Tidak | ⚪ Draw (tidak dibutuhkan) |
| Operational | Complex | Simple | ✅ RabbitMQ |
| Scalability | Excellent | Good | ⚪ Draw (skala kecil) |
| Management UI | Perlu tambahan | Built-in | ✅ RabbitMQ |

**Keputusan Akhir: RabbitMQ adalah pilihan yang lebih tepat untuk Shema Music Backend pada tahap saat ini.**

---

*Dokumen ini dibuat pada: 2 Desember 2025*
*Versi: 1.0*
