# Fitur Auto-Create Student saat Confirm Booking

## Deskripsi

Ketika admin mengkonfirmasi booking melalui endpoint `POST /booking/:id/confirm`, sistem akan **otomatis membuat data student** di table `students`. Fitur ini menghilangkan kebutuhan untuk membuat student secara manual setelah booking dikonfirmasi.

## Alur Proses

```
┌─────────────────────────────────────────────────────────────┐
│                    CONFIRM BOOKING FLOW                      │
└─────────────────────────────────────────────────────────────┘

Admin                          Booking Service                 Database
  │                                 │                              │
  │ POST /booking/:id/confirm       │                              │
  │────────────────────────────────>│                              │
  │                                 │                              │
  │                                 │──── Get booking by ID ──────>│
  │                                 │<──── booking data ───────────│
  │                                 │                              │
  │                                 │── Validate status='pending'──│
  │                                 │                              │
  │                                 │── UPDATE bookings            │
  │                                 │   SET status='confirmed' ───>│
  │                                 │                              │
  │                                 │──── Check existing student ─>│
  │                                 │     (by email or booking_id) │
  │                                 │<──── result ─────────────────│
  │                                 │                              │
  │                        ┌────────┴────────┐                     │
  │                        │ Student exists? │                     │
  │                        └────────┬────────┘                     │
  │                                 │                              │
  │              ┌──────────────────┼──────────────────┐           │
  │              │ NO               │ YES              │           │
  │              ▼                  ▼                  │           │
  │     ┌────────────────┐  ┌────────────────┐        │           │
  │     │ Get course     │  │ Return existing│        │           │
  │     │ instrument     │  │ student info   │        │           │
  │     └───────┬────────┘  └────────────────┘        │           │
  │             │                                      │           │
  │             ▼                                      │           │
  │     ┌────────────────┐                             │           │
  │     │ INSERT students│─────────────────────────────┼──────────>│
  │     └───────┬────────┘                             │           │
  │             │                                      │           │
  │             ▼                                      │           │
  │     ┌────────────────┐                             │           │
  │     │Publish Kafka   │                             │           │
  │     │student.created │                             │           │
  │     └────────────────┘                             │           │
  │                                 │                              │
  │<──── Response with booking ─────│                              │
  │      and student data           │                              │
  │                                 │                              │
```

## Endpoint

### Confirm Booking
```
POST /api/booking/:id/confirm
```

**Headers:**
- `Authorization: Bearer <admin_token>`
- `Content-Type: application/json`

**Response Success (201):**
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "uuid",
      "status": "confirmed",
      "applicant_full_name": "Nama Siswa",
      "applicant_email": "email@example.com",
      ...
    },
    "student": {
      "id": "uuid",
      "display_name": "Nama Siswa",
      "email": "email@example.com",
      "booking_id": "uuid",
      "instrument": "Piano",
      "level": "beginner",
      ...
    }
  },
  "meta": {
    "timestamp": "2024-12-05T08:00:00.000Z",
    "studentCreated": true
  }
}
```

**Response jika Student sudah ada:**
```json
{
  "success": true,
  "data": {
    "booking": { ... },
    "student": { ... }
  },
  "meta": {
    "timestamp": "2024-12-05T08:00:00.000Z",
    "studentCreated": false,
    "warning": "Student already exists with id: uuid"
  }
}
```

## Mapping Data

| Field di `bookings` | Field di `students` | Keterangan |
|---------------------|---------------------|------------|
| `applicant_full_name` | `display_name` | Nama lengkap siswa |
| `applicant_email` | `email` | Email siswa |
| `id` (booking id) | `booking_id` | Relasi ke booking |
| `user_id` | `user_id` | User ID (jika ada) |
| `experience_level` | `level` | Level pengalaman |
| `instrument_owned` | `has_instrument` | Kepemilikan instrument |
| - | `instrument` | Dari course.instrument atau course.title |
| - | `photo_url` | null (default) |
| - | `highlight_quote` | null (default) |
| - | `can_publish` | false (default) |

## Pencegahan Duplikasi

Sistem mengecek duplikasi berdasarkan:
1. **Email** - Jika sudah ada student dengan email yang sama
2. **Booking ID** - Jika sudah ada student yang terhubung ke booking yang sama

Query yang digunakan:
```sql
SELECT * FROM students 
WHERE email = :applicant_email 
   OR booking_id = :booking_id
```

Jika ditemukan student yang sudah ada, sistem akan:
- TIDAK membuat student baru
- Mengembalikan data student yang sudah ada
- Memberikan warning di response

## Kafka Events

### Event `booking.confirmed`
Dipublish setelah booking berhasil dikonfirmasi:
```json
{
  "bookingId": "uuid",
  "userId": "uuid",
  "courseId": "uuid",
  "studentId": "uuid",
  "timestamp": "2024-12-05T08:00:00.000Z"
}
```

### Event `student.created`
Dipublish setelah student berhasil dibuat:
```json
{
  "studentId": "uuid",
  "bookingId": "uuid",
  "email": "email@example.com",
  "displayName": "Nama Siswa",
  "timestamp": "2024-12-05T08:00:00.000Z"
}
```

## Testing

Jalankan script test:
```bash
bun run scripts/testing/test-confirm-booking-student-creation.js
```

## Catatan Implementasi

1. **Error Handling**: Jika pembuatan student gagal, booking tetap confirmed. Error akan dicatat di log dan dikembalikan sebagai warning.

2. **Idempotency**: Multiple confirm pada booking yang sama akan di-reject (status bukan 'pending').

3. **Transaction**: Saat ini proses tidak dalam satu transaction database. Jika diperlukan, bisa ditambahkan menggunakan Supabase RPC.

## File yang Dimodifikasi

- `booking/src/controllers/bookingController.ts` - Fungsi `confirmBooking`

## Tanggal Implementasi

5 Desember 2025
