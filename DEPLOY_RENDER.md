# 🚀 Panduan Lengkap Deployment ke Render.com (100% Gratis & Stabil)

Karena aplikasi Anda menggunakan **Puppeteer (web scraping)** dan membutuhkan **penjadwalan (Cron/Scheduler)**, **Render.com** dengan metode **Docker** adalah pilihan terbaik yang gratis dan stabil.

Dengan Docker, Render akan otomatis menginstal browser Google Chrome/Chromium versi Linux yang stabil beserta semua library sistem operasi pendukungnya.

---

## 📋 Prasyarat Sebelum Memulai
1. Memiliki akun [GitHub](https://github.com).
2. Memiliki akun [Render.com](https://render.com) (bisa login langsung pakai akun GitHub Anda).

---

## 🛠️ Langkah-Langkah Deployment

### Langkah 1: Upload Kode Anda ke GitHub
1. Pastikan semua file proyek ini (terutama file `Dockerfile`, `package.json`, dan `server.ts`) sudah ada di dalam repositori GitHub Anda.
2. Repositori boleh diatur sebagai **Private** maupun **Public**.

### Langkah 2: Buat Web Service baru di Render
1. Masuk ke Dashboard [Render.com](https://dashboard.render.com).
2. Klik tombol **New +** di kanan atas, lalu pilih **Web Service**.
3. Di halaman berikutnya, hubungkan akun GitHub Anda (jika belum) dan pilih repositori proyek ini.

### Langkah 3: Konfigurasi Deployment di Hub Render
Pada halaman pengisian detail proyek, gunakan konfigurasi berikut:
* **Name:** *Tentukan Nama Aplikasi Anda* (misal: `alat-otomatisasi-saya`)
* **Region:** Pilih wilayah terdekat (default: *Singapore* atau *Oregon*).
* **Branch:** `main` (atau branch utama repositori Anda).
* **Runtime:** Pilih **Docker** (Sangat penting! Jangan pilih Node. Render akan mendeteksi file `Dockerfile` yang sudah saya siapkan dan menginstal Chromium secara otomatis).
* **Instance Type:** Pilih **Free** ($0/month).

### Langkah 4: Masukkan Environment Variables (Opsional)
Jika aplikasi Anda memerlukan variable kunci API (seperti Gemini, Token Digiflazz, dll):
1. Scroll ke bawah dan klik tombol **Advanced**.
2. Klik **Add Environment Variable**.
3. Masukkan key dan value rahasia Anda di sini (misal: `GEMINI_API_KEY` = `isi_key_anda`).

### Langkah 5: Jalankan Deployment!
1. Klik tombol **Deploy Web Service** di bagian paling bawah.
2. Render akan mulai mengunduh file, membangun Docker image (menginstal Chromium, dependencies, dan membuild aplikasi React). Proses ini memakan waktu sekitar **2–4 menit** pada rilis pertama.
3. Setelah selesai, Anda akan melihat log `[Proxy Server] running on http://localhost:3000` (atau port dinamis Render) dan status web service akan berubah menjadi **Live**!
4. URL aplikasi gratis Anda akan muncul di bagian kiri atas halaman detail Render (berakhir dengan `.onrender.com`).

---

## ⏰ Tips Agar Jadwal Jeda/Cron Berjalan Terus di Render Free Tier
Pada Render Free Tier, server/kontainer akan "tidur" (*spin down*) secara otomatis apabila tidak menerima aktivitas/kunjungan selama **15 menit**. Saat tertidur, scheduler internal (`node-cron`) juga akan ikut berhenti sementara sampai ada pengunjung baru yang membangunkan server.

**Trik Gratis untuk Menjaga Server Tetap Bangun 24/7:**
Anda bisa menggunakan layanan pihak ketiga yang 100% gratis seperti **UptimeRobot** atau **Cron-Job.org** untuk mengirimkan permintaan ping (request HTTP) ke URL aplikasi Render Anda setiap 10–12 menit sekali:

1. Daftar di [UptimeRobot](https://uptimerobot.com) atau [Cron-Job.org](https://cron-job.org) secara gratis.
2. Buat monitor jenis **HTTP(s)** baru.
3. Masukkan URL aplikasi Render Anda (misalnya: `https://xxxx.onrender.com/api/health`).
4. Atur interval pemantauan setiap **10 menit**.
5. Layanan ini akan "menembak" URL Anda secara rutin sehingga Render menganggap server terus aktif sepanjang hari dan **Scheduler / Sync otomatis Anda akan berjalan terus-menerus 24 jam tanpa henti!**
