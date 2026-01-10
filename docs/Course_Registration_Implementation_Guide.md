    # Panduan Implementasi Halaman Registrasi Course

    Dokumentasi ini menjelaskan secara lengkap langkah-langkah implementasi halaman registrasi untuk calon murid yang akan mendaftar course melalui endpoint `POST /api/booking/register-course`.

    ---

    ## Daftar Isi

    1. [Gambaran Umum Alur Registrasi](#1-gambaran-umum-alur-registrasi)
    2. [Step 1: Menampilkan Daftar Course](#step-1-menampilkan-daftar-course)
    3. [Step 2: Menampilkan Detail Course](#step-2-menampilkan-detail-course)
    4. [Step 3: Memilih Instructor dan Melihat Jadwal](#step-3-memilih-instructor-dan-melihat-jadwal)
    5. [Step 4: Mengisi Form Registrasi](#step-4-mengisi-form-registrasi)
    6. [Step 5: Submit Registrasi](#step-5-submit-registrasi)
    7. [Penanganan Error](#penanganan-error)
    8. [Checklist Implementasi](#checklist-implementasi)

    ---

    ## 1. Gambaran Umum Alur Registrasi

    ### Diagram Alur

    ```
    ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
    │  Pilih Course   │ ──▶ │ Pilih Instructor│ ──▶ │  Lihat Jadwal   │ ──▶ │  Pilih Slot     │
    │  (GET /courses) │     │ (GET /available │     │  (GET /find-    │     │  Preferensi     │
    │                 │     │   -instructors) │     │     slots)      │     │                 │
    └─────────────────┘     └─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                                                    │
                                                                                    ▼
                            ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
                            │ Booking Created │ ◀── │ Submit Register │ ◀── │  Isi Form Data  │
                            │ (status:pending)│     │ (POST /register │     │    Pribadi      │
                            │                 │     │     -course)    │     │                 │
                            └─────────────────┘     └─────────────────┘     └─────────────────┘
    ```

    ### Urutan Langkah

    1. **User membuka halaman pendaftaran** → Sistem fetch daftar course
    2. **User memilih course** → Sistem menampilkan detail course
    3. **User memilih instructor** → Sistem menampilkan tabel jadwal mingguan instructor
    4. **User melihat jadwal dan memilih slot preferensi** → Pilih dari slot yang tersedia
    5. **User mengisi data pribadi lengkap** → Form validation
    6. **User submit form** → Booking dibuat dengan status "pending"
    7. **Admin review** → Confirm atau cancel booking

    ---

    ## Step 1: Menampilkan Daftar Course

    ### Tujuan

    Menampilkan semua course yang tersedia untuk dipilih user.

    ### Endpoint

    **Request:**

    ```http
    GET /api/courses
    ```

    **Query Parameters (Optional):**
    | Parameter | Type | Deskripsi |
    |---------------|--------|------------------------------------|
    | search | string | Pencarian berdasarkan title/desc |
    | instructor_id | string | Filter berdasarkan instructor |

    **Response Sukses:**

    ```json
    {
    "success": true,
    "data": {
        "courses": [
        {
            "id": "c7f3d2a1-5b8e-4c9d-a6e7-1f2b3c4d5e6f",
            "title": "Piano Klasik",
            "description": "Kursus piano klasik untuk pemula hingga menengah",
            "instrument": "Piano",
            "level": "beginner",
            "instructor_name": "Pak Budi",
            "duration_minutes": 60,
            "price": 350000,
            "created_at": "2024-12-01T10:00:00.000Z"
        },
        {
            "id": "a8e4f1b2-6c9d-5e0f-b7f8-2g3h4i5j6k7l",
            "title": "Biola untuk Anak",
            "description": "Kursus biola khusus untuk anak usia 6-12 tahun",
            "instrument": "Violin",
            "level": "beginner",
            "instructor_name": "Bu Ani",
            "duration_minutes": 45,
            "price": 300000,
            "created_at": "2024-12-05T14:30:00.000Z"
        }
        ],
        "pagination": {
        "page": 1,
        "limit": 10,
        "total": 25,
        "total_pages": 3
        }
    }
    }
    ```

    ### Implementasi Frontend

    ```javascript
    // Fetch daftar course
    const fetchCourses = async () => {
    const response = await fetch("/api/courses");
    const result = await response.json();

    if (result.success) {
        setCourses(result.data.courses);
    } else {
        console.error("Error:", result.error.message);
    }
    };
    ```

    ---

    ## Step 2: Menampilkan Detail Course

    ### Tujuan

    Menampilkan detail lengkap course yang dipilih user.

    ### Endpoint

    **Request:**

    ```http
    GET /api/courses/:id
    ```

    **Contoh:**

    ```http
    GET /api/courses/c7f3d2a1-5b8e-4c9d-a6e7-1f2b3c4d5e6f
    ```

    **Response Sukses:**

    ```json
    {
    "success": true,
    "data": {
        "id": "c7f3d2a1-5b8e-4c9d-a6e7-1f2b3c4d5e6f",
        "title": "Piano Klasik",
        "description": "Kursus piano klasik untuk pemula hingga menengah. Materi meliputi teori musik dasar, teknik bermain, dan repertoire klasik.",
        "instrument": "Piano",
        "level": "beginner",
        "instructor_name": "Pak Budi",
        "duration_minutes": 60,
        "price": 350000,
        "max_students": 1,
        "created_at": "2024-12-01T10:00:00.000Z",
        "updated_at": "2024-12-15T08:00:00.000Z"
    }
    }
    ```

    ---

    ## Step 3: Memilih Instructor dan Melihat Jadwal

    ### Tujuan

    User memilih instructor preferensi, kemudian sistem menampilkan tabel jadwal mingguan yang menunjukkan:

    - Hari apa saja instructor tersebut mengajar
    - Sesi/waktu berapa
    - Ruangan mana
    - Slot mana yang **tersedia** (kosong) vs **terisi** (sudah dibooking)

    ### Alur Step 3

    ```
    ┌──────────────────────────┐
    │  1. Tampilkan Daftar     │
    │     Instructor           │
    │  (GET /available-        │
    │       instructors)       │
    └───────────┬──────────────┘
                │
                ▼
    ┌──────────────────────────┐
    │  2. User Pilih           │
    │     Instructor           │
    └───────────┬──────────────┘
                │
                ▼
    ┌──────────────────────────┐
    │  3. Tampilkan Tabel      │
    │     Jadwal Mingguan      │
    │  (GET /availability/     │
    │       find-slots)        │
    └───────────┬──────────────┘
                │
                ▼
    ┌──────────────────────────┐
    │  4. User Pilih Slot      │
    │     Preferensi 1 & 2     │
    └──────────────────────────┘
    ```

    ---

    ### 3.1 Endpoint: Mendapatkan Daftar Instructor

    **Request:**

    ```http
    GET /api/booking/available-instructors
    ```

    **Response Sukses:**

    ```json
    {
    "success": true,
    "data": {
        "instructors": [
        {
            "id": "d9e5f2a3-7b0c-6d1e-c8f9-3g4h5i6j7k8l",
            "name": "Pak Budi Santoso",
            "specialization": "Piano Klasik, Piano Jazz",
            "bio": "Lulusan Konservatorium Jakarta dengan pengalaman mengajar 15 tahun",
            "email": "budi.santoso@shemamusic.com",
            "wa_number": "+6281234567890",
            "experience_years": 15,
            "rating": 4.8,
            "available_slots": 12
        },
        {
            "id": "e0f6g3b4-8c1d-7e2f-d9g0-4h5i6j7k8l9m",
            "name": "Bu Ani Wijaya",
            "specialization": "Biola, Viola",
            "bio": "Violinist profesional dengan sertifikasi ABRSM Grade 8",
            "email": "ani.wijaya@shemamusic.com",
            "wa_number": "+6287654321098",
            "experience_years": 10,
            "rating": 4.9,
            "available_slots": 8
        }
        ]
    },
    "meta": {
        "count": 2,
        "timestamp": "2024-12-24T02:00:00.000Z"
    }
    }
    ```

    ---

    ### 3.2 Endpoint: Mendapatkan Jadwal Instructor (Slot Tersedia)

    Setelah user memilih instructor, panggil endpoint ini untuk mendapatkan slot jadwal yang **tersedia** untuk instructor tersebut.

    **Request:**

    ```http
    GET /api/booking/availability/find-slots?instructor_id={instructor_id}
    ```

    **Query Parameters:**
    | Parameter | Type | Required | Deskripsi |
    |---------------|--------|----------|-------------------------------------|
    | instructor_id | string | Yes | UUID instructor yang dipilih |
    | date | string | No | Filter tanggal spesifik (YYYY-MM-DD)|
    | duration | number | No | Durasi dalam menit |

    **Contoh Request:**

    ```http
    GET /api/booking/availability/find-slots?instructor_id=d9e5f2a3-7b0c-6d1e-c8f9-3g4h5i6j7k8l
    ```

    **Response Sukses:**

    ```json
    {
    "success": true,
    "data": {
        "slots": [
        {
            "schedule_id": "sch-001-uuid",
            "instructor_id": "d9e5f2a3-7b0c-6d1e-c8f9-3g4h5i6j7k8l",
            "room_id": "room-001-uuid",
            "room_name": "Ruang Piano 1",
            "date": "2024-12-30",
            "start_time": "09:00",
            "end_time": "10:00",
            "duration": 60
        },
        {
            "schedule_id": "sch-002-uuid",
            "instructor_id": "d9e5f2a3-7b0c-6d1e-c8f9-3g4h5i6j7k8l",
            "room_id": "room-001-uuid",
            "room_name": "Ruang Piano 1",
            "date": "2024-12-30",
            "start_time": "10:00",
            "end_time": "11:00",
            "duration": 60
        },
        {
            "schedule_id": "sch-003-uuid",
            "instructor_id": "d9e5f2a3-7b0c-6d1e-c8f9-3g4h5i6j7k8l",
            "room_id": "room-002-uuid",
            "room_name": "Ruang Piano 2",
            "date": "2025-01-01",
            "start_time": "14:00",
            "end_time": "15:00",
            "duration": 60
        },
        {
            "schedule_id": "sch-004-uuid",
            "instructor_id": "d9e5f2a3-7b0c-6d1e-c8f9-3g4h5i6j7k8l",
            "room_id": "room-001-uuid",
            "room_name": "Ruang Piano 1",
            "date": "2025-01-03",
            "start_time": "15:00",
            "end_time": "16:00",
            "duration": 60
        }
        ]
    },
    "meta": {
        "count": 4,
        "timestamp": "2024-12-24T03:00:00.000Z"
    }
    }
    ```

    ---

    ### 3.3 Menampilkan Tabel Jadwal Mingguan

    Transformasi data `slots` menjadi tabel jadwal mingguan agar mudah dipahami user.

    #### Contoh Tampilan Tabel UI

    ```
    ┌─────────────────────────────────────────────────────────────────────────────────────────┐
    │                    JADWAL TERSEDIA - Pak Budi Santoso                                   │
    ├─────────────────────────────────────────────────────────────────────────────────────────┤
    │ Waktu       │  Senin      │  Selasa     │  Rabu       │  Kamis      │  Jumat      │
    ├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
    │ 09:00-10:00 │ ✅ Tersedia │     -       │ ❌ Terisi   │     -       │ ✅ Tersedia │
    │             │ Ruang Piano 1│             │             │             │ Ruang Piano 1│
    ├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
    │ 10:00-11:00 │ ✅ Tersedia │     -       │     -       │ ✅ Tersedia │     -       │
    │             │ Ruang Piano 1│             │             │ Ruang Piano 2│             │
    ├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
    │ 14:00-15:00 │     -       │ ✅ Tersedia │     -       │ ✅ Tersedia │     -       │
    │             │             │ Ruang Piano 1│             │ Ruang Piano 1│             │
    ├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
    │ 15:00-16:00 │     -       │     -       │ ✅ Tersedia │     -       │ ✅ Tersedia │
    │             │             │             │ Ruang Piano 2│             │ Ruang Piano 1│
    └─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘

    Legenda:
    ✅ Tersedia  = Slot kosong, bisa dipilih user
    ❌ Terisi    = Slot sudah dibooking siswa lain
    -            = Instructor tidak mengajar di waktu ini
    ```

    #### Logika Transformasi Data

    ```javascript
    // Transformasi slots menjadi struktur tabel mingguan
    const transformToWeeklySchedule = (slots) => {
    const dayMapping = {
        1: "Senin",
        2: "Selasa",
        3: "Rabu",
        4: "Kamis",
        5: "Jumat",
        6: "Sabtu",
        0: "Minggu",
    };

    const timeSlots = {};

    slots.forEach((slot) => {
        const date = new Date(slot.date);
        const dayName = dayMapping[date.getDay()];
        const timeKey = `${slot.start_time}-${slot.end_time}`;

        if (!timeSlots[timeKey]) timeSlots[timeKey] = {};

        timeSlots[timeKey][dayName] = {
        schedule_id: slot.schedule_id,
        room_name: slot.room_name,
        available: true, // Semua slot dari find-slots adalah tersedia
        date: slot.date,
        };
    });

    return timeSlots;
    };
    ```

    ---

    ### 3.4 State Management & Implementasi

    ```javascript
    const [selectedInstructor, setSelectedInstructor] = useState(null);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [firstPreference, setFirstPreference] = useState(null);
    const [secondPreference, setSecondPreference] = useState(null);

    // Fetch slots saat instructor dipilih
    useEffect(() => {
    if (selectedInstructor) {
        fetchAvailableSlots(selectedInstructor.id);
    }
    }, [selectedInstructor]);

    const fetchAvailableSlots = async (instructorId) => {
    const response = await fetch(
        `/api/booking/availability/find-slots?instructor_id=${instructorId}`
    );
    const result = await response.json();
    if (result.success) {
        setAvailableSlots(result.data.slots);
    }
    };

    const handleSlotSelect = (slot) => {
    const preference = {
        day: getDayName(slot.date),
        start_time: slot.start_time,
        end_time: slot.end_time,
        instructor_id: selectedInstructor.id,
    };

    if (!firstPreference) {
        setFirstPreference(preference);
    } else if (!secondPreference) {
        setSecondPreference(preference);
    }
    };

    const getDayName = (dateString) => {
    const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
    ];
    return days[new Date(dateString).getDay()];
    };
    ```

    ---

    ## Step 4: Mengisi Form Registrasi

    ### Tujuan

    User mengisi semua data yang diperlukan untuk registrasi course.

    ### Data yang Diperlukan

    #### A. Data Wajib (Required Fields)

    | Field              | Type    | Validasi                                  | Contoh                                     |
    | ------------------ | ------- | ----------------------------------------- | ------------------------------------------ |
    | full_name          | string  | Minimal 1 karakter                        | "Ahmad Rahman Putra"                       |
    | email              | string  | Format email valid                        | "ahmad.rahman@gmail.com"                   |
    | course_id          | string  | UUID valid dari daftar course             | "c7f3d2a1-5b8e-4c9d-a6e7-1f2b3c4d5e6f"     |
    | address            | string  | Minimal 1 karakter                        | "Jl. Sudirman No. 123, Jakarta Selatan"    |
    | birth_place        | string  | Minimal 1 karakter                        | "Jakarta"                                  |
    | birth_date         | string  | Format YYYY-MM-DD                         | "2010-05-15"                               |

    | consent            | boolean | Harus `true`                              | true                                       |
    | captcha_token      | string  | Token dari reCAPTCHA                      | "03AGdBq24PBCbwiDRaS\_..."                 |
    | idempotency_key    | string  | UUID unik untuk mencegah duplikasi        | "550e8400-e29b-41d4-a716-446655440001"     |
    | payment_proof      | string  | URL bukti pembayaran (minimal 1 karakter) | "https://storage.shema.../bukti_bayar.jpg" |

    #### B. Data Opsional (Optional Fields)

    | Field                | Type    | Validasi                                   | Contoh                          |
    | -------------------- | ------- | ------------------------------------------ | ------------------------------- |
    | user_id              | string  | UUID (jika user sudah login)               | "uuid-user-id"                  |
    | experience_level     | enum    | "beginner" \| "intermediate" \| "advanced" | "beginner"                      |
    | preferred_days       | array   | Minimal 1 item jika diisi                  | ["monday", "wednesday"]         |
    | preferred_time_range | object  | Format HH:MM untuk start dan end           | {"start":"14:00","end":"16:00"} |
    | start_date_target    | string  | Tanggal target mulai belajar               | "2025-01-15"                    |
    | instrument_owned     | boolean | Apakah sudah memiliki alat musik           | false                           |
    | notes                | string  | Catatan tambahan                           | "Anak sangat tertarik piano"    |
    | referral_source      | enum    | Sumber informasi                           | "instagram"                     |
    | type_course          | enum    | "reguler" \| "hobby" \| "karyawan" \| "ministry" \| "privat" | "reguler" |
    | school               | string  | Minimal 1 karakter (Optional)             | "SD Negeri 1 Jakarta"           |
    | class                | string  | String (contoh: "5", "10 IPA", "3 B")     | "5"                             |
    | guardian_name        | string  | Minimal 1 karakter (Optional)             | "Budi Rahman"                   |
    | guardian_wa_number   | string  | Harus dimulai "+62" (Optional)            | "+6281234567890"                |

    **Enum referral_source:** `"instagram"` | `"facebook"` | `"google"` | `"tiktok"` | `"friend"` | `"website"` | `"other"`
    **Enum type_course:** `"reguler"` | `"hobby"` | `"karyawan"` | `"ministry"` | `"privat"`

    #### C. Preferensi Instructor & Jadwal (Optional)

    | Field             | Type   | Struktur                                   |
    | ----------------- | ------ | ------------------------------------------ |
    | first_preference  | object | {day, start_time, end_time, instructor_id} |
    | second_preference | object | {day, start_time, end_time, instructor_id} |

    **Struktur Preference Object:**

    ```json
    {
    "day": "Monday",
    "start_time": "14:00",
    "end_time": "15:00",
    "instructor_id": "d9e5f2a3-7b0c-6d1e-c8f9-3g4h5i6j7k8l"
    }
    ```

    **Validasi Time Format:** Regex `/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/` (contoh: "09:00", "14:30", "23:59")

    ---

    ## Step 5: Submit Registrasi

    ### Tujuan

    Mengirim data registrasi ke backend untuk membuat booking baru.

    ### Endpoint

    **Request:**

    ```http
    POST /api/booking/register-course
    Content-Type: application/json
    ```

    ### Contoh Request Body Lengkap

    ```json
    {
    "full_name": "Ahmad Rahman Putra",
    "email": "ahmad.rahman@gmail.com",
    "course_id": "c7f3d2a1-5b8e-4c9d-a6e7-1f2b3c4d5e6f",
    "address": "Jl. Sudirman No. 123, RT 05/RW 03, Kelurahan Setiabudi, Jakarta Selatan 12920",
    "birth_place": "Jakarta",
    "birth_date": "2010-05-15",
    "school": "SD Negeri 1 Jakarta",
    "class": "5",
    "guardian_name": "Budi Rahman",
    "guardian_wa_number": "+6281234567890",
    "consent": true,
    "captcha_token": "03AGdBq24PBCbwiDRaS_MIP2e4rFmJXFhdJSZdHQwOyx",
    "idempotency_key": "550e8400-e29b-41d4-a716-446655440001",
    "payment_proof": "https://storage.shemamusic.my.id/payments/bukti_transfer_ahmad_20241224.jpg",
    "experience_level": "beginner",
    "preferred_days": ["monday", "wednesday", "friday"],
    "preferred_time_range": {
        "start": "14:00",
        "end": "17:00"
    },
    "start_date_target": "2025-01-15",
    "instrument_owned": false,
    "notes": "Anak sangat tertarik dengan piano sejak kecil. Mohon jadwal sore karena sekolah sampai jam 14:00.",
    "referral_source": "instagram",
    "type_course": "reguler",
    "first_preference": {
        "day": "Monday",
        "start_time": "15:00",
        "end_time": "16:00",
        "instructor_id": "d9e5f2a3-7b0c-6d1e-c8f9-3g4h5i6j7k8l"
    },
    "second_preference": {
        "day": "Wednesday",
        "start_time": "16:00",
        "end_time": "17:00",
        "instructor_id": "e0f6g3b4-8c1d-7e2f-d9g0-4h5i6j7k8l9m"
    }
    }
    ```

    ### Response Sukses (201 Created)

    ```json
    {
    "success": true,
    "data": {
        "booking": {
        "id": "b1c2d3e4-f5g6-7h8i-9j0k-1l2m3n4o5p6q",
        "user_id": null,
        "course_id": "c7f3d2a1-5b8e-4c9d-a6e7-1f2b3c4d5e6f",
        "status": "pending",
        "experience_level": "beginner",
        "preferred_days": ["monday", "wednesday", "friday"],
        "preferred_time_range": {
            "start": "14:00",
            "end": "17:00"
        },
        "start_date_target": "2025-01-15",
        "guardian_name": "Budi Rahman",
        "guardian_wa_number": "+6281234567890",
        "instrument_owned": false,
        "notes": "Anak sangat tertarik dengan piano sejak kecil. Mohon jadwal sore karena sekolah sampai jam 14:00.",
        "referral_source": "instagram",
        "applicant_full_name": "Ahmad Rahman Putra",
        "applicant_email": "ahmad.rahman@gmail.com",
        "applicant_wa_number": "+6281234567890",
        "applicant_address": "Jl. Sudirman No. 123, RT 05/RW 03, Kelurahan Setiabudi, Jakarta Selatan 12920",
        "applicant_birth_place": "Jakarta",
        "applicant_birth_date": "2010-05-15",
        "applicant_school": "SD Negeri 1 Jakarta",
        "applicant_class": "5",
        "first_preference": {
            "day": "Monday",
            "start_time": "15:00",
            "end_time": "16:00",
            "instructor_id": "d9e5f2a3-7b0c-6d1e-c8f9-3g4h5i6j7k8l"
        },
        "second_preference": {
            "day": "Wednesday",
            "start_time": "16:00",
            "end_time": "17:00",
            "instructor_id": "e0f6g3b4-8c1d-7e2f-d9g0-4h5i6j7k8l9m"
        },
        "first_choice_slot_id": null,
        "second_choice_slot_id": null,
        "created_at": "2024-12-24T03:00:00.000Z",
        "expires_at": "2024-12-27T03:00:00.000Z"
        }
    },
    "meta": {
        "timestamp": "2024-12-24T03:00:00.000Z"
    }
    }
    ```

    ### Implementasi Frontend

    ```javascript
    import { v4 as uuidv4 } from "uuid";

    const submitRegistration = async (formData) => {
    // Generate idempotency key
    const idempotencyKey = uuidv4();

    // Get captcha token (example with reCAPTCHA)
    const captchaToken = await grecaptcha.execute("your-site-key", {
        action: "register",
    });

    const payload = {
        ...formData,
        idempotency_key: idempotencyKey,
        captcha_token: captchaToken,
        consent: true,
    };

    try {
        const response = await fetch("/api/booking/register-course", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (result.success) {
        // Registrasi berhasil
        console.log("Booking created:", result.data.booking.id);
        showSuccessMessage("Pendaftaran berhasil! Tunggu konfirmasi dari admin.");

        // Simpan booking ID untuk tracking
        localStorage.setItem("lastBookingId", result.data.booking.id);

        // Redirect ke halaman sukses
        router.push("/registration-success");
        } else {
        // Handle error
        handleError(result.error);
        }
    } catch (error) {
        console.error("Network error:", error);
        showErrorMessage("Terjadi kesalahan jaringan. Silakan coba lagi.");
    }
    };
    ```

    ---

    ## Penanganan Error

    ### Daftar Error Code

    | HTTP Status | Error Code             | Deskripsi                                 | Solusi                                  |
    | ----------- | ---------------------- | ----------------------------------------- | --------------------------------------- |
    | 400         | INVALID_JSON           | JSON request tidak valid                  | Periksa format JSON                     |
    | 400         | VALIDATION_ERROR       | Data tidak sesuai schema                  | Periksa field yang error dari `details` |
    | 404         | COURSE_NOT_FOUND       | Course ID tidak ditemukan                 | Pilih course yang valid                 |
    | 409         | DUPLICATE_REQUEST      | Idempotency key sudah digunakan           | Generate idempotency key baru           |
    | 409         | PENDING_BOOKING_EXISTS | Sudah ada booking pending untuk email ini | Hubungi admin atau tunggu konfirmasi    |
    | 500         | DATABASE_ERROR         | Error pada database                       | Coba lagi nanti atau hubungi support    |
    | 500         | INTERNAL_SERVER_ERROR  | Error internal server                     | Coba lagi nanti atau hubungi support    |

    ### Contoh Response Error

    **Validation Error:**

    ```json
    {
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Validation failed",
        "details": [
        {
            "code": "invalid_string",
            "message": "Invalid email format",
            "path": ["email"]
        },
        {
            "code": "too_small",
            "message": "WA number must start with +62",
            "path": ["guardian_wa_number"]
        }
        ]
    }
    }
    ```

    **Pending Booking Exists:**

    ```json
    {
    "success": false,
    "error": {
        "code": "PENDING_BOOKING_EXISTS",
        "message": "A pending booking already exists for this email and course"
    }
    }
    ```

    ### Implementasi Error Handling

    ```javascript
    const handleError = (error) => {
    switch (error.code) {
        case "VALIDATION_ERROR":
        // Tampilkan error per field
        error.details.forEach((detail) => {
            setFieldError(detail.path[0], detail.message);
        });
        break;

        case "COURSE_NOT_FOUND":
        showErrorMessage("Course tidak ditemukan. Silakan pilih course lain.");
        break;

        case "DUPLICATE_REQUEST":
        showWarningMessage("Permintaan duplikat terdeteksi. Silakan coba lagi.");
        break;

        case "PENDING_BOOKING_EXISTS":
        showErrorMessage(
            "Anda sudah memiliki pendaftaran yang sedang diproses untuk course ini."
        );
        break;

        default:
        showErrorMessage("Terjadi kesalahan. Silakan coba lagi nanti.");
    }
    };
    ```

    ---

    ## Checklist Implementasi

    ### Persiapan

    - [ ] Setup reCAPTCHA v3 untuk captcha token
    - [ ] Implementasi UUID generator untuk idempotency key
    - [ ] Siapkan storage untuk upload bukti pembayaran

    ### Fetch Data

    - [ ] Fetch daftar course dari `GET /api/courses`
    - [ ] Fetch detail course dari `GET /api/courses/:id`
    - [ ] Fetch daftar instructor dari `GET /api/booking/available-instructors`
    - [ ] Fetch slot jadwal instructor dari `GET /api/booking/availability/find-slots?instructor_id=xxx`

    ### Komponen Instructor & Jadwal Selection

    - [ ] Buat komponen Instructor Selector Card
    - [ ] Buat komponen Weekly Schedule Table (tabel Senin-Minggu)
    - [ ] Implementasi transformasi data slots ke format tabel mingguan
    - [ ] Tampilkan status slot: ✅ Tersedia, ❌ Terisi, - Tidak ada jadwal
    - [ ] Tampilkan informasi ruangan di setiap slot
    - [ ] Buat komponen Preference Card untuk pilihan 1 dan 2
    - [ ] Implementasi logika pemilihan slot (klik slot → isi preferensi)

    ### Form Implementation

    - [ ] Buat form dengan semua field yang diperlukan
    - [ ] Implementasi validasi client-side sesuai aturan
    - [ ] Implementasi file upload untuk bukti pembayaran

    ### Submit & Handling

    - [ ] Generate idempotency key sebelum submit
    - [ ] Dapatkan captcha token sebelum submit
    - [ ] Kirim request ke `POST /api/booking/register-course`
    - [ ] Handle semua kemungkinan response error
    - [ ] Tampilkan pesan sukses dan redirect setelah berhasil

    ### UX/UI

    - [ ] Loading state saat fetch instructor dan slots
    - [ ] Loading state saat submit
    - [ ] Disable button setelah submit untuk mencegah double submit
    - [ ] Tampilkan error message yang user-friendly
    - [ ] Konfirmasi sebelum submit (review data)

    ---

    ## Catatan Penting

    1. **Idempotency Key**: Selalu generate UUID baru untuk setiap submit. Jangan gunakan ulang idempotency key yang sama.

    2. **Booking Expiry**: Booking akan expire dalam 3 hari jika tidak dikonfirmasi admin.

    3. **Preference Optional**: Field `first_preference` dan `second_preference` bersifat opsional. User tidak wajib memilih instructor.

    4. **WA Number Format**: Nomor WhatsApp harus dalam format internasional (+62xxx).

    5. **Consent**: Field `consent` harus selalu `true`. Tampilkan checkbox persetujuan syarat dan ketentuan.
