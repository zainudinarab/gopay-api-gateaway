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

module.exports = {
    getAllWebhooks
};
