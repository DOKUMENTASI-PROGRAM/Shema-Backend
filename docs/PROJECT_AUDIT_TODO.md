# PROJECT AUDIT & TODO LIST

**Date:** 2025-12-19
**Status:** Audit Result (Significant Findings)

## 1. High Priority (Critical Fixes)

Hal-hal yang menyebabkan crash, error logika fatal, atau sisa migrasi yang berbahaya.

- **[Notification Service] Fungsionalitas Stub/Kosong**

  - _Deskripsi:_ Service notification saat ini hanya berupa "stub" yang menerima event dari RabbitMQ dan menunggu 500ms, tanpa melakukan pengiriman notifikasi (Email/WA) yang sebenarnya. Terdapat komentar "TODO: Implement actual notification logic".
  - _Tindakan:_ Implementasikan integrasi provider email (misal: SendGrid/Nodemailer) dan WhatsApp (misal: Twilio/WAbot) pada fungsi pengiriman notifikasi, menggantikan logika dummy yang ada sekarang.

- **[Auth Service] Missing Event Publishing**

  - _Deskripsi:_ Berdasarkan dokumentasi arsitektur, Auth Service seharusnya mem-publish event saat user melakukan registrasi/login. Saat ini, controller hanya menyimpan data ke database (Supabase) tanpa mengirim event ke Message Broker (RabbitMQ). Ini berpotensi memutus rantai komunikasi antar-service yang membutuhkan data user baru.
  - _Tindakan:_ Tambahkan logika publishing event (misal: `user.registered`, `user.logged_in`) ke RabbitMQ setelah operasi database berhasil pada `register` dan `login` controller.

- **[Refactoring] Pelanggaran Batas Controller-Service pada Booking**

  - _Deskripsi:_ Logika bisnis kompleks (validasi, idempotency check, database transaction, event publishing) bercampur aduk di dalam file controller. Tidak ada layer "Service" yang terpisah secara jelas untuk meng-handle logika ini.
  - _Tindakan:_ Ekstrak logika bisnis dari controller ke dalam file service khusus. Controller harusnya hanya bertugas menerima request, memanggil service, dan mengembalikan response.

- **[Migration Integrity] Dependensi WebSocket Tak Terpakai**

  - _Deskripsi:_ API Gateway telah beralih ke Supabase Realtime, namun dependensi library WebSocket (`ws`, `socket.io` atau sejenisnya) masih terdaftar di `package.json` pada `api-gateway` dan `notification` service.
  - _Tindakan:_ Uninstall/hapus dependensi library WebSocket yang tidak lagi digunakan dan pastikan tidak ada kode inisialisasi WebSocket server yang masih berjalan secara tersembunyi.

- **[Recommendation Service] Autentikasi Admin Belum Terimplementasi**
  - _Deskripsi:_ Ditemukan komentar "TODO: Implement admin authentication" pada middleware. Ini adalah celah keamanan potensial jika endpoint admin terekspos tanpa perlindungan.
  - _Tindakan:_ Implementasikan middleware autentikasi yang memvalidasi token/session admin dengan benar, terintegrasi dengan Auth Service.

## 2. Medium Priority (Cleanup & Optimization)

Dead code, refactoring, dan penyelesaian fitur.

- **[Code Hygiene] Penghapusan Dead Code "Booking Controller Clean"**

  - _Deskripsi:_ Terdapat file duplikat dengan suffix `_clean.ts` pada folder controller Booking yang tampaknya merupakan versi simplified/mock untuk testing namun terbawa ke source code utama.
  - _Tindakan:_ Hapus file tersebut dan pastikan kode testing menggunakan mekanisme mocking yang benar (misal: Jest mocks) daripada membuat file source code dummy.

- **[Code Hygiene] Konsistensi Error Handling**

  - _Deskripsi:_ Pola penanganan error (try-catch) sudah ada, namun format response error belum sepenuhnya seragam di semua service (misal: struktur JSON error detail).
  - _Tindakan:_ Refactor blok catch untuk menggunakan utility/helper function response error yang standar, memastikan field seperti `code`, `message`, dan `details` selalu konsisten.

- **[Completeness] Implementasi Instruktur-Course Mapping**
  - _Deskripsi:_ Ditemukan TODO pada `availabilityService.ts` mengenai pemetaan instruktur ke course yang belum tersedia.
  - _Tindakan:_ Lengkapi logika availability untuk memperhitungkan data instruktur yang spesifik untuk course tertentu ketika fitur tersebut sudah siap di database.

## 3. Low Priority (Documentation & Minor Tweaks)

Komentar, typo, penamaan.

- **[Cleanup] Hapus Komentar Sisa Migrasi Kafka**

  - _Deskripsi:_ Masih ditemukan baris kode yang dikomentari (commented-out code) terkait "Kafka Consumer Started" pada beberapa file entry point, padahal sistem sudah menggunakan RabbitMQ.
  - _Tindakan:_ Hapus baris-baris komentar sampah sisa migrasi tersebut agar kode lebih bersih.

- **[Documentation] Update Deskripsi Package.json**
  - _Deskripsi:_ Deskripsi project pada `package.json` di Notification Service masih menyebutkan "WebSocket communication", yang tidak lagi akurat jika sepenuhnya beralih ke Supabase Realtime/Push Notification.
  - _Tindakan:_ Perbarui deskripsi pada `package.json` agar mencerminkan peran service yang sebenarnya (misal: "Notification Worker for Email/WA").
