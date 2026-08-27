// Web Router - Page Rendering Routes
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const { apiKeyAuth } = require('../middleware/authMiddleware');
const qrisController = require('../controllers/qrisController');
const transactionController = require('../controllers/transactionController');
const { renderAdminDashboard } = require('../views/adminDashboard');

// Halaman Admin Portal Dashboard (/login)
router.get('/login', (req, res) => {
    const sessionExists = fs.existsSync(path.join(__dirname, '..', '.GOPAY_SESI_JANGAN_DIHAPUS.json'));
    const html = renderAdminDashboard(sessionExists);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});

// Halaman Web Checkout QRIS (/qr/:id)
router.get('/qr/:id', qrisController.renderQrCheckout);

// Mutasi Transaksi Endpoint (/transactions)
router.get('/transactions', apiKeyAuth, transactionController.getTransactions);

module.exports = router;
