# PROJECT AUDIT & TODO LIST

**Date:** 2025-12-20
**Status:** Audit Result

## 1. High Priority (Critical Fixes)

Hal-hal yang menyebabkan crash, error logika fatal, atau sisa migrasi yang berbahaya.

- **[Migration/Services] Konfirmasi Penggunaan Library Hashing Password**

  - _Deskripsi:_ Ditemukan dependensi library hashing password (`bcryptjs`) di `auth-service`, `admin-service`, dan `course-service`. Karena sistem sudah bermigrasi penuh ke Supabase Auth (yang menangani keamanan password secara internal), penggunaan hashing manual di level aplikasi berpotensi redundan atau mengindikasikan adanya pencampuran logika autentikasi legacy.
  - _Tindakan:_ Audit penggunaan fungsi hashing di `utils/password.ts`. Jika hanya sisa legacy dan tidak digunakan untuk fitur khusus (misal: enkripsi data non-password), hapus library dan kode terkait untuk mengurangi bloat dan risiko keamanan.

- **[Migration/Kafka] Hapus Sisa-sisa Kode Mock & Logging Kafka**
  - _Deskripsi:_ Meskipun Docker Compose sudah menggunakan RabbitMQ, masih ditemukan:
    1. Mocking modul Kafka pada unit test `recommendation-service`.
    2. Log "Kafka consumer started" yang menyesatkan pada entry point `recommendation-service`.
    3. Pengecekan status Kafka pada test `api-gateway`.
  - _Tindakan:_ Bersihkan semua referensi kode, mocking, dan logging yang menyebutkan "Kafka" untuk mencegah kebingungan developer (developer confusion) saat debugging sistem messaging RabbitMQ yang baru.

## 2. Medium Priority (Cleanup & Optimization)

Dead code, refactoring, dan penyelesaian fitur.

- **[Cleanup] File Backup & Sampah**

  - _Deskripsi:_ Ditemukan file `.bak` dan `.backup` di dalam folder source code `api-gateway` (`src/index.ts.bak`, `src/index.ts.backup`).
  - _Tindakan:_ Hapus file-file backup ini secepatnya agar tidak ter-commit ke repository atau membingungkan IDE saat navigasi kode.

- **[Booking Service] Implementasi Data Instruktor Real**

  - _Deskripsi:_ Endpoint untuk mendapatkan daftar instruktor (`getAvailableInstructors`) masih menggunakan data hardcode/mock untuk field `experience_years`, `rating`, dan `available_slots`.
  - _Tindakan:_ Ganti nilai placeholder dengan query database aktual atau logika penghitungan yang sesuai dari tabel terkait.

- **[Scripting] Update Log Skenario Testing**

  - _Deskripsi:_ Script testing otomatis (`scripts/`) masih mencetak log yang menyebutkan "Event Kafka" saat menjalankan skenario booking, padahal event yang dikirim adalah RabbitMQ.
  - _Tindakan:_ Update string logging pada script testing untuk mencerminkan arsitektur aktual.

- **[Auth Service] Review Mekanisme Fallback Registrasi**
  - _Deskripsi:_ Logika registrasi user memiliki fallback manual: "Jika trigger Supabase gagal, buat user profile manual via API". Komentar kode menyebutkan `// Auto-confirm for now`.
  - _Tindakan:_ Tinjau ulang apakah auto-confirm user masih diinginkan untuk production. Pastikan mekanisme fallback ini termonitor dengan baik agar tidak menutupi error pada Database Trigger.

## 3. Low Priority (Documentation & Minor Tweaks)

Komentar, typo, penamaan.

- **[Documentation] Hapus Referensi Arsitektur Lama**

  - _Deskripsi:_ Dokumen `README.md`, halaman landing page publik (`public/index.html`), dan dokumentasi internal flow data masih secara eksplisit menyebutkan penggunaan "Kafka" dan "Zookeeper".
  - _Tindakan:_ Update seluruh dokumentasi teks untuk mengganti istilah Kafka dengan RabbitMQ dan WebSocket (Legacy) dengan Supabase Realtime.

- **[Code Hygiene] Konsistensi Logging**
  - _Deskripsi:_ Penggunaan `console.log` tersebar luas untuk debugging info (misal: "📝 Register course endpoint called").
  - _Tindakan:_ Pertimbangkan migrasi ke library logging terstandar (seperti Winston atau Pino) untuk manajemen log level yang lebih baik di production.
