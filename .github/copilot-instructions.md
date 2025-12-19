Semua program dijalankan melalui docker, akses database melalui docker, cloudflare melalui docker, setiap services dijadikan image dan dijalankan melalui docker.
environment library yang digunakan adalah bun 
environment semua services diatur di docker-compose.yml dan docker-compose.override.yml
semua service menggunakan image yang mounting ke codebase jadi jika ganti config cukup restart dan build containernya saja.
User menggunakan windows.
Auth service itu hanya bisa digunakan untuk admin saja. Siswa itu hanya bisa regist course
Untuk testing service yang sudah dibuat jangan pakai mock data tapi langsung saja data real pakai supabase remote
Untuk perubahan database tidak perlu membuat script migrasi, langsung akses supabase remote saja
Untuk akses database gunakan supabase remote gunakan mcp supabase atau gunakan file scripts/db-access.js untuk akses nya
service yang ada adalah auth service, booking service, course service, admin service, recommendation service, dan API-Gateway untuk ekspos endpoint keluar.
untuk testing di lingkungan docker gunakan akun ini jika perlu login akun admin: k423@gmail.com lalu password: Kiana423
dalam database ada beberapa schema seperti course.xxx auth.xxx booking.xxx (xxx adakah nama tablenya)
Jika membuat script untuk testing gunakan folder scripts untuk penempatan scriptnya, jangan letakkan di root projek
Setelah selesai melakukan perubahan buat laporannya di folder docs (ingat folder docs itu untuk dokumentasi semua laporan dan report) yang berada di root projek
Ingat folder documentation yang ada didalam folder services/documentation itu bukan folder dokumentasi laporan md,itu adalah service yang berisi API documentation yang bisa diakses melalui browser
