# Ide Perubahan Sistem Jadwal: Dynamic Room Locking

Dokumen ini menjelaskan analisis dan langkah implementasi untuk mengubah sistem penjadwalan dari model _Static Template_ menjadi _Dynamic Room Locking_.

## 1. Konsep Dasar

**Sistem Saat Ini (Static):**

- Satu Instruktur hanya boleh punya Satu Jadwal di Satu Waktu.
- Validasi dilakukan saat **Admin membuat jadwal**.
- Jika Instruktur X mengajar jam 10:00 di Room A, Admin **tidak bisa** membuat jadwal untuk Instruktur X jam 10:00 di Room B.

**Sistem Usulan (Dynamic):**

- Satu Instruktur boleh punya **Banyak Opsi Ruangan** di waktu yang sama.
- Validasi dilakukan saat **Siswa melakukan Booking**.
- Admin bisa membuat jadwal Instruktur X jam 10:00 di Room A, Room B, dan Room C.
- Saat siswa mem-booking Room A, maka Room B dan Room C otomatis terkunci (unavailable) untuk Instruktur X di jam tersebut.

---

## 2. Analisis Dampak

Perubahan ini cukup signifikan karena mengubah logika fundamental "Satu Jadwal = Satu Slot Pasti" menjadi "Satu Jadwal = Satu Opsi Potensial".

### A. Database (PostgreSQL/Supabase)

- **Unique Constraints:** Harus dihapus atau diubah. Constraint unik pada `(instructor_id, day_of_week, start_time_of_day, end_time_of_day)` yang mencegah duplikasi jam instruktur harus dihilangkan.
- **New Indexing:** Perlu index performa tinggi untuk query agregasi instuktur.

### B. Backend: Admin Service (`createSchedule`)

- **Logic Change:** Hapus pengecekan "Instructor Conflict".
- **New Validation:** Pastikan _Room Conflict_ tetap ada (Satu ruangan tidak boleh dipakai dua instruktur berbeda di jam dan hari yang sama).

### C. Backend: Booking Service (`findAvailableSlots`)

- **Logic Change Besar:**
  - _Sebelumnya:_ Cek slot kosong hanya melihat `count(enrollments)` pada `schedule_id` tersebut.
  - _Ubah Menjadi:_ Cek slot kosong harus melihat apakah Instruktur tersebut sudah ada _active enrollment_ di **schedule manapun** pada jam yang sama.
  - _Query:_ "Apakah Instruktur X di Hari H Jam J sudah punya murid di Room A, B, atau C?" Jika YA -> Maka SEMUA Room A, B, C statusnya `OCCUPIED`.

### D. Backend: Booking Service (`registerCourse`)

- **Critical Risk Shift:** Race Condition tidak lagi menjadi fatal error, melainkan **Operational Choice**.

* **Skenario:** Siswa 1 booking Room A (Pending), Siswa 2 booking Room B (Pending) secara bersamaan (miliseconds difference).
* **Solusi:** Sistem **mengizinkan** kedua booking tersebut masuk sebagai `PENDING`.
* **Final Decision:** Admin akan melihat bentrok tersebut saat konfirmasi. Jika Admin confirm Siswa 1, sistem harus memberi warning atau auto-reject Siswa 2.
* **Implikasi:** Fitur ini membutuhkan Admin Dashboard yang pintar mendeteksi "Multiple Pending Bookings for Same Instructor".

---

## 3. Langkah Implementasi Detil

Berikut adalah _step-by-step_ teknis untuk mewujudkan ide tersebut:

### Langkah 1: Modifikasi Database

Hapus validasi unik yang membatasi instruktur.

```sql
-- Contoh (Logic only)
DROP INDEX IF EXISTS idx_unique_instructor_schedule;
-- Tapi pastikan Room tetap unik
CREATE UNIQUE INDEX idx_unique_room_schedule ON class_schedules(room_id, day_of_week, start_time_of_day);
```

### Langkah 2: Update `findAvailableSlots` (Booking Controller)

Ubah query SQL/Supabase untuk mengecek ketersediaan "Global Instruktur", bukan per ID Jadwal saja.

**Algoritma Baru:**

1.  Ambil list jadwal yang sesuai filter (Day, Instructor).
2.  Ambil list **semua booking aktif** untuk instruktur tersebut di hari tersebut (tanpa melihat room).
3.  Mapping status:
    - Loop setiap Jadwal (Room A, B, C).
    - Cek apakah ada booking aktif di jam overlapping untuk instruktur ini.
    - Jika ada -> Set status `OCCUPIED` / `UNAVAILABLE` (walaupun room ini kosong, tapi instrukturnya sibuk di sebelah).
    - Jika tidak ada -> Set status `AVAILABLE`.

### Langkah 3: Update `registerCourse` (Booking Controller)

Tambahkan validasi "Cross-Schedule Check" sebelum insert.

### Langkah 4: Update `confirmBooking` (Admin Controller)

Ini menjadi **Safety Net** terakhir.

1.  Saat Admin klik "Confirm" untuk Booking A.
2.  Sistem cek: "Apakah Instruktur ini punya booking Pending lain di jam yang sama (misal Booking B)?"
3.  Jika Ada -> Sistem harus me-reject Booking B atau memberi opsi ke Admin untuk me-reject-nya.

---

## 4. Kelebihan & Kekurangan

|                     | Kelebihan                                                                   | Kekurangan                                                                                                     |
| :------------------ | :-------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| **Fleksibilitas**   | Tinggi. Admin bisa siapkan opsi Ruang A/B/C, tergantung user mau yang mana. | Kompleksitas kode naik drastis.                                                                                |
| **User Experience** | User punya lebih banyak pilihan.                                            | User mungkin kecewa jika booking Pending-nya ditolak Admin karena "kalah cepat" dgn user lain di room berbeda. |
| **Admin Effort**    | Admin manual resolve jika ada bentrok pending.                              | Butuh ketelitian Admin saat confirm.                                                                           |

## 5. Kesimpulan

Ide ini **SANGAT MEMUNGKINKAN** dan sesuai dengan workflow. Dengan memindahkan tanggung jawab resolusi konflik ke Admin (Manual Approval), kompleksitas teknis "Locking" bisa dikurangi, namun fitur "Admin Confirmation" harus diperkuat untuk mencegah human error (meng-approve 2 orang di jam sama).
