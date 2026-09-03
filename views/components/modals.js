// Component: Modals (Merchant Form & Delete Confirmation)
function renderModals() {
    return `
    <!-- Modal Tambah / Edit Merchant & Scan QRIS Statis -->
    <div id="modal-merchant" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); z-index:9999; align-items:center; justify-content:center; padding:16px;">
        <div style="background:#0f172a; border:1px solid rgba(56,189,248,0.35); border-radius:20px; width:100%; max-width:640px; padding:28px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.8); position:relative; max-height:92vh; overflow-y:auto;">
            <button onclick="closeMerchantModal()" style="position:absolute; top:18px; right:18px; background:none; border:none; color:var(--text-muted); font-size:22px; cursor:pointer; line-height:1;">✕</button>

            <div style="display:flex; align-items:center; gap:12px; margin-bottom:22px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:16px;">
                <div style="width:44px; height:44px; border-radius:12px; background:rgba(56,189,248,0.15); border:1px solid rgba(56,189,248,0.3); display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0;">🏪</div>
                <div>
                    <h3 id="modal-merchant-title" style="font-size:17px; font-weight:800; color:#fff; margin:0;">➕ Tambah Merchant Baru</h3>
                    <p style="font-size:12px; color:var(--text-muted); margin:3px 0 0 0;">Isi data merchant dan unggah poster QRIS atau tempelkan string QRIS Statis.</p>
                </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:14px;">

                <!-- Merchant ID -->
                <div id="modal-m-id-row">
                    <label style="display:block; font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Merchant ID <span style="color:var(--accent-red);">*</span></label>
                    <input type="text" id="inp-m-id" placeholder="Contoh: G844728303 atau ID_TOKO_ANDA" style="width:100%; padding:10px 14px; background:#020617; border:1px solid #1e293b; border-radius:10px; color:var(--accent-cyan); font-family:'JetBrains Mono',monospace; font-weight:700; font-size:13px; outline:none;">
                    <div style="font-size:11px; color:var(--text-dim); margin-top:4px;">💡 Saat Edit, Merchant ID tidak bisa diubah (Primary Key).</div>
                </div>

                <!-- Nama Merchant & No HP -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Nama Merchant / Toko</label>
                        <input type="text" id="inp-m-name" placeholder="Contoh: Warung Pak Budi" style="width:100%; padding:10px 14px; background:#020617; border:1px solid #1e293b; border-radius:10px; color:#f8fafc; font-size:13px; outline:none;">
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Nomor HP GoBiz (untuk OTP)</label>
                        <input type="text" id="inp-m-phone" placeholder="Contoh: 081234567890" style="width:100%; padding:10px 14px; background:#020617; border:1px solid #1e293b; border-radius:10px; color:var(--accent-cyan); font-family:'JetBrains Mono',monospace; font-weight:700; font-size:13px; outline:none;">
                    </div>
                </div>

                <!-- Tipe & Kota — 2 kolom -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Provider / Tipe QRIS</label>
                        <select id="inp-m-type" style="width:100%; padding:10px 14px; background:#020617; border:1px solid #1e293b; border-radius:10px; color:#f8fafc; font-size:13px; outline:none;">
                            <option value="gopay">🟢 GoPay (GoBiz)</option>
                            <option value="dana">🔵 DANA</option>
                            <option value="ovo">🟣 OVO</option>
                            <option value="bca">🔵 BCA Mobile</option>
                            <option value="bni">🟠 BNI</option>
                            <option value="bri">🔵 BRI</option>
                            <option value="mandiri">🟡 Mandiri</option>
                            <option value="shopee">🟠 ShopeePay</option>
                            <option value="qris">⬛ QRIS (Umum)</option>
                        </select>
                    </div>
                    <div>
                        <label style="display:block; font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Kota / Lokasi</label>
                        <input type="text" id="inp-m-city" placeholder="Contoh: Jakarta Selatan" style="width:100%; padding:10px 14px; background:#020617; border:1px solid #1e293b; border-radius:10px; color:#f8fafc; font-size:13px; outline:none;">
                    </div>
                </div>

                <!-- Upload / Scan Poster QRIS -->
                <div>
                    <label style="display:block; font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Upload Gambar Poster QRIS Toko (Otomatis Ekstrak)</label>
                    <div style="border: 2px dashed rgba(56, 189, 248, 0.35); background: rgba(56, 189, 248, 0.04); border-radius: 12px; padding: 14px; text-align: center; cursor: pointer; transition: all 0.2s ease;" onclick="document.getElementById('file-qris-image').click()" onmouseover="this.style.borderColor='var(--accent-cyan)'" onmouseout="this.style.borderColor='rgba(56, 189, 248, 0.35)'">
                        <div style="font-size: 26px; margin-bottom: 4px;">🖼️</div>
                        <div style="font-size: 13px; font-weight: 700; color: var(--accent-cyan);">Pilih / Unggah Gambar Poster/Stiker QRIS</div>
                        <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Sistem akan membaca QR code & mengisi string di bawah secara otomatis</div>
                        <input type="file" id="file-qris-image" accept="image/*" style="display: none;" onchange="previewAndAutoScanQrisImage(event)">
                    </div>
                </div>

                <!-- Preview & Scan Progress Box -->
                <div id="qris-preview-container" style="display: none; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 12px; padding: 12px; text-align: center;">
                    <div style="display: flex; justify-content: center; margin-bottom: 8px;">
                        <img id="qris-preview-img" style="max-height: 160px; max-width: 100%; border-radius: 8px; border: 2px solid rgba(56, 189, 248, 0.4);" alt="Preview QRIS">
                    </div>
                    <div id="qris-scan-status" style="font-size: 12px; font-weight: 600; color: var(--accent-green);">⏳ Memindai Kode QRIS...</div>
                </div>

                <!-- String QRIS Statis -->
                <div>
                    <label style="display:block; font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">String QRIS Statis <span style="color:var(--accent-red);">*</span></label>
                    <textarea id="inp-m-qris" rows="4" placeholder="00020101021126610014COM.GO-JEK.WWW..." style="width:100%; padding:10px 14px; background:#020617; border:1px solid #1e293b; border-radius:10px; color:var(--accent-cyan); font-family:'JetBrains Mono',monospace; font-size:12px; outline:none; resize:vertical;"></textarea>
                    <div style="font-size:11px; color:var(--text-dim); margin-top:4px;">💡 String QRIS terisi otomatis dari gambar di atas atau input manual.</div>
                </div>

            </div>

            <div style="display:flex; gap:12px; justify-content:flex-end; margin-top:22px; padding-top:16px; border-top:1px solid rgba(255,255,255,0.07);">
                <button type="button" onclick="closeMerchantModal()" style="padding:9px 20px; background:#1e293b; border:1px solid #334155; border-radius:10px; color:#94a3b8; font-size:13px; font-weight:600; cursor:pointer;">Batal</button>
                <button type="button" id="btn-submit-merchant" onclick="submitMerchantModal()" style="padding:9px 22px; background:linear-gradient(135deg, #0284c7, #0369a1); border:none; border-radius:10px; color:#fff; font-size:13px; font-weight:700; cursor:pointer;">➕ Tambah Merchant</button>
            </div>
        </div>
    </div>

    <!-- Modal Konfirmasi Hapus Data (Custom Modal Confirm) -->
    <div id="modal-confirm-delete" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); z-index:999999; align-items:center; justify-content:center; padding:16px;">
        <div style="background:#0f172a; border:1px solid rgba(239,68,68,0.4); border-radius:20px; width:100%; max-width:440px; padding:28px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.9); text-align:center; position:relative;">
            <button onclick="closeConfirmDeleteModal()" style="position:absolute; top:16px; right:16px; background:none; border:none; color:var(--text-muted); font-size:20px; cursor:pointer; line-height:1;">✕</button>

            <div style="width:58px; height:58px; border-radius:50%; background:rgba(239,68,68,0.15); border:1.5px solid rgba(239,68,68,0.4); display:flex; align-items:center; justify-content:center; font-size:28px; margin:0 auto 16px auto;">
                ⚠️
            </div>

            <h3 id="del-modal-title" style="font-size:18px; font-weight:800; color:#fff; margin:0 0 8px 0;">Konfirmasi Hapus Data</h3>
            
            <p id="del-modal-body" style="font-size:13.5px; color:var(--text-muted); margin:0 0 20px 0; line-height:1.5;">
                Apakah Anda yakin ingin menghapus merchant <strong id="del-merchant-name-label" style="color:#fff;"></strong> (<code id="del-merchant-id-label" style="color:var(--accent-cyan);"></code>) secara permanen dari database?
            </p>

            <div style="display:flex; gap:12px; justify-content:center; margin-top:20px;">
                <button type="button" onclick="closeConfirmDeleteModal()" style="padding:10px 22px; background:#1e293b; border:1px solid #334155; border-radius:10px; color:#94a3b8; font-size:13px; font-weight:600; cursor:pointer;">Batal</button>
                <button type="button" id="btn-do-delete-merchant" onclick="executeDeleteMerchant()" style="padding:10px 22px; background:linear-gradient(135deg, #ef4444, #dc2626); border:none; border-radius:10px; color:#fff; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 4px 14px rgba(239,68,68,0.35);">🗑️ Ya, Hapus Data</button>
            </div>
        </div>
    </div>

    <!-- Modal Generate Order QRIS Dinamis Baru -->
    <div id="modal-create-order" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); z-index:9999; align-items:center; justify-content:center; padding:16px;">
        <div style="background:#0f172a; border:1px solid rgba(52,211,153,0.35); border-radius:20px; width:100%; max-width:540px; padding:28px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.8); position:relative; max-height:92vh; overflow-y:auto;">
            <button onclick="closeCreateOrderModal()" style="position:absolute; top:18px; right:18px; background:none; border:none; color:var(--text-muted); font-size:22px; cursor:pointer; line-height:1;">✕</button>

            <div style="display:flex; align-items:center; gap:12px; margin-bottom:22px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:16px;">
                <div style="width:44px; height:44px; border-radius:12px; background:rgba(52,211,153,0.15); border:1px solid rgba(52,211,153,0.3); display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0;">✨</div>
                <div>
                    <h3 style="font-size:17px; font-weight:800; color:#fff; margin:0;">✨ Cetak / Buat Order QRIS Dinamis Baru</h3>
                    <p style="font-size:12px; color:var(--text-muted); margin:3px 0 0 0;">Buat transaksi QRIS baru dengan kode unik otomatis & link checkout pembayaran.</p>
                </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:14px;">
                <!-- Nominal Pembayaran -->
                <div>
                    <label style="display:block; font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Nominal Pembayaran (Rp) <span style="color:#ef4444;">*</span></label>
                    <input type="number" id="modal-order-amount" placeholder="Contoh: 15000" style="width:100%; padding:11px 14px; background:#020617; border:1px solid #1e293b; border-radius:10px; color:#34d399; font-family:'JetBrains Mono',monospace; font-weight:800; font-size:16px; outline:none;">
                </div>

                <!-- Select Merchant -->
                <div>
                    <label style="display:block; font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Pilih Merchant GoPay</label>
                    <select id="modal-order-merchant" style="width:100%; padding:10px 14px; background:#020617; border:1px solid #1e293b; border-radius:10px; color:#f8fafc; font-size:13px; outline:none;">
                        <option value="">⏳ Memuat daftar merchant sesi aktif...</option>
                    </select>
                </div>

                <!-- Client Ref ID / Catatan -->
                <div>
                    <label style="display:block; font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Referensi Order / ID Pelanggan (Opsional)</label>
                    <input type="text" id="modal-order-ref" placeholder="Contoh: INV-20260903001" style="width:100%; padding:10px 14px; background:#020617; border:1px solid #1e293b; border-radius:10px; color:#f8fafc; font-size:13px; outline:none;">
                </div>

                <!-- Webhook Callback URL -->
                <div>
                    <label style="display:block; font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Webhook Callback URL (Opsional)</label>
                    <input type="url" id="modal-order-webhook" placeholder="https://website-anda.com/api/webhook" style="width:100%; padding:10px 14px; background:#020617; border:1px solid #1e293b; border-radius:10px; color:#f8fafc; font-size:13px; outline:none;">
                </div>
            </div>

            <div style="display:flex; gap:12px; justify-content:flex-end; margin-top:22px; padding-top:16px; border-top:1px solid rgba(255,255,255,0.07);">
                <button type="button" onclick="closeCreateOrderModal()" style="padding:9px 20px; background:#1e293b; border:1px solid #334155; border-radius:10px; color:#94a3b8; font-size:13px; font-weight:600; cursor:pointer;">Batal</button>
                <button type="button" id="btn-submit-create-order" onclick="submitCreateOrderModal()" style="padding:9px 22px; background:linear-gradient(135deg, #10b981, #059669); border:none; border-radius:10px; color:#fff; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 4px 14px rgba(16,185,129,0.35);">✨ Generate QRIS Dinamis</button>
            </div>
        </div>
    </div>

    <!-- Modal Login OTP GoBiz (2 Step Flow) -->
    <div id="modal-login-otp" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); z-index:99999; align-items:center; justify-content:center; padding:16px;">
        <div style="background:#0f172a; border:1px solid rgba(56,189,248,0.4); border-radius:20px; width:100%; max-width:480px; padding:28px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.9); position:relative;">
            <button onclick="closeLoginOtpModal()" style="position:absolute; top:18px; right:18px; background:none; border:none; color:var(--text-muted); font-size:22px; cursor:pointer; line-height:1;">✕</button>

            <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:14px;">
                <div style="width:44px; height:44px; border-radius:12px; background:rgba(56,189,248,0.15); border:1px solid rgba(56,189,248,0.3); display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0;">🔑</div>
                <div>
                    <h3 id="modal-otp-title" style="font-size:17px; font-weight:800; color:#fff; margin:0;">Login OTP Sesi GoBiz Merchant</h3>
                    <p id="modal-otp-subtitle" style="font-size:12px; color:var(--text-muted); margin:3px 0 0 0;">Hubungkan sesi akun GoBiz Merchant untuk terima pembayaran.</p>
                </div>
            </div>

            <!-- Step 1: Minta OTP -->
            <div id="modal-otp-step-1">
                <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:14px 16px; margin-bottom:16px;">
                    <div style="font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Merchant Target</div>
                    <div id="modal-otp-merchant-info" style="font-size:14px; font-weight:700; color:#38bdf8;">🏪 arabpay (ID: G844728303)</div>
                </div>

                <div style="margin-bottom:18px;">
                    <label style="display:block; font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Nomor HP GoBiz Terdaftar <span style="color:#ef4444;">*</span></label>
                    <input type="text" id="modal-inp-phone" placeholder="Contoh: 081234567890" style="width:100%; padding:11px 14px; background:#020617; border:1px solid #1e293b; border-radius:10px; color:#38bdf8; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:15px; outline:none;">
                    <div style="font-size:11px; color:#64748b; margin-top:4px;">💡 Kode OTP akan dikirim via SMS atau WhatsApp ke nomor ini.</div>
                </div>

                <button type="button" id="btn-modal-send-otp" onclick="submitModalRequestOtp()" style="width:100%; padding:11px; background:linear-gradient(135deg, #0284c7, #0369a1); border:none; border-radius:10px; color:#fff; font-size:14px; font-weight:700; cursor:pointer; box-shadow:0 4px 14px rgba(2,132,199,0.35);">
                    📲 Kirim Kode OTP (SMS / WA)
                </button>
            </div>

            <!-- Step 2: Input OTP -->
            <div id="modal-otp-step-2" style="display:none;">
                <div style="background:rgba(52,211,153,0.1); border:1px solid rgba(52,211,153,0.3); border-radius:12px; padding:12px 14px; margin-bottom:16px; text-align:center;">
                    <div style="font-size:12.5px; font-weight:600; color:#34d399;">✅ Kode OTP telah dikirimkan ke <strong id="modal-otp-sent-phone" style="color:#fff;">+628123...</strong></div>
                </div>

                <div style="margin-bottom:18px;">
                    <label style="display:block; font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px; text-align:center;">Masukkan Kode OTP GoBiz (4-6 Digit)</label>
                    <input type="text" id="modal-inp-otp-code" maxlength="6" placeholder="______" style="width:100%; padding:14px; background:#020617; border:1px solid #38bdf8; border-radius:12px; color:#fff; font-family:'JetBrains Mono',monospace; font-weight:800; font-size:26px; text-align:center; letter-spacing:8px; outline:none;">
                </div>

                <button type="button" id="btn-modal-verify-otp" onclick="submitModalVerifyOtp()" style="width:100%; padding:12px; background:linear-gradient(135deg, #10b981, #059669); border:none; border-radius:10px; color:#fff; font-size:14px; font-weight:700; cursor:pointer; box-shadow:0 4px 14px rgba(16,185,129,0.35); margin-bottom:12px;">
                    🔓 Verifikasi & Aktifkan Sesi GoBiz
                </button>

                <div style="text-align:center;">
                    <button type="button" id="btn-modal-resend-otp" onclick="resendModalOtp()" disabled style="background:none; border:none; color:#64748b; font-size:12px; font-weight:600; cursor:not-allowed;">
                        🔄 Kirim Ulang OTP (<span id="modal-resend-timer">02:00</span>)
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal: Tambah / Edit Client API (App-ID + App-Secret Pair) -->
    <div id="modal-add-api-client" style="display:none; position:fixed; inset:0; z-index:99999; background:rgba(2,6,23,0.85); backdrop-filter:blur(10px); align-items:center; justify-content:center; padding:16px;">
        <div style="background:#0f172a; border:1px solid rgba(56,189,248,0.3); border-radius:20px; max-width:480px; width:100%; padding:24px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.7); position:relative;">
            <button onclick="closeAddApiClientModal()" style="position:absolute; top:18px; right:18px; background:rgba(255,255,255,0.08); border:none; color:#94a3b8; width:30px; height:30px; border-radius:50%; font-size:16px; cursor:pointer;">✕</button>

            <div style="display:flex; align-items:center; gap:14px; margin-bottom:20px; padding-bottom:14px; border-bottom:1px solid rgba(255,255,255,0.08);">
                <div style="width:42px; height:42px; border-radius:12px; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); display:flex; align-items:center; justify-content:center; font-size:20px;">
                    🔑
                </div>
                <div>
                    <h3 id="modal-client-title" style="font-size:17px; font-weight:800; color:#fff; margin:0;">Register Akun API Client Baru</h3>
                    <p style="font-size:12px; color:var(--text-muted); margin:3px 0 0 0;">Buat otorisasi pasangan App-ID (Username) & App-Secret (Password).</p>
                </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:14px;">
                <!-- App ID -->
                <div>
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
                        <label style="font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px;">App-ID (Username API) <span style="color:#ef4444;">*</span></label>
                        <button type="button" onclick="generateAutoAppId()" style="background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.3); color:#38bdf8; font-size:11px; font-weight:700; padding:2px 9px; border-radius:6px; cursor:pointer;" title="Generate ID otomatis">⚡ Auto Generate</button>
                    </div>
                    <input type="text" id="modal-client-app-id" placeholder="Contoh: TokoOnline, BotKasir, atau klik Auto Generate" style="width:100%; padding:10px 14px; background:#020617; border:1px solid #1e293b; border-radius:10px; color:#38bdf8; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:14px; outline:none;">
                </div>

                <!-- App Secret -->
                <div>
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
                        <label style="font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px;">App-Secret (Password API) <span style="color:#ef4444;">*</span></label>
                        <button type="button" onclick="generateAutoAppSecret()" style="background:rgba(251,191,36,0.12); border:1px solid rgba(251,191,36,0.3); color:#fbbf24; font-size:11px; font-weight:700; padding:2px 9px; border-radius:6px; cursor:pointer;" title="Generate Secret Key kuat secara acak">🔑 Generate Key</button>
                    </div>
                    <div style="position:relative; display:flex; align-items:center;">
                        <input type="text" id="modal-client-app-secret" placeholder="Contoh: secret_pass_123 atau klik Generate Key" style="width:100%; padding:10px 14px; padding-right:75px; background:#020617; border:1px solid #1e293b; border-radius:10px; color:#fbbf24; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:13px; outline:none;">
                        <button type="button" onclick="copySecretToClipboard()" style="position:absolute; right:6px; background:#1e293b; border:1px solid rgba(255,255,255,0.1); color:#94a3b8; font-size:11px; font-weight:600; padding:4px 9px; border-radius:6px; cursor:pointer;" title="Salin Secret Ke Clipboard">📋 Salin</button>
                    </div>
                </div>

                <!-- Client Name / Deskripsi -->
                <div>
                    <label style="display:block; font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Nama Aplikasi / Deskripsi Client (Opsional)</label>
                    <input type="text" id="modal-client-name" placeholder="Contoh: Website Utama Toko ABC" style="width:100%; padding:10px 14px; background:#020617; border:1px solid #1e293b; border-radius:10px; color:#f8fafc; font-size:13px; outline:none;">
                </div>

                <!-- Status Aktif / Nonaktif -->
                <div>
                    <label style="display:block; font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Status Otorisasi</label>
                    <select id="modal-client-status" style="width:100%; padding:10px 14px; background:#020617; border:1px solid #1e293b; border-radius:10px; color:#f8fafc; font-size:13px; outline:none;">
                        <option value="true">🟢 Aktif (Diizinkan Membuat QRIS & Akses API)</option>
                        <option value="false">🔴 Non-Aktif (Diblokir)</option>
                    </select>
                </div>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:22px; padding-top:14px; border-top:1px solid rgba(255,255,255,0.08);">
                <button type="button" onclick="closeAddApiClientModal()" style="padding:9px 16px; background:#1e293b; border:none; border-radius:10px; color:#94a3b8; font-size:13px; font-weight:600; cursor:pointer;">Batal</button>
                <button type="button" onclick="submitModalSaveApiClient()" style="padding:9px 20px; background:linear-gradient(135deg, #10b981, #059669); border:none; border-radius:10px; color:#fff; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 4px 14px rgba(16,185,129,0.35);">💾 Simpan Akun API Client</button>
            </div>
        </div>
    </div>
    `;
}

module.exports = renderModals;
