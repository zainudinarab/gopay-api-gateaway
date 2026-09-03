// Component: Tab 2 - Daftar Order QRIS & Generator QR (Tailwind Redesign)
function renderOrdersTab() {
    return `
    <div class="tab-content" id="tab-orders">
        <div class="p-6 bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-xl">
            <div class="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800/60">
                <div>
                    <h3 class="text-lg font-extrabold text-white tracking-tight flex items-center gap-2.5">
                        <span class="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm">🧾</span>
                        Riwayat Order QRIS Dinamis
                    </h3>
                    <p class="text-xs text-slate-400 mt-1">Daftar transaksi QRIS dinamis beserta kode unik & status pembayaran real-time.</p>
                </div>
                <div class="flex flex-wrap items-center gap-2.5">
                    <button class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all active:scale-95" onclick="openCreateOrderModal()">
                        ✨ + Buat Order QRIS Baru
                    </button>
                    <button class="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-slate-200 font-semibold text-xs transition-all active:scale-95" onclick="loadOrdersTable()">
                        🔄 Refresh Orders
                    </button>
                    <button class="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-semibold text-xs transition-all active:scale-95" onclick="clearAllOrders()">
                        🗑️ Reset Database Order
                    </button>
                </div>
            </div>

            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th class="px-4 py-3.5 text-left">QRIS ID</th>
                            <th class="px-4 py-3.5 text-left">App ID</th>
                            <th class="px-4 py-3.5 text-left">Ref ID</th>
                            <th class="px-4 py-3.5 text-left">Nominal Akhir</th>
                            <th class="px-4 py-3.5 text-left">Status Order</th>
                            <th class="px-4 py-3.5 text-left">Status Webhook</th>
                            <th class="px-4 py-3.5 text-left">Dibuat Pada</th>
                            <th class="px-4 py-3.5 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-orders" class="divide-y divide-slate-800/60">
                        <tr><td colspan="8" class="text-center py-8 text-slate-400 font-medium">Memuat data order...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Pagination Bar Controls -->
            <div class="px-4 py-3.5 mt-4 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-4">
                <div class="text-xs text-slate-400 font-medium">
                    Menampilkan <span class="font-bold text-white" id="orders-page-info">1 - 10</span> dari <span class="font-bold text-sky-400" id="orders-total-count">0</span> total order
                </div>
                <div class="flex items-center gap-2">
                    <button id="btn-orders-prev" onclick="prevOrdersPage()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors">
                        ◀ Sebelumnya
                    </button>
                    <span class="px-3.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-sky-400" id="orders-page-num">
                        Halaman 1
                    </span>
                    <button id="btn-orders-next" onclick="nextOrdersPage()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors">
                        Selanjutnya ▶
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;
}

module.exports = renderOrdersTab;
