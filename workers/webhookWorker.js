// Background Worker - Webhook Queue Processor & Retry Engine
const axios = require('axios');
const db = require('../db');
const { logActivity } = require('../services/loggerService');

async function processWebhookQueueWorker() {
    try {
        const pendingItems = db.getPendingWebhooks(10);
        for (const item of pendingItems) {
            try {
                logActivity('INFO', `[WEBHOOK QUEUE #${item.id}] Mengirim notifikasi ke ${item.webhookUrl} (Percobaan ${item.attempts + 1}/${item.maxAttempts})...`);
                await axios.post(item.webhookUrl, item.payload, {
                    headers: { 'Content-Type': 'application/json', 'User-Agent': 'GoPay-Gateway-Webhook/1.0' },
                    timeout: 10000
                });
                db.updateWebhookAttempt(item.id, 'SUCCESS', null, Date.now());
                db.updateOrderWebhookStatus(item.qrisId, 'SUCCESS');
                logActivity('SUCCESS', `[WEBHOOK QUEUE #${item.id}] Webhook sukses terkirim ke ${item.webhookUrl}`);
            } catch (err) {
                const errorMsg = err.response ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message;
                const nextAttempts = item.attempts + 1;
                if (nextAttempts >= item.maxAttempts) {
                    db.updateWebhookAttempt(item.id, 'FAILED', errorMsg, Date.now());
                    db.updateOrderWebhookStatus(item.qrisId, 'FAILED');
                    logActivity('ERROR', `[WEBHOOK QUEUE #${item.id}] Pengiriman Webhook GAGAL setelah ${nextAttempts} percobaan: ${errorMsg}`);
                } else {
                    const nextAttemptAt = Date.now() + 30 * 1000;
                    db.updateWebhookAttempt(item.id, 'PENDING', errorMsg, nextAttemptAt);
                    logActivity('WARNING', `[WEBHOOK QUEUE #${item.id}] Error pengiriman (${errorMsg}). Mencoba lagi 30 detik kemudian...`);
                }
            }
        }
    } catch (err) {
        logActivity('ERROR', 'Error pada processWebhookQueueWorker: ' + err.message);
    }
}

function startWebhookWorker(intervalMs = 5000) {
    setInterval(processWebhookQueueWorker, intervalMs);
    logActivity('SYSTEM', 'Background Webhook Queue Worker aktif');
}

module.exports = {
    processWebhookQueueWorker,
    startWebhookWorker
};
