// Component: Tab 1 - Sesi & Multi-Merchant Management (Clean & Modern Layout)
function renderAuthTab(sessionExists, merchantSession) {
    return `
    <div class="tab-content" id="tab-auth">
        <!-- Workflow Banner Guide -->
        <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 16px; padding: 20px 24px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; box-shadow: 0 10px 30px -5px rgba(0,0,0,0.4);">
            <div style="display: flex; align-items: center; gap: 16px;">
                <div style="width: 48px; height: 48px; border-radius: 14px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.35); display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink:0;">
                    🏪
                </div>
                <div>
                    <h3 style="margin: 0; font-size: 17px; font-weight: 800; color: #fff; tracking-tight;">Sesi & Multi-Merchant GoPay / GoBiz Partner</h3>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: var(--text-muted);">
                        Kelola akun toko merchant, verifikasi OTP sesi GoBiz 24/7, dan pasangkan string QRIS statis secara otomatis.
                    </p>
                </div>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all active:scale-95" onclick="openAddMerchantModal()">
                    ➕ Tambah Merchant Baru
                </button>
                <button class="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-slate-200 font-semibold text-xs transition-all active:scale-95 flex items-center gap-1.5" onclick="loadMerchantsList()">
                    🔄 Refresh Daftar
                </button>
            </div>
        </div>

        <!-- Main Merchant Table Container -->
        <div class="p-6 bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-xl">
            <div class="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800/60">
                <div>
                    <h3 class="text-lg font-extrabold text-white tracking-tight flex items-center gap-2.5">
                        <span class="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 text-sm">📱</span>
                        Daftar Akun Merchant & Status Sesi GoBiz
                    </h3>
                    <p class="text-xs text-slate-400 mt-1">Klik <strong class="text-sky-400">🔑 Login OTP</strong> pada baris merchant untuk menghubungkan akun GoBiz via SMS/WA.</p>
                </div>
            </div>

            <div id="multi-merchant-container">
                <div class="text-center py-8 text-slate-400 font-medium">Memuat daftar merchant...</div>
            </div>
        </div>

        <!-- API Clients Pairs Table Container (Multi-Client App_ID + App_Secret) -->
        <div class="mt-6 p-6 bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-xl">
            <div class="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800/60">
                <div>
                    <h3 class="text-lg font-extrabold text-white tracking-tight flex items-center gap-2.5">
                        <span class="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm">🔐</span>
                        Manajemen Pasangan API Key Pihak Ke-3 (App-ID & App-Secret Pair)
                    </h3>
                    <p class="text-xs text-slate-400 mt-1">Kelola akun otorisasi API eksternal yang berpasangan seperti <strong class="text-sky-400">Username (App-ID)</strong> & <strong class="text-amber-400">Password (App-Secret)</strong>.</p>
                </div>
                <button class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-1.5" onclick="openAddApiClientModal()">
                    ➕ Tambah Client API Baru
                </button>
            </div>

            <div id="api-clients-container">
                <div class="text-center py-8 text-slate-400 font-medium">Memuat daftar akun client API...</div>
            </div>
        </div>
    </div>
    `;
}

module.exports = renderAuthTab;
