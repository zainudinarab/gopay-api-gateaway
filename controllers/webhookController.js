// Webhook Controller - Webhook Queue Monitoring
const db = require('../db');

const getAllWebhooks = async (req, res) => {
    const limit = parseInt(req.query.limit || '50', 10);
    const webhooks = await db.getAllWebhooks(limit);
    res.json({
        success: true,
        total: webhooks.length,
        data: webhooks
    });
};

const resendWebhook = async (req, res) => {
    try {
        const id = req.body?.id || req.params?.id || req.query?.id;
        if (!id) {
            return res.status(400).json({ success: false, message: 'ID Webhook wajib diisi' });
        }
        const item = await db.getWebhookById(id);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Antrian webhook tidak ditemukan' });
        }

        const retried = await db.retryWebhook(id);
        
        // Trigger queue processor immediately
        const { processWebhookQueueWorker } = require('../workers/webhookWorker');
        processWebhookQueueWorker().catch(() => {});

        const { logActivity } = require('../services/loggerService');
        logActivity('INFO', `[WEBHOOK RETRY] Webhook ID #${id} untuk QRIS ${item.qrisId} dimasukkan ulang ke antrian pengiriman.`);

        res.json({
            success: true,
            message: `Webhook ID #${id} berhasil dimasukkan ulang ke antrian pengiriman!`,
            data: retried
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal meresend webhook', error: err.message });
    }
};

module.exports = {
    getAllWebhooks,
    resendWebhook
};
