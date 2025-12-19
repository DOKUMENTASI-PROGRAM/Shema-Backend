# Penjelasan Flow Data & Registration Course

## Ringkasan Eksekutif

Dokumen ini menjelaskan flow data ketika calon murid mendaftar melalui endpoint `/booking/register-course`, bagaimana backend memproses pilihan jadwal (first choice dan second choice), serta hubungannya dengan sistem realtime jadwal via WebSocket.

---

## 1. Flow Pendaftaran Course (Registration)

### 1.1 Endpoint yang Digunakan

**POST /api/booking/register-course**

Endpoint ini bersifat **public** (tidak memerlukan autentikasi) karena digunakan oleh calon murid yang belum memiliki akun.

### 1.2 Request Body

```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "course_id": "uuid-course",
  "address": "Jl. Contoh No. 123",
  "birth_place": "Jakarta",
  "birth_date": "2010-05-15",
  "school": "SD Contoh",
  "class": 5,
  "guardian_name": "Jane Doe",
  "guardian_wa_number": "+6281234567890",
  "consent": true,
  "captcha_token": "token-captcha",
  "idempotency_key": "uuid-unique-key",
  
  "experience_level": "beginner",
  "preferred_days": ["monday", "wednesday"],
  "preferred_time_range": {
    "start": "14:00",
    "end": "16:00"
  },
  
  "first_choice_slot_id": "uuid-slot-pilihan-1",
  "second_choice_slot_id": "uuid-slot-pilihan-2",
  "payment_proof": "https://supabase-storage-url/payment-proofs/uuid-image.jpg"
}
```

### 1.3 Apa yang Terjadi di Backend Saat Submit?

#### A. Validasi Data

Backend melakukan validasi menggunakan Zod schema:
- Format email yang valid
- Nomor WA harus dimulai dengan +62
- consent harus true
- course_id harus UUID yang valid dan course harus ada di database

#### B. Pengecekan Duplikasi

1. **Idempotency Key Check (Redis):**
   - Backend memeriksa apakah idempotency_key sudah pernah digunakan dalam 24 jam terakhir
   - Jika sudah ada → reject dengan error `DUPLICATE_REQUEST`

2. **Existing Booking Check (Database):**
   - Backend memeriksa apakah email yang sama sudah punya booking pending untuk course yang sama
   - Jika sudah ada → reject dengan error `PENDING_BOOKING_EXISTS`

#### C. Penyimpanan ke Database

**⚠️ PENTING: Backend TIDAK memeriksa apakah pilihan jadwal (first_choice_slot_id dan second_choice_slot_id) tersedia atau tidak saat registrasi!**

Backend langsung menyimpan data ke tabel `bookings` dengan:
- `status`: **'pending'**
- `first_choice_slot_id`: UUID slot pilihan pertama (atau null)
- `second_choice_slot_id`: UUID slot pilihan kedua (atau null)
- `confirmed_slot_id`: **null** (belum dikonfirmasi)
- `expires_at`: 3 hari dari sekarang

#### D. Event Kafka

Setelah booking berhasil disimpan, backend mengirim event ke Kafka:

```json
{
  "topic": "booking.created",
  "message": {
    "bookingId": "uuid-booking",
    "userId": null,
    "courseId": "uuid-course",
    "status": "pending",
    "timestamp": "2025-12-02T10:00:00Z"
  }
}
```

### 1.4 Response Success

```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "uuid-booking-baru",
      "status": "pending",
      "first_choice_slot_id": "uuid-slot-1",
      "second_choice_slot_id": "uuid-slot-2",
      "confirmed_slot_id": null,
      "expires_at": "2025-12-05T10:00:00Z"
    }
  },
  "meta": {
    "timestamp": "2025-12-02T10:00:00Z"
  }
}
```

---

## 2. Mengapa Pilihan Jadwal TIDAK Diperiksa Saat Registrasi?

### 2.1 Konsep "Request" vs "Booking"

Sistem ini menerapkan konsep **preference request**, bukan langsung booking:

| Aspek | Penjelasan |
|-------|------------|
| **Tujuan** | Siswa hanya menyatakan preferensi jadwal, bukan langsung memblokir slot |
| **Status** | Booking masih 'pending' dan membutuhkan konfirmasi admin |
| **Fleksibilitas** | Admin dapat menyesuaikan jadwal berdasarkan ketersediaan aktual |
| **Keputusan Final** | Admin yang memutuskan slot mana yang dikonfirmasi |

### 2.2 Keuntungan Pendekatan Ini

1. **Mengurangi race condition:** Beberapa siswa bisa request slot yang sama, admin yang menentukan siapa yang dapat
2. **Fleksibilitas scheduling:** Admin bisa mengarahkan siswa ke slot alternatif jika pilihan utama tidak tersedia
3. **Proses verifikasi:** Admin bisa memverifikasi data siswa sebelum mengkonfirmasi jadwal

---

## 3. Flow Konfirmasi oleh Admin

### 3.1 Diagram Flow

```
[Siswa Submit] → [Backend Save Pending] → [Admin Review] → [Admin Confirm] → [Admin Assign Slot]
                                                ↓
                                        [Bisa Reject/Cancel]
```

### 3.2 Step 1: Admin Melihat Pending Bookings

**GET /api/booking/admin/bookings/pending**

Admin melihat daftar booking yang menunggu konfirmasi, termasuk pilihan jadwal siswa.

### 3.3 Step 2: Admin Konfirmasi Booking

**POST /api/booking/:id/confirm**

Admin mengkonfirmasi booking dengan mengubah status dari `pending` menjadi `confirmed`.

**⚠️ Pada step ini, confirmed_slot_id masih null!**

### 3.4 Step 3: Admin Assign Slot

**POST /api/booking/admin/bookings/:id/assign-slot**

```json
{
  "schedule_id": "uuid-schedule-yang-dipilih-admin"
}
```

**Apa yang terjadi:**
- Admin memilih SATU slot (bisa first_choice atau second_choice, atau bahkan slot lain)
- Backend set `confirmed_slot_id` = schedule_id yang dipilih admin
- **Hanya SATU slot yang dikonfirmasi, bukan dua-duanya**

### 3.5 Constraint Database

Tabel `bookings` memiliki constraint:

```sql
CONSTRAINT chk_confirmed_slot CHECK (
  (confirmed_slot_id IS NULL) OR
  (confirmed_slot_id = first_choice_slot_id OR confirmed_slot_id = second_choice_slot_id)
)
```

Artinya: `confirmed_slot_id` **harus** salah satu dari first_choice atau second_choice (jika diisi).

---

## 4. Pencegahan Konflik Jadwal (Conflict Prevention)

### 4.1 Kapan Conflict Checking Terjadi?

| Tahap | Conflict Check? | Penjelasan |
|-------|-----------------|------------|
| Registrasi siswa | ❌ TIDAK | Siswa hanya request, bukan booking |
| Admin review | ❌ TIDAK | Admin hanya melihat |
| Admin assign slot | ✅ YA | Conflict check dilakukan |

### 4.2 Mekanisme Conflict Prevention

#### A. Database Level - Stored Procedure

Database memiliki function `check_schedule_conflicts`:

```sql
SELECT * FROM check_schedule_conflicts(
  p_instructor_id,
  p_room_id,
  p_start_time,
  p_end_time,
  p_exclude_booking_id
);
```

Function ini memeriksa:
- Apakah instruktur sudah dijadwalkan pada waktu tersebut
- Apakah ruangan sudah digunakan pada waktu tersebut

#### B. Application Level - findAvailableSlots

Endpoint `GET /api/booking/availability/find-slots` melakukan:
1. Query slot dengan `booking_id IS NULL` (belum dibooking)
2. Loop setiap slot dan cek konflik dengan booking yang sudah confirmed
3. Hanya kembalikan slot yang benar-benar tersedia

```typescript
// Conflict check untuk setiap schedule
const { data: conflicts } = await supabase
  .from('class_schedules')
  .select('id')
  .not('booking_id', 'is', null)
  .eq('bookings.status', 'confirmed')
  .or(`instructor_id.eq.${schedule.instructor_id},room_id.eq.${schedule.room_id}`)
  .lt('start_time', schedule.end_time)
  .gt('end_time', schedule.start_time)
  .limit(1)

if (conflicts.length === 0) {
  availableSchedules.push(schedule)
}
```

---

## 5. Hubungan dengan WebSocket Realtime

### 5.1 Bagaimana WebSocket Bekerja?

```
[Booking Service] → Kafka Event → [Notification Service] → WebSocket → [Frontend]
```

### 5.2 Event yang Di-broadcast

| Event | Kapan | Payload |
|-------|-------|---------|
| `booking.created` | Setelah siswa submit registrasi | bookingId, courseId, status |
| `booking.cancelled` | Setelah booking dibatalkan | bookingId, cancelledBy |
| `booking.confirmed` | Setelah admin konfirmasi | bookingId, confirmedAt |
| `schedule.updated` | Setelah jadwal diupdate | affected instructor/room |

### 5.3 Subscriber di Frontend

Frontend yang subscribe ke topic `availability` akan menerima update real-time:

```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  topic: 'availability'
}));

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'broadcast' && message.topic === 'availability') {
    // Update UI dengan data terbaru
    refreshAvailability();
  }
};
```

### 5.4 Apakah WebSocket Mencegah Konflik?

**⚠️ TIDAK!** WebSocket bersifat **informatif**, bukan **preventif**.

| Aspek | Penjelasan |
|-------|------------|
| **Fungsi WebSocket** | Memberitahu frontend bahwa ada perubahan availability |
| **Yang melakukan** | Frontend refresh data dari API |
| **Pencegahan konflik** | Tetap dilakukan di backend saat admin assign slot |

### 5.5 Kenapa Tetap Bisa Ada "Konflik" di Frontend?

Meskipun ada WebSocket realtime, kemungkinan konflik tetap ada karena:

1. **Race condition:** Dua siswa bisa submit request ke slot yang sama dalam waktu bersamaan
2. **Network latency:** WebSocket update bisa terlambat beberapa detik
3. **Desain sistem:** Siswa hanya request, bukan langsung booking

**Solusi di Sistem Ini:**
- Conflict resolution dilakukan oleh admin, bukan otomatis
- Admin yang memutuskan siapa yang mendapat slot jika ada konflik request

---

## 6. Database Schema Terkait

### 6.1 Tabel bookings

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  user_id UUID,
  course_id UUID NOT NULL,
  
  -- 2-slot selection system
  first_choice_slot_id UUID,
  second_choice_slot_id UUID,
  confirmed_slot_id UUID,
  
  -- Status lifecycle
  status booking_status DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL,
  confirmed_at TIMESTAMP,
  
  -- Constraint: confirmed harus salah satu dari pilihan
  CONSTRAINT chk_confirmed_slot CHECK (
    confirmed_slot_id IS NULL OR
    confirmed_slot_id IN (first_choice_slot_id, second_choice_slot_id)
  )
);
```

### 6.2 Tabel class_schedules

```sql
CREATE TABLE class_schedules (
  id UUID PRIMARY KEY,
  course_id UUID NOT NULL,
  instructor_id UUID NOT NULL,
  room_id UUID NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  booking_id UUID,  -- NULL jika belum dibooking
  
  CONSTRAINT chk_start_before_end CHECK (start_time < end_time)
);
```

### 6.3 Relationship

```
bookings.first_choice_slot_id   → class_schedules.id
bookings.second_choice_slot_id  → class_schedules.id
bookings.confirmed_slot_id      → class_schedules.id
class_schedules.booking_id      → bookings.id (ketika sudah di-assign)
```

---

## 7. Kesimpulan

### 7.1 Jawaban untuk Pertanyaan Utama

| Pertanyaan | Jawaban |
|------------|---------|
| **Apakah backend memeriksa pilihan jadwal saat registrasi?** | ❌ TIDAK. Backend hanya menyimpan preferensi, tidak memvalidasi ketersediaan slot. |
| **Yang dikonfirmasi itu pilihan satu atau dua?** | **SATU** saja. Admin memilih salah satu (first_choice atau second_choice) untuk dikonfirmasi. |
| **Bagaimana hubungan dengan WebSocket?** | WebSocket memberikan update realtime tentang perubahan availability, tapi TIDAK mencegah konflik secara langsung. |
| **Apakah tidak akan ada konflik karena realtime?** | Masih bisa ada konflik request. Pencegahan konflik final dilakukan saat admin assign slot, bukan saat registrasi. |

### 7.2 Flow Ringkas

```
1. Siswa → Submit Form → Backend save pending → Event Kafka → WebSocket broadcast
2. Admin → Review pending → Confirm booking → Assign slot (conflict check)
3. Hanya 1 slot yang final dikonfirmasi (confirmed_slot_id)
```

### 7.3 Best Practice untuk Frontend

1. **Sebelum submit:** Gunakan `GET /availability/instructor/:id` untuk tampilkan slot tersedia
2. **Validasi tambahan:** Gunakan `GET /availability/find-slots` untuk validasi real-time sebelum submit
3. **Subscribe WebSocket:** Untuk update availability secara real-time
4. **Inform user:** Beritahu bahwa jadwal masih pending dan menunggu konfirmasi admin

---

## 8. Referensi Dokumen Terkait

- [Realtime_Jadwal.md](./Realtime_Jadwal.md) - Dokumentasi endpoint realtime jadwal
- [Admin_scenario.md](./Admin_scenario.md) - Skenario penggunaan admin
- [Flow_Assign_Instructor(Admin).md](./Flow_Assign_Instructor(Admin).md) - Flow assignment oleh admin
