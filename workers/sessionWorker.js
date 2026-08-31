// Background Worker - Session Keep-Alive & Database Cleanup
const fs = require('fs');
const path = require('path');
const db = require('../db');
const sessionManager = require('../sessionManager');
const { logActivity } = require('../services/loggerService');

async function syncSessionWithDatabase() {
    try {
        const sessionFile = path.join(__dirname, '..', '.GOPAY_SESI_JANGAN_DIHAPUS.json');
        const isFile = fs.existsSync(sessionFile) && fs.statSync(sessionFile).isFile();
        
        if (isFile) {
            const fileData = fs.readFileSync(sessionFile, 'utf8').trim();
            if (fileData && fileData.startsWith('{')) {
                const parsed = JSON.parse(fileData);
                await db.saveMerchantSession(parsed);
            }
        } else {
            const dbSession = await db.getMerchantSession();
            if (dbSession) {
                const str = typeof dbSession === 'object' ? JSON.stringify(dbSession, null, 2) : String(dbSession);
                fs.writeFileSync(sessionFile, str, 'utf8');
                logActivity('SUCCESS', '[SESSION SYNC] Sesi GoBiz dipulihkan dari Database ke disk!');
            }
        }
    } catch (e) {
        logActivity('ERROR', '[SESSION SYNC] Gagal sinkronisasi sesi DB: ' + e.message);
    }
}

async function autoRefreshSessionPeriodically() {
    try {
        await syncSessionWithDatabase();
        logActivity('INFO', '[SESSION KEEP-ALIVE] Memulai auto-refresh token berkala...');
        const refreshed = await sessionManager.refreshSession();
        if (refreshed) {
            await syncSessionWithDatabase();
            logActivity('SUCCESS', '[SESSION KEEP-ALIVE] Token GoBiz berhasil diperbarui.');
        }
    } catch (err) {
        logActivity('ERROR', '[SESSION KEEP-ALIVE] Gagal memperbarui token: ' + err.message);
    }
}

function startSessionWorker() {
    // Sinkronisasi awal saat server startup
    syncSessionWithDatabase();

    // Refresh token tiap 6 jam
    setInterval(autoRefreshSessionPeriodically, 6 * 60 * 60 * 1000);
    
    // Sinkronisasi sesi DB tiap 30 detik untuk mirroring/failover
    setInterval(syncSessionWithDatabase, 30 * 1000);

    // Clean expired claims tiap 1 jam
    setInterval(async () => {
        try {
            await db.cleanExpiredClaims(24 * 60 * 60 * 1000);
        } catch (err) {
            logActivity('ERROR', 'Gagal membersihkan klaim kedaluwarsa: ' + err.message);
        }
    }, 60 * 60 * 1000);

    logActivity('SYSTEM', 'Background Session Keep-Alive & DB Cleaner Worker aktif (DB Mirroring Active)');
}

module.exports = {
    syncSessionWithDatabase,
    autoRefreshSessionPeriodically,
    startSessionWorker
};
