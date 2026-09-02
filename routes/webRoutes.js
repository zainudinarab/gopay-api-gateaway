// Web Router - Page Rendering Routes
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const db = require('../db');
const { apiKeyAuth } = require('../middleware/authMiddleware');
const qrisController = require('../controllers/qrisController');
const transactionController = require('../controllers/transactionController');
const { renderAdminDashboard } = require('../views/adminDashboard');

// Halaman Admin Portal Dashboard (/login)
router.get('/login', async (req, res) => {
    let merchantSession = await db.getMerchantSession();
    if (!merchantSession) {
        const sessionPath = path.join(__dirname, '..', '.GOPAY_SESI_JANGAN_DIHAPUS.json');
        try {
            if (fs.existsSync(sessionPath) && fs.statSync(sessionPath).isFile()) {
                const content = fs.readFileSync(sessionPath, 'utf8');
                if (content && content.trim().startsWith('{')) {
                    merchantSession = JSON.parse(content);
                }
            }
        } catch (e) {}
    }

    const html = renderAdminDashboard(merchantSession, db.dbType);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});

// Halaman Web Checkout QRIS (/qr/:id)
router.get('/qr/:id', qrisController.renderQrCheckout);

// Mutasi Transaksi Endpoint (/transactions)
router.get('/transactions', apiKeyAuth, transactionController.getTransactions);

module.exports = router;
