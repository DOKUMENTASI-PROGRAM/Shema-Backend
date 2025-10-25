Semua program dijalankan melalui docker, akses database melalui docker, cloudflare melalui docker, setiap services dijadikan image dan dijalankan melalui docker.
environment semua services diatur di docker-compose.yml dan docker-compose.override.yml
Service berada di folder root projek, service tersebut adalah admin, api-gateway, auth, booking, course, documentation dan recommendation.
semua service menggunakan image yang mounting ke codebase jadi jika ganti config cukup restart containernya saja.
User menggunakan windows.
Auth service itu hanya bisa digunakan untuk admin saja. Siswa itu hanya bisa regist course
Untuk perubahan database tidak perlu membuat script migrasi, langsung akses supabase remote saja
Untuk akses database gunakan supabase remote lihat file scripts/db-access.js untuk contoh akses nya
Akses supabase dilakukan melalui docker,gunakan informasi di .env.production untuk versi produksi dan gunakan informasi di file .env.development untuk akses supabase local
service yang ada adalah course service, auth service, booking service, user service, chatbot service, dan API-Gateway untuk ekspos endpoint keluar.
untuk testing di lingkungan docker gunakan akun ini jika perlu login akun admin: admin@shemamusic.com lalu password: Admin123!
dalam database ada beberapa schema seperti course.xxx auth.xxx booking.xxx (xxx adakah nama tablenya)
Setelah selesai melakukan perubahan buat laporannya di folder docs (ingat folder docs itu untuk dokumentasi semua laporan dan report) 
Ingat folder documentation yang ada didalam folder services/documentation itu bukan folder dokumentasi laporan md,itu adalah service yang berisi API documentation yang bisa diakses melalui browser
