# Data yang Diisi Saat Register Course

## Overview
Saat calon murid ingin mendaftar course, mereka tidak mengisi pertanyaan assessment seperti di service rekomendasi. Sebaliknya, mereka mengisi data pribadi dan preferensi jadwal melalui endpoint `POST /api/booking/register-course` di Booking Service.

Assessment (pertanyaan untuk rekomendasi course) adalah proses terpisah yang dilakukan melalui Recommendation Service setelah atau sebelum register course, untuk memberikan rekomendasi course yang sesuai dengan profil siswa.

## Data yang Diperlukan Saat Register Course
Berdasarkan kode di `booking/src/controllers/bookingController.ts`, data yang harus diisi calon murid saat register course adalah:

### Data Wajib:
- **course_id**: ID course yang ingin didaftar
- **full_name**: Nama lengkap siswa
- **email**: Email siswa
- **guardian_name**: Nama wali/orang tua
- **guardian_wa_number**: Nomor WhatsApp wali
- **address**: Alamat siswa
- **birth_place**: Tempat lahir
- **birth_date**: Tanggal lahir
- **school**: Sekolah siswa
- **class**: Kelas siswa
- **idempotency_key**: Kunci unik untuk mencegah duplikasi request
- **experience_level**: Tingkat pengalaman (default: 'beginner')
- **preferred_days**: Hari preferensi belajar (array)
- **preferred_time_range**: Rentang waktu preferensi (object)
- **start_date_target**: Tanggal mulai yang diinginkan
- **instrument_owned**: Apakah memiliki alat musik sendiri (boolean)
- **notes**: Catatan tambahan
- **referral_source**: Sumber referral

## Perbedaan dengan Assessment
- **Register Course**: Mengisi data pribadi dan preferensi untuk mendaftar course tertentu
- **Assessment**: Mengisi 11 pertanyaan tentang preferensi musik, pengalaman, dll. untuk mendapatkan rekomendasi course yang sesuai

Assessment dilakukan melalui endpoint `POST /api/assessment/` di Recommendation Service dan terdiri dari pertanyaan seperti:
- Usia
- Alat musik yang ingin dipelajari
- Tingkat kemampuan saat ini
- Tujuan belajar
- Preferensi jadwal
- dll.

## Bentuk Request Body dan Response

### Request Body
Berdasarkan schema validasi di `booking/src/utils/validation.ts`, berikut adalah struktur lengkap request body yang harus dikirim frontend:

```json
{
  // Data wajib
  "full_name": "string (nama lengkap siswa)",
  "email": "string (email valid)",
  "course_id": "string (UUID course yang didaftar)",
  "address": "string (alamat lengkap)",
  "birth_place": "string (tempat lahir)",
  "birth_date": "string (format YYYY-MM-DD)",
  "school": "string (nama sekolah)",
  "class": "number (1-12, kelas siswa)",
  "guardian_name": "string (nama wali/orang tua)",
  "guardian_wa_number": "string (harus dimulai +62)",
  "consent": true,
  "captcha_token": "string (token captcha)",
  "idempotency_key": "string (UUID unik untuk mencegah duplikasi)",
  "user_id": "string (UUID, jika sudah login)",
  "experience_level": "enum: 'beginner' | 'intermediate' | 'advanced'",
  "preferred_days": ["string array, contoh: ['monday', 'wednesday']"],
  "preferred_time_range": {
    "start": "string (format HH:MM, contoh: '14:00')",
    "end": "string (format HH:MM, contoh: '16:00')"
  },
  "start_date_target": "string (tanggal mulai yang diinginkan)",
  "instrument_owned": "boolean (apakah punya alat musik)",
  "notes": "string (catatan tambahan)",
  "referral_source": "enum: 'instagram' | 'facebook' | 'google' | 'tiktok' | 'friend' | 'website' | 'other'"
}
```

### Response Sukses
Jika register berhasil, response akan seperti berikut:

```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "string (UUID booking)",
      "user_id": "string | null",
      "course_id": "string (UUID course)",
      "status": "pending",
      "experience_level": "string",
      "preferred_days": "array | null",
      "preferred_time_range": "object | null",
      "start_date_target": "string | null",
      "guardian_name": "string",
      "guardian_wa_number": "string",
      "instrument_owned": "boolean | null",
      "notes": "string | null",
      "referral_source": "string | null",
      "applicant_full_name": "string",
      "applicant_email": "string",
      "applicant_wa_number": "string",
      "applicant_address": "string",
      "applicant_birth_place": "string",
      "applicant_birth_date": "string",
      "applicant_school": "string",
      "applicant_class": "number",
      "created_at": "string (ISO timestamp)",
      "expires_at": "string (ISO timestamp, 3 hari dari sekarang)"
    }
  },
  "meta": {
    "timestamp": "string (ISO timestamp)"
  }
}
```

### Response Error
Jika ada error, response akan seperti berikut:

```json
{
  "success": false,
  "error": {
    "code": "string (kode error, contoh: VALIDATION_ERROR, COURSE_NOT_FOUND, etc.)",
    "message": "string (pesan error)",
    "details": "array (opsional, detail validasi error)"
  }
}
```

### Kode Error yang Mungkin:
- `INVALID_JSON`: JSON request tidak valid
- `VALIDATION_ERROR`: Data tidak sesuai schema
- `COURSE_NOT_FOUND`: Course ID tidak ditemukan
- `DUPLICATE_REQUEST`: Idempotency key sudah digunakan
- `PENDING_BOOKING_EXISTS`: Sudah ada booking pending untuk email/course ini
- `DATABASE_ERROR`: Error database
- `INTERNAL_SERVER_ERROR`: Error internal server

## Contoh Request Lengkap
```json
{
  "full_name": "Ahmad Rahman",
  "email": "ahmad@example.com",
  "course_id": "550e8400-e29b-41d4-a716-446655440000",
  "address": "Jl. Sudirman No. 123, Jakarta",
  "birth_place": "Jakarta",
  "birth_date": "2010-05-15",
  "school": "SD Negeri 1 Jakarta",
  "class": 5,
  "guardian_name": "Budi Rahman",
  "guardian_wa_number": "+6281234567890",
  "consent": true,
  "captcha_token": "recaptcha_token_here",
  "idempotency_key": "550e8400-e29b-41d4-a716-446655440001",
  "experience_level": "beginner",
  "preferred_days": ["monday", "wednesday"],
  "preferred_time_range": {
    "start": "14:00",
    "end": "16:00"
  },
  "instrument_owned": false,
  "notes": "Anak sangat tertarik dengan piano",
  "referral_source": "instagram"
}
```