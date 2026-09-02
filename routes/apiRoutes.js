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

router.post('/settings/upload-qris', adminPassAuth, async (req, res) => {
    const db = require('../db');
    const { Jimp } = require('jimp');
    const jsQR = require('jsqr');

    try {
        const imageBase64 = req.body?.image || req.body?.image_base64;
        if (!imageBase64) {
            return res.status(400).json({ success: false, message: 'File gambar QRIS (Base64) wajib diunggah.' });
        }

        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const img = await Jimp.read(buffer);

        const code = jsQR(new Uint8ClampedArray(img.bitmap.data), img.bitmap.width, img.bitmap.height);
        if (!code || !code.data) {
            return res.status(400).json({ success: false, message: 'Gagal mendeteksi QR Code dari gambar yang diunggah. Pastikan gambar jelas & tajam.' });
        }

        const qrisString = code.data.trim();
        await db.saveStaticQris(qrisString);
        logActivity('SUCCESS', `[SETTINGS] Berhasil mendeteksi & menyimpan Kode QRIS Statis dari Gambar ke Database PostgreSQL!`);

        res.json({
            success: true,
            message: 'Berhasil mendeteksi & menyimpan Kode QRIS Statis dari Gambar ke Database PostgreSQL!',
            qris_string: qrisString
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal memproses gambar QRIS: ' + err.message });
    }
});

module.exports = router;
