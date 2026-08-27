// Background Worker - Session Keep-Alive & Database Cleanup
const db = require('../db');
const sessionManager = require('../sessionManager');
const { logActivity } = require('../services/loggerService');

async function autoRefreshSessionPeriodically() {
    try {
        logActivity('INFO', '[SESSION KEEP-ALIVE] Memulai auto-refresh token berkala...');
        const refreshed = await sessionManager.refreshSession();
        if (refreshed) {
            logActivity('SUCCESS', '[SESSION KEEP-ALIVE] Token GoBiz berhasil diperbarui.');
        }
    } catch (err) {
        logActivity('ERROR', '[SESSION KEEP-ALIVE] Gagal memperbarui token: ' + err.message);
    }
}

function startSessionWorker() {
    // Refresh token tiap 6 jam
    setInterval(autoRefreshSessionPeriodically, 6 * 60 * 60 * 1000);
    
    // Clean expired claims tiap 1 jam
    setInterval(() => {
        try {
            db.cleanExpiredClaims(24 * 60 * 60 * 1000);
        } catch (err) {
            logActivity('ERROR', 'Gagal membersihkan klaim kedaluwarsa: ' + err.message);
        }
    }, 60 * 60 * 1000);

    logActivity('SYSTEM', 'Background Session Keep-Alive & DB Cleaner Worker aktif');
}

module.exports = {
    autoRefreshSessionPeriodically,
    startSessionWorker
};
