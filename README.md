# GoPay Merchant Gateway

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18.x-339933?logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Database-SQLite%20(WAL)-blue?logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Auth-Web%20UI%20%7C%20OTP-00AED9" alt="OTP Web UI" />
  <img src="https://img.shields.io/badge/QRIS-EMVCo-red" alt="QRIS" />
  <img src="https://img.shields.io/badge/Webhook-Queue%20Worker-green" alt="Webhook Queue" />
  <img src="https://img.shields.io/badge/Deploy-VPS%20%7C%20Docker%20%7C%20cPanel-orange" alt="Deploy Options" />
</p>

API Gateway self-hosted berbasis Node.js & SQLite untuk otomatisasi cek transaksi, cetak QRIS dinamis, notifikasi webhook otomatis, manajemen sesi GoBiz Merchant, serta **Admin Control Panel UI** modern dengan **Live System Log Monitor**.

---

> [!TIP]
> 📣 **UPDATE TERBARU: Modern Admin Control Panel, Live System Log Monitor & Strict API Access Security**
> Gateway ini dilengkapi dengan **Dashboard Control Panel dengan Navigasi Sidebar**, **Live Terminal System Logs Monitor (`/api/logs`)**, **Pemisahan Ketat Akses Admin (`ADMIN_PASSWORD`) vs Client (`APP_SECRET`)**, serta **Background Webhook Queue Worker dengan Retry Otomatis (3x)**!

> [!CAUTION]
> 🚨 **PERSYARATAN DEPLOYMENT (VPS / cPanel / Docker)**
> Gateway ini **dapat di-deploy di VPS Linux, Docker Container, atau cPanel Hosting** yang memiliki penyimpanan permanen 24/7.
> **DILARANG MENGGUNAKAN HOSTING SERVERLESS GRATISAN** (seperti Render Free, Vercel, Netlify) karena container akan *sleep* dan menghapus file sesi (`.GOPAY_SESI_JANGAN_DIHAPUS.json`), yang mengakibatkan sesi hangus.

---

## ✨ Fitur Utama

- 💻 **Modern Admin Control Panel UI (`/login`)** — Antarmuka dashboard panel dengan navigasi sidebar kiri, top status bar, kartu statistik KPI, dan modal interaktif.
- 📺 **Live System Log Monitor (`/api/logs`)** — Konsol terminal live real-time di Admin Panel untuk memantau log aktivitas background worker (Reconciler, Webhook Queue, Session Keep-Alive), API request, dan error.
- 🔒 **Proteksi Akses Keamanan Ketat (`ADMIN_PASSWORD` vs `APP_SECRET`)** — Pemisahan hak akses penuh Admin (`ADMIN_PASSWORD`) dan kunci aplikasi klien (`APP_SECRET`). Mencegah privilege escalation dari pihak ketiga.
- 🚪 **Logout Admin Portal vs Hapus Sesi GoPay** — Pemisahan yang jelas antara keluar dari halaman web portal admin (`lockPortalAdmin`) dan memutuskan sesi merchant GoPay (`logoutSession`).
- 🗄️ **Database SQLite Permanen (`gateway.db`)** — Operasi dalam mode WAL (Write-Ahead Logging). Riwayat order & klaim pembayaran tersimpan utuh walau server di-restart.
- 🔢 **Kode Unik Kecil (1–99 Rp) dengan Karantina 24 Jam** — 100% bebas konflik & anti-tertukar. Kode unik dikarantina 24 jam per nominal dasar.
- ⚡ **Cache Mutasi 10 Detik & Single-Flight Debouncing** — Panggilan ke GoJek API dibatasi maksimal 1x per 10 detik (~6x/menit), bebas dari rate limit & anti-banned.
- ⏰ **Proteksi Expiry Window + Grace Period (+2 Menit)** — Transaksi telat (>5m) diabaikan agar tidak salah masuk ke order pembeli baru.
- 🧾 **QRIS Dinamis (EMVCo) & Gambar Base64 (`qris_image_base64`)** — Mengembalikan string EMVCo, URL checkout, gambar PNG, dan Data URI Base64 siap pakai.
- 🤖 **Background Auto-Reconciler Worker** — Secara otomatis mencocokkan transaksi tanpa pemilik (`qris_id: null`) dengan order `PENDING` di background setiap 5 detik tanpa perlu user refresh web!
- 🛠️ **Validasi Manual Admin & Jodohkan Transaksi** — Memungkinkan Admin memvalidasi order `PENDING`/`EXPIRED` atau menjodohkan ID transaksi GoJek secara manual lewat Dashboard Admin dan otomatis memicu pengiriman Webhook.
- 🔔 **Background Webhook Queue Worker dengan Retry Engine (3x)** — Mengirim notifikasi HTTP POST otomatis ke Pihak Ketiga saat status `PAID` dengan percobaan ulang 3x jika server Pihak Ketiga sempat down.
- 🔖 **ID Transaksi Pihak Ketiga (`client_ref_id`)** — Menyimpan ID Invoice Pihak Ketiga dan mengembalikannya pada notifikasi Webhook.

---

## 🛠️ Konfigurasi `.env`

```env
PORT=3000
APP_SECRET=secret123
ALLOWED_APP_IDS=App1,App2,Aplikasi_TokoA,Aplikasi_TokoB
GOPAY_STATIC_QRIS=00020101021126610014COM.GO-JEK.WWW...
GOPAY_MERCHANT_ID=G844728303
ENABLE_UNIQUE_CODE=true
MIN_UNIQUE_CODE=1
MAX_UNIQUE_CODE=99
ADMIN_PASSWORD=admin123456
```

---

## 🌐 Dokumentasi API Endpoints

### 1. Buat QRIS Dinamis (`POST` / `GET /create-qris`)
Setiap request **wajib** menyertakan parameter `app_id` (yang terdaftar di `ALLOWED_APP_IDS`) dan `app_secret` (`APP_SECRET`).

Headers (opsional jika dikirim via Header):
- `x-app-id: App1`
- `x-app-secret: secret123`

```json
// Request Body / Query Params
{
  "app_id": "App1",
  "app_secret": "secret123",
  "amount": 10000,
  "ref_id": "INV-20260826-0001",
  "webhook_url": "https://pihak-ketiga.com/callback"
}
```

```json
// Response JSON
{
  "success": true,
  "data": {
    "qris_id": "QR-9C6TS3RC",
    "trx_id": "TRX-4UR9CRCC",
    "app_id": "App1",
    "client_ref_id": "INV-20260826-0001",
    "base_amount": 10000,
    "unique_code": 14,
    "amount": 10014,
    "qris_string": "000201010212...",
    "qris_image_url": "http://localhost:3000/qr/QR-9C6TS3RC.png",
    "qris_image_base64": "data:image/png;base64,iVBORw0KG...",
    "checkout_url": "http://localhost:3000/qr/QR-9C6TS3RC",
    "webhook_url": "https://pihak-ketiga.com/callback",
    "expires_at": "2026-08-28T01:46:12.442Z",
    "expires_in_hours": 12
  }
}
```

---

### 2. Cek Public Status untuk Frontend Polling (`GET /api/qr-status/:qris_id`)
*TIDAK MEMERLUKAN APP_SECRET / APP_ID* (Aman untuk Frontend Web/Mobile App).

```json
// Response PAID
{
  "success": true,
  "paid": true,
  "status": "PAID",
  "transaction": {
    "transaction_id": "01a03c85-...",
    "order_id": "QRIS-042026...",
    "amount": 10014,
    "payer_issuer": "GoPay / Bank",
    "payment_type": "QRIS",
    "transaction_time": "2026-08-26T14:00:15+07:00"
  }
}
```

---

### 3. Format Webhook Callback Payload ke Pihak Ketiga (saat LUNAS)
```json
{
  "event": "payment.success",
  "qris_id": "QR-9C6TS3RC",
  "trx_id": "TRX-4UR9CRCC",
  "client_ref_id": "INV-20260826-0001",
  "status": "PAID",
  "amount": 10014,
  "base_amount": 10000,
  "unique_code": 14,
  "transaction": {
    "transaction_id": "01a03c85-...",
    "order_id": "QRIS-042026...",
    "amount": 10014,
    "payer_issuer": "GoPay / Bank",
    "payment_type": "QRIS",
    "transaction_time": "2026-08-26T14:00:15+07:00"
  }
}
```

---

### 4. Manajemen Admin Panel (`http://localhost:3000/login`)
- **Layar Kunci**: Masukkan `ADMIN_PASSWORD` (default: `admin123456`).
- **Sidebar Navigation**: Akses Order QRIS, Sesi GoBiz, Antrian Webhook, Mutasi GoJek, Live System Logs, & Docs API.
- **Input Nomor HP & OTP**: Aktivasi Sesi GoBiz Merchant secara langsung via Web UI.

---

## 🚀 Deployment ke VPS / Docker

### Docker Compose
```bash
docker-compose up -d
```

### VPS Linux (PM2)
```bash
npm install -g pm2
pm2 start server.js --name "gopay-gateway"
pm2 save
```
