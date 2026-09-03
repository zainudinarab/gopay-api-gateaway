// Component: Sidebar Navigation (Desktop Fixed + Mobile Off-Canvas Drawer)
function renderSidebar(dbType) {
    const navContent = `
        <div class="px-3 py-5 flex-1 flex flex-col gap-1.5 overflow-y-auto">
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 pb-2">Menu Utama</div>

            <button class="tab-btn active w-full px-3.5 py-3 rounded-xl text-xs transition-all duration-200 flex items-center gap-3 text-left" id="tab-btn-dashboard" data-tab="dashboard" onclick="switchTabByName('dashboard'); closeMobileSidebar();">
                <span class="text-base">📊</span>
                <span class="font-bold">Dashboard Overview</span>
            </button>

            <button class="tab-btn w-full px-3.5 py-3 rounded-xl text-xs transition-all duration-200 flex items-center gap-3 text-left" id="tab-btn-auth" data-tab="auth" onclick="switchTabByName('auth'); closeMobileSidebar();">
                <span class="text-base">🔐</span>
                <span class="font-bold">Sesi & Merchant</span>
            </button>

            <button class="tab-btn w-full px-3.5 py-3 rounded-xl text-xs transition-all duration-200 flex items-center gap-3 text-left" id="tab-btn-orders" data-tab="orders" onclick="switchTabByName('orders'); closeMobileSidebar();">
                <span class="text-base">📋</span>
                <span class="font-bold">Daftar Order QRIS</span>
            </button>

            <button class="tab-btn w-full px-3.5 py-3 rounded-xl text-xs transition-all duration-200 flex items-center gap-3 text-left" id="tab-btn-tx" data-tab="tx" onclick="switchTabByName('tx'); closeMobileSidebar();">
                <span class="text-base">💳</span>
                <span class="font-bold">Mutasi Transaksi</span>
            </button>

            <button class="tab-btn w-full px-3.5 py-3 rounded-xl text-xs transition-all duration-200 flex items-center gap-3 text-left" id="tab-btn-webhooks" data-tab="webhooks" onclick="switchTabByName('webhooks'); closeMobileSidebar();">
                <span class="text-base">📡</span>
                <span class="font-bold">Antrian Webhook</span>
            </button>

            <button class="tab-btn w-full px-3.5 py-3 rounded-xl text-xs transition-all duration-200 flex items-center gap-3 text-left" id="tab-btn-logs" data-tab="logs" onclick="switchTabByName('logs'); closeMobileSidebar();">
                <span class="text-base">🖥️</span>
                <span class="font-bold">System Logs & Poll</span>
            </button>

            <button class="tab-btn w-full px-3.5 py-3 rounded-xl text-xs transition-all duration-200 flex items-center gap-3 text-left" id="tab-btn-docs" data-tab="docs" onclick="switchTabByName('docs'); closeMobileSidebar();">
                <span class="text-base">📖</span>
                <span class="font-bold">Dokumentasi API</span>
            </button>

            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 pt-5 pb-2">Informasi Gateway</div>
            <div class="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-400 space-y-1.5 font-medium">
                <div class="flex items-center justify-between">
                    <span>API Port:</span>
                    <span class="text-white font-bold font-mono">3000</span>
                </div>
                <div class="flex items-center justify-between">
                    <span>Engine:</span>
                    <span class="text-sky-400 font-bold font-mono">${dbType}</span>
                </div>
                <div class="flex items-center justify-between">
                    <span>Reconciler:</span>
                    <span class="text-emerald-400 font-bold">Aktif (2s)</span>
                </div>
            </div>
        </div>

        <div class="p-4 border-t border-slate-800/80 flex items-center justify-between bg-slate-950/40">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center font-bold text-xs text-white shadow-md">A</div>
                <div>
                    <div class="text-xs font-bold text-white">Administrator</div>
                    <div class="text-[10px] text-slate-500">Super Admin</div>
                </div>
            </div>
            <button onclick="lockAdminSession()" title="Kunci Admin Panel" class="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center transition-colors">
                🔒
            </button>
        </div>
    `;

    return `
    <!-- Desktop Fixed Sidebar -->
    <aside class="w-64 fixed inset-y-0 left-0 z-40 hidden lg:flex flex-col bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/80">
        <div class="px-5 py-4.5 flex items-center gap-3 border-b border-slate-800/80">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-600/10 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-md">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="3"></rect>
                    <line x1="2" y1="10" x2="22" y2="10"></line>
                </svg>
            </div>
            <div>
                <div class="text-sm font-extrabold text-white tracking-tight">GoPay Partner</div>
                <div class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> PRO GATEWAY
                </div>
            </div>
        </div>
        ${navContent}
    </aside>

    <!-- Mobile Off-Canvas Sidebar Backdrop Overlay -->
    <div id="mobile-sidebar-backdrop" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm hidden transition-opacity lg:hidden" onclick="closeMobileSidebar()"></div>

    <!-- Mobile Off-Canvas Sidebar Drawer -->
    <aside id="mobile-sidebar" class="fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transform -translate-x-full transition-transform duration-300 ease-in-out lg:hidden shadow-2xl">
        <div class="px-5 py-4 flex items-center justify-between border-b border-slate-800">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold">💳</div>
                <div>
                    <div class="font-extrabold text-white text-sm">GoPay Partner</div>
                    <div class="text-[10px] text-emerald-400 font-bold">PRO GATEWAY</div>
                </div>
            </div>
            <button onclick="closeMobileSidebar()" class="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold">✕</button>
        </div>
        ${navContent}
    </aside>
    `;
}

module.exports = renderSidebar;
