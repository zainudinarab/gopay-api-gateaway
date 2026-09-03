// Component: Tab 5 - Dokumentasi API Gateway (Tailwind Redesign)
function renderDocsTab() {
    return `
    <div class="tab-content" id="tab-docs">
        <div class="space-y-6">
            <!-- Header Panel -->
            <div class="p-6 bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-xl">
                <div class="flex items-center gap-3 mb-2">
                    <div class="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 text-xl font-bold">📖</div>
                    <div>
                        <h3 class="text-xl font-extrabold text-white tracking-tight">Dokumentasi & Integrasi REST API Gateway</h3>
                        <p class="text-xs text-slate-400">Panduan integrasi pengujian pembayaran QRIS GoPay Partner API Gateway untuk Developer & Third-Party Apps.</p>
                    </div>
                </div>
            </div>

            <!-- API Endpoints Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

                <!-- Endpoint 1: Create Dynamic QRIS -->
                <div class="p-6 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl space-y-4">
                    <div class="flex items-center justify-between">
                        <span class="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-extrabold font-mono">POST</span>
                        <code class="text-xs font-mono text-slate-300">/api/create-qris</code>
                    </div>
                    <div>
                        <h4 class="text-sm font-bold text-white">1. Terbitkan Order QRIS Dinamis</h4>
                        <p class="text-xs text-slate-400 mt-1">Menerbitkan QRIS dinamis dengan penambahan kode unik otomatis untuk validasi mutasi instan.</p>
                    </div>
                    <div class="space-y-1.5">
                        <div class="text-[11px] font-bold uppercase text-slate-400">Request Headers</div>
                        <pre class="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11.5px] font-mono text-sky-400 overflow-x-auto">Content-Type: application/json
x-api-key: [MASTER_ADMIN_PASSWORD]
x-app-id: [NAMA_APLIKASI_ANDA]</pre>
                    </div>
                    <div class="space-y-1.5">
                        <div class="text-[11px] font-bold uppercase text-slate-400">Request Body (JSON)</div>
                        <pre class="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11.5px] font-mono text-emerald-400 overflow-x-auto">{
  "amount": 50000,
  "client_ref_id": "ORDER-10293",
  "merchant_id": "G844728303",
  "callback_url": "https://website-anda.com/webhook"
}</pre>
                    </div>
                </div>

                <!-- Endpoint 2: Check Order Status -->
                <div class="p-6 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl space-y-4">
                    <div class="flex items-center justify-between">
                        <span class="px-2.5 py-1 rounded-md bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-extrabold font-mono">GET</span>
                        <code class="text-xs font-mono text-slate-300">/api/order-status/:qrisId</code>
                    </div>
                    <div>
                        <h4 class="text-sm font-bold text-white">2. Cek Status Pembayaran QRIS</h4>
                        <p class="text-xs text-slate-400 mt-1">Memeriksa status pembayaran order QRIS berdasarkan QRIS ID.</p>
                    </div>
                    <div class="space-y-1.5">
                        <div class="text-[11px] font-bold uppercase text-slate-400">cURL Command</div>
                        <pre class="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11.5px] font-mono text-amber-400 overflow-x-auto">curl -X GET "http://localhost:3000/api/order-status/QR-NHMT8NZZ" \
  -H "x-api-key: admin123456"</pre>
                    </div>
                    <div class="space-y-1.5">
                        <div class="text-[11px] font-bold uppercase text-slate-400">Response (JSON)</div>
                        <pre class="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11.5px] font-mono text-slate-300 overflow-x-auto">{
  "success": true,
  "status": "PAID",
  "amount": 50000,
  "unique_code": 7,
  "final_amount": 50007,
  "paid_at": "2026-09-02T14:00:00Z"
}</pre>
                    </div>
                </div>

            </div>

            <!-- Webhook Callback Specification -->
            <div class="p-6 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl space-y-4">
                <h4 class="text-base font-bold text-white flex items-center gap-2">
                    <span>📡</span> Spestifikasi Webhook Callback HTTP POST
                </h4>
                <p class="text-xs text-slate-400">Saat transaksi terdeteksi masuk dari GoJek API, gateway akan langsung mengirimkan notifikasi HTTP POST ke <code class="text-sky-400">callback_url</code> Anda secara otomatis dengan payload berikut:</p>

                <pre class="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-xs font-mono text-emerald-400 overflow-x-auto">{
  "event": "payment.success",
  "qris_id": "QR-NHMT8NZZ",
  "client_ref_id": "ORDER-10293",
  "amount": 50000,
  "unique_code": 7,
  "final_amount": 50007,
  "merchant_id": "G844728303",
  "transaction_id": "10002938491823",
  "paid_at": "2026-09-02T16:24:34Z"
}</pre>
            </div>
        </div>
    </div>
    `;
}

module.exports = renderDocsTab;
