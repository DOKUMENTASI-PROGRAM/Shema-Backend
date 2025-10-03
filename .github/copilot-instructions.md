Semua program dijalankan melalui docker, akses database melalui docker, cloudflare melalui docker, setiap services dijadikan image dan dijalankan melalui docker.
environment semua services diatur di docker-compose.yml dan docker-compose.override.yml
semua service menggunakan image yang mounting ke codebase jadi jika ganti config cukup restart containernya saja.
User menggunakan Xubuntu.
Untuk perubahan database tidak perlu membuat script migrasi, langsung akses postgresnya saja
AKses postgres dilakukan melalui docker, dengan akun db atma_user dan nama db atma_db
service yang ada adalah archive service, auth service, analysis worker, assessment service, chatbot service, notification service, admin service dan API-Gateway untuk ekspos endpoint keluar.
untuk testing di lingkungan docker gunakan akun ini jika perlu login email = kasykoi@gmail.com dengan password = Anjas123
akun admin pakai akun: superadmin lalu password: admin123
dalam database ada beberapa schema seperti archive.xxx auth.xxx assessment.xxx (xxx adakah nama tablenya)
tabel yang sering dipakai adalah archive.analysis_jobs, archive._analysis_results dan auth.users
Setelah selesai melakukan perubahan buat laporannya di folder docs