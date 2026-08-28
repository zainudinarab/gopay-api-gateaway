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
> 📣 **DOKUMENTASI LENGKAP ENDPOINTS REST API**
> Gateway ini menyediakan API lengkap untuk pencetakan QRIS, polling frontend, callback webhook, manajemen order, mutasi GoJek, serta administrasi sesi GoBiz.

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

## 🌐 Dokumentasi Lengkap API Endpoints

### 🔐 Autentikasi Request Client
Setiap request ke endpoint bertanda **[Client API]** wajib melampirkan:
- `app_id` (Wajib terdaftar pada `ALLOWED_APP_IDS` di `.env`)
- `app_secret` (Sesuai `APP_SECRET` di `.env`)

*Parameter dapat dikirim melalui **HTTP Headers** (`x-app-id` & `x-app-secret`), **JSON Body**, atau **URL Query Parameters** (`api_key` / `app_secret`).*

---

### 🛍️ 1. API Transaksi & QRIS Client

#### **A. Buat QRIS Dinamis (`POST` / `GET /create-qris`)** [Client API]
Mencetak QRIS EMVCo dinamis dengan penguncian nominal & kode unik otomatis.

- **Headers**:
  - `x-app-id: App1`
  - `x-app-secret: secret123`
- **Request Body (JSON)**:
```json
{
  "app_id": "App1",
  "app_secret": "secret123",
  "amount": 10000,
  "ref_id": "INV-20260828-0001",
  "webhook_url": "https://website-anda.com/api/callback",
  "expires_in_hours": 12
}
```
- **Response Success (200 OK)**:
```json
{
  "success": true,
  "data": {
    "qris_id": "QR-9C6TS3RC",
    "trx_id": "TRX-4UR9CRCC",
    "app_id": "App1",
    "client_ref_id": "INV-20260828-0001",
    "base_amount": 10000,
    "unique_code": 14,
    "amount": 10014,
    "qris_string": "000201010212...",
    "qris_image_url": "http://localhost:3000/qr/QR-9C6TS3RC.png",
    "qris_image_base64": "data:image/png;base64,iVBORw0KG...",
    "checkout_url": "http://localhost:3000/qr/QR-9C6TS3RC",
    "webhook_url": "https://website-anda.com/api/callback",
    "expires_at": "2026-08-28T12:00:00.000Z",
    "expires_in_hours": 12
  }
}
```

---

#### **B. Cek Public Status untuk Frontend Polling (`GET /api/qr-status/:qris_id`)** [Public Endpoint]
*Aman dipanggil langsung dari Frontend Web/Mobile tanpa perlu `app_secret`.*

- **URL Parameters**: `:qris_id` (Contoh: `/api/qr-status/QR-9C6TS3RC`)
- **Response Success (Status PENDING)**:
```json
{
  "success": true,
  "paid": false,
  "status": "PENDING"
}
```
- **Response Success (Status PAID)**:
```json
{
  "success": true,
  "paid": true,
  "status": "PAID",
  "transaction": {
    "transaction_id": "01a03c85-...",
    "order_id": "QRIS-042026...",
    "amount": 10014,
    "payer_issuer": "AirPay Shopee / BCA / GoPay",
    "payment_type": "QRIS",
    "transaction_time": "2026-08-28T10:15:00+07:00"
  }
}
```

---

#### **C. Cek Status Pembayaran Manual Backend (`GET` / `POST /api/check-payment`)** [Client API]
Memeriksa status pembayaran transaksi dari backend Anda.

- **Query Params / Body**: `qris_id` atau `trx_id` atau `ref_id`
- **Headers / Query**: `api_key=secret123` & `app_id=App1`
- **Response Success**:
```json
{
  "success": true,
  "paid": true,
  "status": "PAID",
  "amount": 10014,
  "client_ref_id": "INV-20260828-0001",
  "paid_at": "2026-08-28T10:15:00+07:00"
}
```

---

#### **D. Skema Payload Notifikasi Webhook (`webhook_url`)** [Callback Server]
Dipanggil otomatis via HTTP POST ke `webhook_url` Anda begitu status pembayaran menjadi `PAID`:

```json
{
  "event": "payment.success",
  "qris_id": "QR-9C6TS3RC",
  "trx_id": "TRX-4UR9CRCC",
  "client_ref_id": "INV-20260828-0001",
  "status": "PAID",
  "amount": 10014,
  "base_amount": 10000,
  "unique_code": 14,
  "transaction": {
    "transaction_id": "01a03c85-...",
    "order_id": "QRIS-042026...",
    "amount": 10014,
    "payer_issuer": "AirPay Shopee / BCA",
    "payment_type": "QRIS",
    "transaction_time": "2026-08-28T10:15:00+07:00"
  }
}
```

---

### 📦 2. API Manajemen Order & Transaksi

#### **A. Mengambil Seluruh Order QRIS (`GET /api/orders`)** [Client/Admin API]
- **Query Params**: `limit=50&api_key=secret123`
- **Response Success**:
```json
{
  "success": true,
  "data": [
    {
      "qrisId": "QR-9C6TS3RC",
      "trxId": "TRX-4UR9CRCC",
      "appId": "App1",
      "clientRefId": "INV-20260828-0001",
      "amount": 10014,
      "status": "PAID",
      "webhookStatus": "SUCCESS",
      "createdAt": "2026-08-28T10:00:00.000Z"
    }
  ]
}
```

---

#### **B. Validasi Manual / Jodohkan Transaksi (`POST /api/orders/manual-claim`)** [Admin API]
Validasi lunas manual untuk order `PENDING` atau menghubungkan ID transaksi GoJek.

- **Headers**: `x-api-key: admin123456`
- **Body JSON**:
```json
{
  "qris_id": "QR-9C6TS3RC",
  "transaction_id": "01a03c85-...",
  "notes": "Klaim manual via Admin"
}
```
- **Response Success**:
```json
{
  "success": true,
  "message": "Order QR-9C6TS3RC berhasil divalidasi LUNAS secara manual!"
}
```

---

#### **C. Reset / Hapus Seluruh Data Order (`POST` / `DELETE /api/orders/clear`)** [Admin API]
Menghapus seluruh riwayat order QRIS dan antrian webhook di database SQLite.

- **Headers**: `x-api-key: admin123456`
- **Response Success**:
```json
{
  "success": true,
  "message": "Seluruh data order QRIS berhasil dihapus dari database!"
}
```

---

### 💸 3. API Mutasi GoJek & System Logs

#### **A. Mengambil Mutasi Masuk GoJek (`GET /transactions`)** [Admin API]
- **Query Params**: `pageSize=50&api_key=admin123456`
- **Response Success**:
```json
{
  "success": true,
  "total_amount": 500000,
  "data": {
    "transactions": [
      {
        "transaction_id": "01a03c85-...",
        "order_id": "QRIS-042026...",
        "issuer": "AirPay Shopee",
        "amount": 10014,
        "status": "success",
        "time": "2026-08-28T10:15:00+07:00",
        "qris_id": "QR-9C6TS3RC"
      }
    ]
  }
}
```

---

#### **B. Mengambil Log Antrian Webhook (`GET /api/webhooks`)** [Admin API]
- **Query Params**: `limit=50&api_key=admin123456`
- **Response Success**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "qrisId": "QR-9C6TS3RC",
      "webhookUrl": "https://website-anda.com/api/callback",
      "attempts": 1,
      "maxAttempts": 3,
      "status": "SUCCESS",
      "lastError": null
    }
  ]
}
```

---

#### **C. Real-Time System Log Monitor (`GET /api/logs`)** [Admin API]
- **Query Params**: `api_key=admin123456`
- **Response Success**:
```json
{
  "success": true,
  "logs": [
    {
      "timestamp": "2026-08-28T10:15:00.000Z",
      "level": "INFO",
      "message": "QRIS Dinamis dibuat | TRX-ID: TRX-4UR9CRCC | App-ID: App1"
    }
  ]
}
```

---

### 🔑 4. API Autentikasi Sesi GoBiz Merchant

#### **A. Verifikasi Password Admin Portal (`POST /api/login/admin-auth`)**
```json
// Body: { "admin_password": "admin123456" }
{ "success": true, "message": "Password Admin Benar" }
```

#### **B. Request OTP SMS/WA GoBiz (`POST /api/login/request-otp`)**
```json
// Headers: x-admin-password: admin123456
// Body: { "phone": "08123456789" }
{ "success": true, "message": "Kode OTP berhasil dikirimkan via SMS/WA!" }
```

#### **C. Verifikasi OTP GoBiz (`POST /api/login/verify-otp`)**
```json
// Headers: x-admin-password: admin123456
// Body: { "otp_code": "1234" }
{ "success": true, "message": "Sesi GoPay Merchant Berhasil Diaktifkan!" }
```

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
