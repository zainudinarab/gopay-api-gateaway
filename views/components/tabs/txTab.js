// Component: Tab 6 - Mutasi Transaksi GoJek (claimed_transactions)
function renderTxTab(claimedTransactions = []) {
    let rowsHtml = '<tr><td colspan="7" class="text-center py-8 text-slate-400 font-medium">Memuat riwayat mutasi...</td></tr>';
    let totalCount = 0;
    let pageInfoStr = '0 - 0';

    if (claimedTransactions && claimedTransactions.length > 0) {
        totalCount = claimedTransactions.length;
        pageInfoStr = '1 - ' + Math.min(10, totalCount);
        rowsHtml = claimedTransactions.slice(0, 10).map(function(t) {
            var txId = t.transaction_id || t.transactionId || '-';
            var qId = t.qris_id || t.qrisId || null;
            var mId = t.merchant_id || t.merchantId || '-';
            var amt = Number(t.amount || 0);
            var payer = t.payer_issuer || t.payerIssuer || t.payment_type || 'GoPay / QRIS';
            var txTime = t.transaction_time || t.transactionTime || t.time || '-';
            
            var claimedTime = '-';
            if (t.claimed_at) {
                try {
                    var rawAt = Number(t.claimed_at);
                    claimedTime = isNaN(rawAt) ? String(t.claimed_at) : new Date(rawAt > 1e11 ? rawAt : rawAt * 1000).toLocaleString('id-ID');
                } catch(e) {
                    claimedTime = String(t.claimed_at);
                }
            }

            var fmtAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amt);
            var qrisLink = (qId && qId !== '-') 
                ? '<strong class="font-mono text-emerald-400 font-bold">' + qId + '</strong>' 
                : '<span class="text-slate-500">-</span>';

            return '<tr class="hover:bg-slate-800/40 transition-colors border-b border-slate-800/60">' +
                '<td class="px-4 py-3.5"><strong class="font-mono text-sky-400 font-bold text-xs">' + txId + '</strong></td>' +
                '<td class="px-4 py-3.5">' + qrisLink + '</td>' +
                '<td class="px-4 py-3.5"><code class="font-mono text-amber-400 font-bold text-xs">' + mId + '</code></td>' +
                '<td class="px-4 py-3.5"><span class="font-mono font-bold text-white">' + fmtAmount + '</span></td>' +
                '<td class="px-4 py-3.5"><span class="tag tag-success font-semibold">' + payer + '</span></td>' +
                '<td class="px-4 py-3.5 text-xs text-slate-400 font-mono">' + txTime + '</td>' +
                '<td class="px-4 py-3.5 text-right text-xs text-slate-400 font-mono">' + claimedTime + '</td>' +
            '</tr>';
        }).join('');
    }

    return `
    <div class="tab-content" id="tab-tx">
        <div class="p-6 bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-xl">
            <div class="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800/60">
                <div>
                    <h3 class="text-lg font-extrabold text-white tracking-tight flex items-center gap-2.5">
                        <span class="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 text-sm">💳</span>
                        Riwayat Mutasi Transaksi Merchant (claimed_transactions)
                    </h3>
                    <p class="text-xs text-slate-400 mt-1">Daftar mutasi saldo & pembayaran QRIS terdeteksi real-time dari API GoJek / GoBiz Merchant.</p>
                </div>
                <div class="flex flex-wrap items-center gap-2.5">
                    <button class="px-3.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-400 font-semibold text-xs transition-all active:scale-95 flex items-center gap-1.5" onclick="loadTransactionsTable()">
                        🔄 Refresh Mutasi
                    </button>
                </div>
            </div>

            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th class="px-4 py-3.5 text-left">Tx ID / Ref ID</th>
                            <th class="px-4 py-3.5 text-left">Connected QRIS ID</th>
                            <th class="px-4 py-3.5 text-left">Merchant ID</th>
                            <th class="px-4 py-3.5 text-left">Nominal Mutasi</th>
                            <th class="px-4 py-3.5 text-left">Payer / Issuer</th>
                            <th class="px-4 py-3.5 text-left">Waktu Transaksi</th>
                            <th class="px-4 py-3.5 text-right">Claimed At</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-transactions" class="divide-y divide-slate-800/60">
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>

            <!-- Pagination Bar Controls -->
            <div class="px-4 py-3.5 mt-4 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-4">
                <div class="text-xs text-slate-400 font-medium">
                    Menampilkan <span class="font-bold text-white" id="tx-page-info">${pageInfoStr}</span> dari <span class="font-bold text-sky-400" id="tx-total-count">${totalCount}</span> total mutasi
                </div>
                <div class="flex items-center gap-2">
                    <button id="btn-tx-prev" onclick="prevTxPage()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors">
                        ◀ Sebelumnya
                    </button>
                    <span class="px-3.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-sky-400" id="tx-page-num">
                        Halaman 1
                    </span>
                    <button id="btn-tx-next" onclick="nextTxPage()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors">
                        Selanjutnya ▶
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;
}

module.exports = renderTxTab;
