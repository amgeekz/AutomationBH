# Panduan Deployment ke Vercel 🚀

Aplikasi **Digiflazz Cloud Automation** ini sekarang sudah dikonfigurasi sepenuhnya agar kompatibel untuk dijalankan dan diduplikasi ke **Vercel** sebagai aplikasi Serverless!

---

## 🛠️ Persiapan Penting (Harus Dibaca)

Sebelum mendeploy ke Vercel, ada dua tantangan utama arsitektur Serverless yang wajib Anda ketahui:

1. **Persistent cron scheduler (Latar Belakang):**
   - Di serverless (seperti Vercel), server mati/tidur otomatis jika tidak ada request. Oleh karena itu, library `node-cron` bawaan di dalam memory **tidak akan berjalan** secara otomatis.
   - **Solusinya:** Kami telah mengonfigurasi **Vercel Cron Jobs** di dalam file `vercel.json` Anda. Jaringan Vercel akan otomatis menembak endpoint HTTP `/api/automation/run-cron` setiap 10 menit sekali secara otonom!

2. **Puppeteer (Headless Browser / Chrome):**
   - Vercel memiliki batasan ukuran payload fungsi maksimal **50MB**. Chromium bawaan Puppeteer memiliki ukuran lebih dari **150MB**, sehingga **tidak bisa dipackage langsung ke Vercel** secara default pada paket gratis/Hobby.
   - **Solusi Alternatif di Vercel:**
     - Gunakan layanan cloud browser gratis/berbayar pihak ketiga seperti [Browserless.io](https://www.browserless.io/), [ScrapingBee](https://www.scrapingbee.com/), atau hosting Chrome sendiri.
     - Di `server.ts` Anda dapat memodifikasi baris `puppeteer.launch({...})` menjadi `puppeteer.connect({ browserWSEndpoint: 'wss://chrome.browserless.io?token=TOKEN_ANDA' })`.
   - **Rekomendasi Terbaik:** Jika Anda tidak ingin pusing menyetel Browser eksternal, deploy aplikasi ini ke **Railway**, **Render**, atau **Google Cloud Run** dengan kontainer Docker. Platform ini mendukung persistent Node.js dan menginstal Chrome secara native 100% instan!

---

## ⚙️ Langkah-Langkah Deploy ke Vercel

### Langkah 1: Hubungkan ke GitHub
1. Upload folder project ini ke repositori baru Anda di **GitHub** (private direkomendasikan karena menyimpan enkripsi config bisnis Anda).

### Langkah 2: Import Project ke Vercel
1. Masuk ke [Vercel Dashboard](https://vercel.com).
2. Klik **Add New...** -> **Project**.
3. Pilih repositori GitHub yang baru Anda buat.

### Langkah 3: Konfigurasi Environment Variables (PENTING)
Pada kolom **Environment Variables** di Vercel, tambahkan variabel berikut agar cron job berjalan aman:

- `CRON_SECRET` = *(Buat token acak bebas, contoh: `rahasia_cron_12345`)*
- `NODE_ENV` = `production`

> **Catatan Keamanan:** Token `CRON_SECRET` digunakan agar orang lain di internet tidak bisa menembak endpoint `/api/automation/run-cron` Anda sembarangan. Vercel akan menyertakan token ini secara aman di dalam request header atau parameter pencarian.

### Langkah 4: Klik Deploy!
1. Biarkan Build Command dan Install Command sesuai bawaan (`npm run build`).
2. Klik **Deploy** dan tunggu proses kompilasi selesai.
3. Selamat! Website Anda sekarang aktif di Vercel.

---

## ⏰ Cara Mengaktifkan Jadwal Cron 10 Menit di Vercel

Kami sudah menyertakan instruksi jadwal di `/vercel.json`:
```json
"crons": [
  {
    "path": "/api/automation/run-cron?secret=ISI_DENGAN_CRON_SECRET_ANDA",
    "schedule": "*/10 * * * *"
  }
]
```

1. Setelah berhasil dideploy ke Vercel, buka menu **Settings** pada project Anda di Vercel.
2. Pilih tab **Cron Jobs** di bilah sebelah kiri.
3. Anda akan melihat jadwal `*/10 * * * *` (Setiap 10 Menit) yang terdaftar.
4. Pastikan Anda mengedit query parameter `?secret=` agar sesuai dengan `CRON_SECRET` yang Anda buat pada langkah sebelumnya.
