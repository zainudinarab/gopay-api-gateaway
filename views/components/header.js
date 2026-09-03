// Component: Top Header Bar (Tailwind CSS Mobile Responsive with Hamburger Toggle)
function renderHeader(dbType) {
    return `
    <header class="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
        <div class="flex items-center gap-3">
            <!-- Mobile Hamburger Toggle Button -->
            <button onclick="toggleMobileSidebar()" class="lg:hidden w-9 h-9 rounded-xl bg-slate-800/90 border border-slate-700/80 text-slate-300 hover:text-white flex items-center justify-center text-lg shadow-sm transition-colors" title="Buka Menu Sidebar">
                ☰
            </button>

            <div class="flex items-center gap-3">
                <h2 id="header-page-title" class="text-sm sm:text-base lg:text-lg font-extrabold text-white tracking-tight truncate">📊 Executive Gateway Overview</h2>
                <span class="hidden sm:inline-flex text-[11px] font-bold text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-md border border-sky-500/20 font-mono">🐘 DB: ${dbType}</span>
            </div>
        </div>

        <div class="flex items-center gap-3">
            <div class="hidden sm:flex items-center gap-2 bg-slate-950/60 border border-slate-800/80 px-3 py-1.5 rounded-full text-xs">
                <span class="text-slate-500">Live Clock:</span>
                <span id="live-clock" class="font-mono font-bold text-sky-400">--:--:--</span>
            </div>

            <button onclick="openCreateOrderModal()" class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all active:scale-95">
                <span>➕</span> <span class="hidden sm:inline">Cetak QRIS</span><span class="sm:hidden">QRIS</span>
            </button>
        </div>
    </header>
    `;
}

module.exports = renderHeader;
