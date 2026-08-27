// Webhook Controller - Webhook Queue Monitoring
const db = require('../db');

const getAllWebhooks = (req, res) => {
    const limit = parseInt(req.query.limit || '50', 10);
    const webhooks = db.getAllWebhooks(limit);
    res.json({
        success: true,
        total: webhooks.length,
        data: webhooks
    });
};

module.exports = {
    getAllWebhooks
};
