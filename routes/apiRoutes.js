// API Router - REST API Endpoints
const express = require('express');
const router = express.Router();

const { apiKeyAuth, adminPassAuth } = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');
const qrisController = require('../controllers/qrisController');
const orderController = require('../controllers/orderController');
const transactionController = require('../controllers/transactionController');
const webhookController = require('../controllers/webhookController');
const { activityLogs, logActivity } = require('../services/loggerService');

// Auth Endpoints
router.post('/login/admin-auth', authController.adminAuth);
router.post('/login/request-otp', adminPassAuth, authController.requestOTP);
router.post('/login/verify-otp', adminPassAuth, authController.verifyOTP);
router.post('/login/logout', adminPassAuth, authController.logout);

// QRIS Endpoints
router.post('/create-qris', apiKeyAuth, qrisController.createQris);
router.get('/create-qris', apiKeyAuth, qrisController.createQris);
router.get('/qr-status/:id', qrisController.getQrStatus);

// Order Management Endpoints
router.get('/orders', apiKeyAuth, orderController.getAllOrders);
router.delete('/orders/clear', apiKeyAuth, orderController.clearAllOrders);
router.post('/orders/clear', apiKeyAuth, orderController.clearAllOrders);
router.delete('/orders/reset', apiKeyAuth, orderController.clearAllOrders);
router.post('/orders/reset', apiKeyAuth, orderController.clearAllOrders);
router.post('/orders/manual-claim', apiKeyAuth, orderController.manualClaimOrder);

// Transaction & Payment Verification Endpoints
router.get('/check-payment', apiKeyAuth, transactionController.checkPayment);
router.post('/check-payment', apiKeyAuth, transactionController.checkPayment);

// Webhook & Logs Monitoring Endpoints
router.get('/webhooks', apiKeyAuth, webhookController.getAllWebhooks);
router.get('/logs', apiKeyAuth, (req, res) => res.json({ success: true, logs: activityLogs }));

// QRIS Settings Endpoints (Database Storage)
router.get('/settings/qris', async (req, res) => {
    const db = require('../db');
    const qrisString = await db.getStaticQris();
    res.json({ success: true, qris_string: qrisString });
});

router.post('/settings/qris', adminPassAuth, async (req, res) => {
    const db = require('../db');
    const qrisString = (req.body?.qris_string || req.body?.qris || '').trim();
    if (!qrisString) {
        return res.status(400).json({ success: false, message: 'String QRIS Statis tidak boleh kosong' });
    }
    await db.saveStaticQris(qrisString);
    logActivity('SUCCESS', '[SETTINGS] Kode QRIS Statis Merchant berhasil disimpan ke Database PostgreSQL!');
    res.json({ success: true, message: 'Kode QRIS Statis Merchant berhasil disimpan ke Database PostgreSQL!' });
});

module.exports = router;
