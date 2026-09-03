// Component: Tab 3 - Antrian Webhook Delivery
function renderWebhooksTab() {
    return `
    <div class="tab-content" id="tab-webhooks">
        <div class="panel-card">
            <div class="toolbar">
                <div>
                    <h3 style="font-size: 18px; font-weight: 700;">🔔 Log Antrian Webhook Delivery</h3>
                    <p style="font-size: 13px; color: var(--text-muted);">Status pengiriman notifikasi HTTP POST ke server Pihak Ketiga (Auto Retry 3x).</p>
                </div>
                <button class="btn-primary btn-sm" onclick="loadWebhooksTable()">🔄 Refresh Webhooks</button>
            </div>

            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>QRIS ID / Ref ID</th>
                            <th>Target Webhook URL</th>
                            <th>Percobaan</th>
                            <th>Status Delivery</th>
                            <th>Error Log</th>
                            <th>Waktu</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-webhooks">
                        <tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Memuat antrian webhook...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `;
}

module.exports = renderWebhooksTab;
