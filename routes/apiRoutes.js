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
router.get('/login/otp-status', adminPassAuth, authController.getOtpStatus);
router.get('/login/otp-status/:merchantId', adminPassAuth, authController.getOtpStatus);

// QRIS Endpoints
router.post('/create-qris', apiKeyAuth, qrisController.createQris);
router.get('/create-qris', apiKeyAuth, qrisController.createQris);
router.get('/qr-status/:id', qrisController.getQrStatus);
router.get('/qris/status/:id', qrisController.getQrStatus);

// Order Management Endpoints
router.get('/orders', apiKeyAuth, orderController.getAllOrders);
router.delete('/orders/clear', apiKeyAuth, orderController.clearAllOrders);
router.post('/orders/clear', apiKeyAuth, orderController.clearAllOrders);
router.delete('/orders/reset', apiKeyAuth, orderController.clearAllOrders);
router.post('/orders/reset', apiKeyAuth, orderController.clearAllOrders);
router.post('/orders/manual-claim', apiKeyAuth, orderController.manualClaimOrder);

// Transaction & Payment Verification Endpoints
router.get('/transactions', apiKeyAuth, transactionController.getTransactions);
router.get('/check-payment', apiKeyAuth, transactionController.checkPayment);
router.post('/check-payment', apiKeyAuth, transactionController.checkPayment);

// Webhook & Logs Monitoring Endpoints
router.get('/webhooks', apiKeyAuth, webhookController.getAllWebhooks);
router.get('/logs', apiKeyAuth, (req, res) => res.json({ success: true, logs: activityLogs }));

// Multi-Merchant Management Endpoints
router.get('/merchants', apiKeyAuth, async (req, res) => {
    const db = require('../db');
    const merchants = await db.getAllMerchants();
    res.json({ success: true, merchants });
});

router.post('/merchants/active', adminPassAuth, async (req, res) => {
    const db = require('../db');
    const merchantId = req.body?.merchant_id || req.body?.merchantId;
    if (!merchantId) return res.status(400).json({ success: false, message: 'merchant_id wajib diisi' });
    await db.setActiveMerchant(merchantId);
    logActivity('INFO', `[MULTI-MERCHANT] Merchant aktif diubah ke ID ${merchantId}`);
    res.json({ success: true, message: `Merchant aktif diubah ke ${merchantId}` });
});

router.get('/clients', adminPassAuth, async (req, res) => {
    const db = require('../db');
    const clients = await db.getAllApiClients();
    res.json({ success: true, clients });
});

router.post('/clients', adminPassAuth, async (req, res) => {
    const db = require('../db');
    const appId = req.body?.app_id || req.body?.appId;
    const appSecret = req.body?.app_secret || req.body?.appSecret;
    const clientName = req.body?.client_name || req.body?.clientName || appId;
    const isActive = req.body?.is_active !== undefined ? req.body.is_active : true;

    if (!appId || !String(appId).trim()) {
        return res.status(400).json({ success: false, message: 'App ID (Username API) wajib diisi' });
    }
    if (!appSecret || !String(appSecret).trim()) {
        return res.status(400).json({ success: false, message: 'App Secret (Password API) wajib diisi' });
    }

    const ok = await db.saveApiClient(appId, appSecret, clientName, isActive);
    if (ok) {
        logActivity('INFO', `[API CLIENTS] Client API '${appId}' (${clientName}) berhasil disimpan di database`);
        const clients = await db.getAllApiClients();
        res.json({ success: true, message: `Client API '${appId}' berhasil disimpan!`, clients });
    } else {
        res.status(500).json({ success: false, message: `Gagal menyimpan Client API '${appId}'` });
    }
});

router.delete('/clients/:app_id', adminPassAuth, async (req, res) => {
    const db = require('../db');
    const appId = req.params.app_id;
    if (!appId) return res.status(400).json({ success: false, message: 'App ID wajib diisi' });
    const ok = await db.deleteApiClient(appId);
    if (ok) {
        logActivity('WARNING', `[API CLIENTS] Client API '${appId}' berhasil dihapus dari database`);
        const clients = await db.getAllApiClients();
        res.json({ success: true, message: `Client API '${appId}' berhasil dihapus`, clients });
    } else {
        res.status(500).json({ success: false, message: `Gagal menghapus Client API '${appId}'` });
    }
});

router.delete('/merchants/:id', adminPassAuth, async (req, res) => {
    const db = require('../db');
    const merchantId = req.params.id;
    const ok = await db.deleteMerchant(merchantId);
    if (ok) {
        logActivity('WARNING', `[MULTI-MERCHANT] Merchant ID ${merchantId} berhasil dihapus dari database`);
        res.json({ success: true, message: `Merchant ${merchantId} berhasil dihapus` });
    } else {
        res.status(500).json({ success: false, message: `Gagal menghapus merchant ${merchantId} dari database` });
    }
});

router.post('/merchants/:id/delete', adminPassAuth, async (req, res) => {
    const db = require('../db');
    const merchantId = req.params.id;
    const ok = await db.deleteMerchant(merchantId);
    if (ok) {
        logActivity('WARNING', `[MULTI-MERCHANT] Merchant ID ${merchantId} berhasil dihapus dari database`);
        res.json({ success: true, message: `Merchant ${merchantId} berhasil dihapus` });
    } else {
        res.status(500).json({ success: false, message: `Gagal menghapus merchant ${merchantId} dari database` });
    }
});

// QRIS Settings Endpoints (Database Storage)
router.get('/settings/qris', async (req, res) => {
    const db = require('../db');
    const merchantId = req.query?.merchant_id || null;
    const qrisString = await db.getStaticQris(merchantId);
    res.json({ success: true, qris_string: qrisString });
});

router.get('/settings/merchant-list', adminPassAuth, async (req, res) => {
    const db = require('../db');
    const settings = await db.getAllMerchants();
    res.json({ success: true, settings });
});

// Tambah Merchant Baru secara Manual (tanpa OTP)
router.post('/settings/merchant', adminPassAuth, async (req, res) => {
    const db = require('../db');
    const { logActivity } = require('../services/loggerService');

    const merchantId = (req.body?.merchant_id || req.body?.merchantId || '').trim();
    const merchantName = (req.body?.merchant_name || req.body?.merchantName || '').trim();
    const phoneNumber = (req.body?.phone_number || req.body?.phoneNumber || req.body?.phone || '').trim();
    const merchantType = (req.body?.merchant_type || req.body?.merchantType || 'gopay').trim();
    const city = (req.body?.city || '').trim();
    const qrisString = (req.body?.static_qris || req.body?.qris_string || '').trim();

    if (!merchantId) return res.status(400).json({ success: false, message: 'merchant_id wajib diisi' });

    await db.saveMerchant({
        merchant_id: merchantId,
        merchant_name: merchantName || 'Merchant GoPay',
        phone_number: phoneNumber || null,
        merchant_type: merchantType,
        city: city || '',
        static_qris: qrisString || null
    });
    logActivity('SUCCESS', `[MULTI-MERCHANT] Merchant baru "${merchantName || merchantId}" (ID: ${merchantId}) berhasil ditambahkan`);
    res.json({ success: true, message: `Merchant "${merchantName || merchantId}" berhasil ditambahkan ke database` });
});

// Update / Edit Merchant yang Sudah Ada
router.put('/settings/merchant/:id', adminPassAuth, async (req, res) => {
    const db = require('../db');
    const { logActivity } = require('../services/loggerService');

    const merchantId = req.params.id;
    const fields = {};
    if (req.body?.merchant_name !== undefined) fields.merchant_name = req.body.merchant_name;
    if (req.body?.phone_number !== undefined || req.body?.phone !== undefined) fields.phone_number = req.body.phone_number || req.body.phone;
    if (req.body?.merchant_type !== undefined) fields.merchant_type = req.body.merchant_type;
    if (req.body?.city !== undefined) fields.city = req.body.city;
    if (req.body?.static_qris !== undefined) fields.static_qris = req.body.static_qris;

    const result = await db.updateMerchantSettings(merchantId, fields);
    if (!result.success) return res.status(400).json(result);

    logActivity('INFO', `[MULTI-MERCHANT] Data Merchant ID ${merchantId} berhasil diupdate`);
    res.json({ success: true, message: `Data Merchant ${merchantId} berhasil diperbarui` });
});

router.post('/settings/qris', adminPassAuth, async (req, res) => {

    const db = require('../db');
    const qrisString = (req.body?.qris_string || req.body?.qris || '').trim();
    const merchantId = req.body?.merchant_id || req.body?.merchantId || null;
    const merchantType = req.body?.merchant_type || req.body?.merchantType || 'gopay';

    if (!qrisString) {
        return res.status(400).json({ success: false, message: 'String QRIS Statis tidak boleh kosong' });
    }
    await db.saveStaticQris(qrisString, merchantId, merchantType);
    logActivity('SUCCESS', `[SETTINGS] Kode QRIS Statis Merchant (${merchantType.toUpperCase()} - ID: ${merchantId || 'AUTO'}) berhasil disimpan ke Database!`);
    res.json({ success: true, message: `Kode QRIS Statis Merchant (${merchantType.toUpperCase()}) berhasil disimpan ke Database!` });
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
