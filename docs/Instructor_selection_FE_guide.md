# Panduan Implementasi Frontend: Pemilihan Instructor pada Booking

Dokumentasi ini menjelaskan secara lengkap bagaimana frontend harus mengimplementasikan fitur pemilihan instructor saat user melakukan booking kursus.

---

## 1. Gambaran Umum

### Tujuan Fitur

User dapat memilih instructor pilihan mereka saat mendaftar kursus. Admin kemudian dapat melihat instructor yang dipilih dan memvalidasi ketersediaan jadwal.

### Alur Proses

1. User membuka form pendaftaran kursus
2. User memilih course yang diinginkan
3. Sistem menampilkan daftar instructor yang tersedia untuk course tersebut
4. User memilih instructor dan slot waktu sebagai pilihan pertama dan kedua
5. User submit form → Booking status "pending"
6. Admin melihat daftar booking dengan nama instructor yang dipilih
7. Admin melakukan konfirmasi atau penolakan

---

## 2. API Endpoints yang Digunakan

### 2.1 Mendapatkan Daftar Instructor

**Endpoint:** `GET /api/booking/available-instructors`

**Response:**

```json
{
  "success": true,
  "data": {
    "instructors": [
      {
        "id": "uuid-instructor-1",
        "display_name": "Pak Budi",
        "instrument": "Piano",
        "photo_url": "https://..."
      },
      {
        "id": "uuid-instructor-2",
        "display_name": "Bu Ani",
        "instrument": "Violin",
        "photo_url": "https://..."
      }
    ]
  }
}
```

### 2.2 Submit Booking dengan Instructor Preference

**Endpoint:** `POST /api/booking/register-course`

**Request Body (dengan instructor preference):**

```json
{
  "full_name": "Nama Siswa",
  "email": "siswa@email.com",
  "course_id": "uuid-course",
  "address": "Alamat lengkap",
  "birth_place": "Jakarta",
  "birth_date": "2010-05-15",
  "school": "SMA Contoh",
  "class": 10,
  "guardian_name": "Nama Wali",
  "guardian_wa_number": "+6281234567890",
  "consent": true,
  "captcha_token": "recaptcha-token",
  "idempotency_key": "uuid-unik",
  "payment_proof": "https://url-bukti-bayar.jpg",

  "first_preference": {
    "day": "Monday",
    "start_time": "14:00",
    "end_time": "15:00",
    "instructor_id": "uuid-instructor-1"
  },
  "second_preference": {
    "day": "Wednesday",
    "start_time": "16:00",
    "end_time": "17:00",
    "instructor_id": "uuid-instructor-2"
  }
}
```

### 2.3 Admin: Mendapatkan Daftar Booking

**Endpoint:** `GET /api/booking/bookings`

**Response (dengan instructor name):**

```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": "uuid-booking",
        "applicant_full_name": "Nama Siswa",
        "status": "pending",
        "first_preference": {
          "day": "Monday",
          "start_time": "14:00",
          "end_time": "15:00",
          "instructor_id": "uuid-instructor-1"
        },
        "second_preference": {
          "day": "Wednesday",
          "start_time": "16:00",
          "end_time": "17:00",
          "instructor_id": "uuid-instructor-2"
        },
        "first_preference_instructor_name": "Pak Budi",
        "second_preference_instructor_name": "Bu Ani",
        "courses": {
          "id": "uuid-course",
          "title": "Piano Japan"
        }
      }
    ]
  }
}
```

---

## 3. Implementasi Form Pendaftaran (User Side)

### 3.1 State Management

Form pendaftaran perlu mengelola state berikut:

- `selectedCourse`: Course yang dipilih user
- `availableInstructors`: Daftar instructor untuk course tersebut
- `firstPreference`: Object berisi pilihan pertama (instructor + jadwal)
- `secondPreference`: Object berisi pilihan kedua (instructor + jadwal)

### 3.2 Komponen yang Diperlukan

#### A. Instructor Selector Component

Komponen dropdown atau card untuk memilih instructor:

- Tampilkan foto instructor (jika ada)
- Tampilkan nama instructor
- Tampilkan instrumen yang diajarkan
- Saat dipilih, simpan `instructor_id` ke state preference

#### B. Time Slot Selector Component

Komponen untuk memilih hari dan waktu:

- Dropdown untuk memilih hari (Monday, Tuesday, dst)
- Time picker untuk start_time dan end_time
- Format waktu: "HH:MM" (contoh: "14:00")

#### C. Preference Card Component

Komponen card yang menggabungkan:

- Instructor selector
- Time slot selector
- Label "Pilihan 1" atau "Pilihan 2"

### 3.3 Logika Pengambilan Instructor

1. Setelah user memilih course, panggil `GET /available-instructors`
2. Simpan response ke state `availableInstructors`
3. Tampilkan instructor dalam dropdown/card selector
4. Opsional: Filter instructor berdasarkan course yang dipilih

### 3.4 Validasi Form

Sebelum submit, validasi bahwa:

- `first_preference` memiliki semua field: `day`, `start_time`, `end_time`, `instructor_id`
- `second_preference` memiliki semua field (jika diisi)
- Format waktu sesuai regex: `/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/`
- `instructor_id` adalah UUID yang valid

### 3.5 Contoh Struktur Data untuk Submit

```javascript
const formData = {
  // ... field lainnya
  first_preference: {
    day: selectedDay1, // "Monday"
    start_time: selectedStart1, // "14:00"
    end_time: selectedEnd1, // "15:00"
    instructor_id: selectedInstructor1.id, // UUID
  },
  second_preference: {
    day: selectedDay2,
    start_time: selectedStart2,
    end_time: selectedEnd2,
    instructor_id: selectedInstructor2.id,
  },
};
```

---

## 4. Implementasi Admin Panel

### 4.1 Tabel Bookings

Modifikasi tabel booking untuk menampilkan kolom tambahan:

| Kolom Baru           | Sumber Data                         |
| -------------------- | ----------------------------------- |
| Instructor Pilihan 1 | `first_preference_instructor_name`  |
| Instructor Pilihan 2 | `second_preference_instructor_name` |

### 4.2 Format Tampilan di Tabel

Untuk kolom "First Choice" dan "Second Choice", tampilkan format:

```
{day} {start_time} - {end_time}
(Instructor: {instructor_name})
```

Contoh:

```
Monday 14:00 - 15:00
(Instructor: Pak Budi)
```

### 4.3 Detail Booking Dialog

Saat admin membuka detail booking, tampilkan:

- Informasi pilihan pertama lengkap (hari, waktu, nama instructor)
- Informasi pilihan kedua lengkap
- Status ketersediaan instructor (opsional: integrasikan dengan jadwal)

### 4.4 Aksi Admin

Admin dapat:

1. **Confirm Booking** - Jika instructor dan jadwal tersedia
2. **Reject Booking** - Jika instructor/jadwal tidak sesuai
3. **Contact User** - Untuk negosiasi jadwal alternatif

---

## 5. Penanganan Kasus Khusus

### 5.1 Instructor Tidak Dipilih (Optional)

Field `first_preference` dan `second_preference` bersifat opsional. Jika user tidak memilih:

- Frontend mengirim `null` atau tidak menyertakan field
- Backend menyimpan `null` di database
- Admin panel menampilkan "-" atau "Tidak ada pilihan"

### 5.2 Instructor Sudah Tidak Aktif

Jika instructor yang dipilih sudah tidak aktif:

- `first_preference_instructor_name` akan bernilai `null`
- Admin panel sebaiknya menampilkan "Instructor tidak tersedia"

### 5.3 Backward Compatibility

Booking lama yang dibuat sebelum fitur ini tidak memiliki preference data:

- `first_preference` = `null`
- `second_preference` = `null`
- `first_preference_instructor_name` = `null`
- `second_preference_instructor_name` = `null`

Frontend harus handle kondisi `null` dengan baik.

---

## 6. Struktur Data Reference

### 6.1 Preference Object Schema

```typescript
interface Preference {
  day: string; // "Monday" | "Tuesday" | ... | "Sunday"
  start_time: string; // Format: "HH:MM" (contoh: "14:00")
  end_time: string; // Format: "HH:MM" (contoh: "15:00")
  instructor_id: string; // UUID instructor
  selected_at?: string; // Optional: timestamp pemilihan
}
```

### 6.2 Booking Response dengan Instructor Names

```typescript
interface BookingWithInstructor {
  id: string;
  applicant_full_name: string;
  applicant_email: string;
  status: "pending" | "confirmed" | "rejected" | "expired" | "cancelled";

  // JSONB preference data
  first_preference: Preference | null;
  second_preference: Preference | null;

  // Resolved instructor names (dari backend)
  first_preference_instructor_name: string | null;
  second_preference_instructor_name: string | null;

  // ... field lainnya
}
```

---

## 7. Checklist Implementasi

### Form Pendaftaran (User)

- [ ] Fetch daftar instructor dari API setelah course dipilih
- [ ] Buat komponen Instructor Selector
- [ ] Buat komponen Time Slot Selector (day + start_time + end_time)
- [ ] Buat komponen Preference Card (gabungan instructor + time)
- [ ] Implementasi state management untuk preference
- [ ] Validasi format preference sebelum submit
- [ ] Kirim `first_preference` dan `second_preference` ke API

### Admin Panel

- [ ] Update fetch bookings untuk handle field baru
- [ ] Tambah kolom instructor di tabel bookings
- [ ] Format tampilan: hari, waktu, nama instructor
- [ ] Handle case null untuk booking lama
- [ ] Update detail dialog dengan info instructor
