// Component: Tab 4 & 5 - System Logs & REST API Documentation
function renderLogsTab() {
    return `
    <!-- Tab 4: Mutasi Transaksi -->
    <div class="tab-content" id="tab-tx">
        <div class="panel-card">
            <div class="toolbar">
                <div>
                    <h3 style="font-size: 18px; font-weight: 700;">💸 Mutasi Transaksi Masuk GoJek</h3>
                    <p style="font-size: 13px; color: var(--text-muted);">Mutasi saldo dan pembayaran QRIS yang terdeteksi dari API GoJek Merchant.</p>
                </div>
                <button class="btn-primary btn-sm" onclick="loadTransactionsTable()">🔄 Refresh Mutasi</button>
            </div>

            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Tx ID</th>
                            <th>Order ID</th>
                            <th>Sumber Pembayaran</th>
                            <th>Nominal (Rp)</th>
                            <th>Status</th>
                            <th>Waktu Transaksi</th>
                            <th>Connected QRIS ID</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-tx">
                        <tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Memuat data mutasi GoJek...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Tab 5: Live System Logs -->
    <div class="tab-content" id="tab-logs">
        <div class="panel-card">
            <div class="toolbar">
                <div>
                    <h3 style="font-size: 18px; font-weight: 700;">💻 Live System & Worker Logs</h3>
                    <p style="font-size: 13px; color: var(--text-muted);">Memantau log aktivitas background worker, transaksi, dan server secara real-time.</p>
                </div>
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <select id="select-log-level" onchange="filterLogsDisplay()" style="background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main); padding: 8px 12px; border-radius: 8px; font-size: 12.5px; outline: none;">
                        <option value="ALL">Semua Log Level</option>
                        <option value="SYSTEM">🟢 SYSTEM</option>
                        <option value="INFO">🔵 INFO</option>
                        <option value="ERROR">🔴 ERROR</option>
                    </select>
                    <button class="btn-primary btn-sm" id="btn-auto-logs" onclick="toggleAutoLogs()" style="background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.3); color: var(--accent-green);">
                        ⚡ Auto Refresh (ON)
                    </button>
                    <button class="btn-primary btn-sm" onclick="loadLogsConsole()">🔄 Refresh</button>
                    <button class="btn-primary btn-sm btn-danger" onclick="clearLogsConsole()">🗑️ Clear Display</button>
                </div>
            </div>

            <div id="terminal-logs" style="background: #060911; border: 1px solid var(--border-color); border-radius: 14px; padding: 20px; font-family: 'JetBrains Mono', monospace; font-size: 12.5px; color: #d1d5db; max-height: 520px; overflow-y: auto; line-height: 1.7; white-space: pre-wrap;">[SYSTEM] Memuat system logs...</div>
        </div>
    </div>
    `;
}

module.exports = renderLogsTab;
