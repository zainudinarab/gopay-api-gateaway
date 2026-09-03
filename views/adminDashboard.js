// Views - Admin Portal Dashboard HTML Generator (Modular Architecture)
const renderStyles = require('./components/styles');
const renderSidebar = require('./components/sidebar');
const renderHeader = require('./components/header');
const renderFooter = require('./components/footer');
const renderModals = require('./components/modals');
const renderTxTab = require('./components/tabs/txTab');
const renderDashboardTab = require('./components/tabs/dashboardTab');
const renderAuthTab = require('./components/tabs/authTab');
const renderOrdersTab = require('./components/tabs/ordersTab');
const renderWebhooksTab = require('./components/tabs/webhooksTab');
const renderLogsTab = require('./components/tabs/logsTab');
const renderDocsTab = require('./components/tabs/docsTab');
const renderScripts = require('./components/scripts');

function renderAdminDashboard(sessionDataOrExists, dbType = 'SQLite WAL', sessionObj = null, claimedTransactions = []) {
    let sessionExists = false;
    let merchantSession = null;
    
    if (typeof sessionDataOrExists === 'object' && sessionDataOrExists !== null) {
        sessionExists = true;
        merchantSession = sessionDataOrExists;
    } else {
        sessionExists = Boolean(sessionDataOrExists);
        merchantSession = sessionObj;
    }

    return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel - GoPay Merchant Gateway</title>
    ${renderStyles(dbType)}
</head>
<body>

    <!-- Toast Notification Global -->
    <div id="toast-alert" style="display:none; position:fixed; top:24px; right:24px; z-index:999999;">
        <div id="toast-body" style="background:#1e293b; border:1px solid rgba(56,189,248,0.4); color:#fff; padding:14px 20px; border-radius:12px; font-size:13.5px; font-weight:600; box-shadow:0 10px 30px rgba(0,0,0,0.5); display:flex; align-items:center; gap:10px;">
            <span id="toast-icon">ℹ️</span>
            <span id="toast-text">Notifikasi</span>
        </div>
    </div>

    <!-- Screen 1: Admin Password Lock -->
    <div class="lock-container" id="section-admin-lock" style="display: flex;">
        <div class="lock-card">
            <div style="width: 56px; height: 56px; border-radius: 16px; background: linear-gradient(135deg, rgba(2, 132, 199, 0.2), rgba(56, 189, 248, 0.1)); border: 1px solid rgba(56, 189, 248, 0.3); display: flex; align-items: center; justify-content: center; font-size: 26px; margin: 0 auto 20px auto; color: var(--accent-cyan);">
                🔐
            </div>
            
            <h2 style="font-size: 22px; font-weight: 800; color: #ffffff; margin-bottom: 6px; letter-spacing: -0.5px;">Admin Portal Gateway</h2>
            <p style="font-size: 13.5px; color: var(--text-muted); margin-bottom: 28px; line-height: 1.5;">
                Masukkan Master Admin Password untuk mengelola sesi GoPay Merchant & API Gateway.
            </p>

            <div style="display: none; padding: 12px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 20px; text-align: left;" id="msg-error" class="tag-expired"></div>
            <div style="display: none; padding: 12px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 20px; text-align: left;" id="msg-success" class="tag-paid"></div>

            <div class="form-group" style="text-align: left;">
                <label for="inp-admin-pass">Master Admin Password</label>
                <input type="password" id="inp-admin-pass" class="form-control" placeholder="••••••••••••" onkeyup="if(event.key==='Enter') unlockAdmin()">
            </div>

            <button class="btn-primary" id="btn-unlock" onclick="unlockAdmin()" style="width: 100%; margin-top: 10px;">
                <span class="spinner" id="spin-lock"></span>
                <span id="lbl-lock">🔑 Masuk ke Portal Admin</span>
            </button>

            <div style="margin-top: 24px; font-size: 12px; color: var(--text-dim);">
                🔒 Sesi dilindungi dengan enkripsi password admin global (.env).
            </div>
        </div>
    </div>

    <!-- Screen 2: Main Dashboard Layout -->
    <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col" id="section-dashboard">
        ${renderSidebar(dbType)}

        <main class="main-content lg:pl-64 flex-1 flex flex-col min-h-screen w-full transition-all duration-300">
            ${renderHeader(dbType)}

            <div class="content-body p-4 sm:p-6 lg:p-8 flex-1">
                ${renderDashboardTab()}
                ${renderAuthTab(sessionExists, merchantSession)}
                ${renderOrdersTab()}
                ${renderTxTab(claimedTransactions)}
                ${renderWebhooksTab()}
                ${renderLogsTab()}
                ${renderDocsTab()}
            </div>

            ${renderFooter()}
        </main>
    </div>

    ${renderModals()}
    ${renderScripts()}
</body>
</html>`;
}

module.exports = {
    renderAdminDashboard
};
