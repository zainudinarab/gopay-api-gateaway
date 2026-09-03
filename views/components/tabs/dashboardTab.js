// Component: Tab 0 - Main Dashboard Overview
const { isRedisConnected } = require('../../../redis');

function renderDashboardTab() {
    const redisHost = process.env.REDIS_HOST || '30.30.2.53';
    const redisBadge = isRedisConnected()
        ? '<span style="font-size: 12px; font-weight: 700; color: #34d399;">🟢 Redis Active (' + redisHost + ':6379)</span>'
        : '<span style="font-size: 12px; font-weight: 700; color: #f59e0b;">🟡 Redis Configured (' + redisHost + ')</span>';

    return `
    <div class="tab-content active" id="tab-dashboard">

        <!-- Analytics Overview Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 24px;">
            
            <!-- Card 1: Revenue -->
            <div class="panel-card" style="margin-bottom: 0; padding: 22px; background: linear-gradient(135deg, rgba(2, 132, 199, 0.18), rgba(15, 23, 42, 0.9)); border-color: rgba(56, 189, 248, 0.35);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <span style="font-size: 11.5px; font-weight: 700; color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 0.5px;">💰 Total Revenue (Mutasi)</span>
                    <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(56, 189, 248, 0.2); border: 1px solid rgba(56, 189, 248, 0.4); display: flex; align-items: center; justify-content: center; font-size: 20px;">💳</div>
                </div>
                <div style="font-size: 26px; font-weight: 800; color: #fff; font-family: 'JetBrains Mono', monospace;" id="dash-val-total-revenue">Rp 0</div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px;" id="dash-val-today-revenue">Hari Ini: Rp 0</div>
            </div>

            <!-- Card 2: Orders -->
            <div class="panel-card" style="margin-bottom: 0; padding: 22px; background: linear-gradient(135deg, rgba(34, 197, 94, 0.18), rgba(15, 23, 42, 0.9)); border-color: rgba(34, 197, 94, 0.35);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <span style="font-size: 11.5px; font-weight: 700; color: var(--accent-green); text-transform: uppercase; letter-spacing: 0.5px;">🧾 Order QRIS Dinamis</span>
                    <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(34, 197, 94, 0.2); border: 1px solid rgba(34, 197, 94, 0.4); display: flex; align-items: center; justify-content: center; font-size: 20px;">📱</div>
                </div>
                <div style="font-size: 26px; font-weight: 800; color: #fff;" id="dash-val-total-orders">0 Order</div>
                <div style="font-size: 12px; color: var(--accent-green); margin-top: 6px; font-weight: 600;" id="dash-val-paid-orders">🟢 0 Lunas (0%)</div>
            </div>

            <!-- Card 3: Multi-Merchant -->
            <div class="panel-card" style="margin-bottom: 0; padding: 22px; background: linear-gradient(135deg, rgba(168, 85, 247, 0.18), rgba(15, 23, 42, 0.9)); border-color: rgba(168, 85, 247, 0.35);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <span style="font-size: 11.5px; font-weight: 700; color: var(--accent-purple); text-transform: uppercase; letter-spacing: 0.5px;">🏪 Multi-Merchant Active</span>
                    <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(168, 85, 247, 0.2); border: 1px solid rgba(168, 85, 247, 0.4); display: flex; align-items: center; justify-content: center; font-size: 20px;">🏬</div>
                </div>
                <div style="font-size: 26px; font-weight: 800; color: #fff;" id="dash-val-active-merchants">0 Merchant</div>
                <div style="font-size: 12px; color: var(--accent-cyan); margin-top: 6px; font-weight: 600;" id="dash-val-active-merchant-name">Utama: -</div>
            </div>

            <!-- Card 4: Webhook Status -->
            <div class="panel-card" style="margin-bottom: 0; padding: 22px; background: linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(15, 23, 42, 0.9)); border-color: rgba(245, 158, 11, 0.35);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <span style="font-size: 11.5px; font-weight: 700; color: var(--accent-amber); text-transform: uppercase; letter-spacing: 0.5px;">📡 Status Delivery Webhook</span>
                    <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.4); display: flex; align-items: center; justify-content: center; font-size: 20px;">⚡</div>
                </div>
                <div style="font-size: 26px; font-weight: 800; color: #fff;" id="dash-val-webhook-status">100% OK</div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">Worker Auto-Retry Active</div>
            </div>

        </div>

        <!-- System Health Section -->
        <div>
            <div class="panel-card" style="margin-bottom: 0;">
                <h3 style="font-size: 16px; font-weight: 700; margin: 0 0 16px 0; color: #fff;">🖥️ System Health Gateway</h3>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: rgba(0,0,0,0.25); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);">
                        <span style="font-size: 12.5px; color: var(--text-muted);">Database Engine</span>
                        <span style="font-size: 12px; font-weight: 700; color: var(--accent-cyan);">🟢 PostgreSQL Dual-DB</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: rgba(0,0,0,0.25); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);">
                        <span style="font-size: 12.5px; color: var(--text-muted);">Redis Cache Engine</span>
                        ${redisBadge}
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: rgba(0,0,0,0.25); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);">
                        <span style="font-size: 12.5px; color: var(--text-muted);">Auto Reconciler</span>
                        <span style="font-size: 12px; font-weight: 700; color: var(--accent-green);">🟢 Active (2s Poll)</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: rgba(0,0,0,0.25); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);">
                        <span style="font-size: 12.5px; color: var(--text-muted);">Webhook Worker</span>
                        <span style="font-size: 12px; font-weight: 700; color: var(--accent-purple);">🟢 Retry Queue Active</span>
                    </div>
                </div>
            </div>
        </div>

    </div>
    `;
}

module.exports = renderDashboardTab;
