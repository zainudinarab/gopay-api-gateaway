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

async function getMerchantSessionData() {
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
    return merchantSession;
}

// Favicon Handler (Avoid 404 Console Log in Browser)
router.get('/favicon.ico', (req, res) => res.status(204).end());

// Redirect Root to Dashboard
router.get('/', (req, res) => {
    res.redirect('/dashboard');
});

// Dedicated Halaman Login Admin (/login)
router.get('/login', async (req, res) => {
    const merchantSession = await getMerchantSessionData();
    const claimedTx = await db.getAllClaimedTransactions(200);
    const html = renderAdminDashboard(merchantSession, db.dbType, 'login', claimedTx);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});

// Dedicated Halaman Admin Dashboard (/dashboard)
router.get('/dashboard', async (req, res) => {
    const merchantSession = await getMerchantSessionData();
    const claimedTx = await db.getAllClaimedTransactions(200);
    const html = renderAdminDashboard(merchantSession, db.dbType, 'dashboard', claimedTx);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});

// Dedicated Halaman Sesi Merchant (/sessions /sessi)
router.get(['/sessions', '/sessi'], async (req, res) => {
    const merchantSession = await getMerchantSessionData();
    const claimedTx = await db.getAllClaimedTransactions(200);
    const html = renderAdminDashboard(merchantSession, db.dbType, 'sessions', claimedTx);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
});

// Logout Admin (/logout)
router.get('/logout', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`<script>localStorage.removeItem('admin_pass'); sessionStorage.removeItem('admin_pass'); window.location.href = '/login';</script>`);
});

// Halaman Web Checkout QRIS (/qr/:id)
router.get('/qr/:id', qrisController.renderQrCheckout);

// Mutasi Transaksi Endpoint (/transactions)
router.get('/transactions', apiKeyAuth, transactionController.getTransactions);

module.exports = router;
