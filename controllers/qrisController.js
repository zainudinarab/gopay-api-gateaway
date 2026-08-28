// QRIS Controller - Dynamic QRIS Creation & Status Check
const QRCode = require('qrcode');
const db = require('../db');
const { convertStaticToDynamicQRIS } = require('../services/helperService');
const { verifyPayment } = require('../services/gojekService');
const { logActivity } = require('../services/loggerService');
const { renderQrisCheckout } = require('../views/qrisCheckout');

const createQris = async (req, res) => {
    try {
        let amountInput = req.body?.amount || req.query?.amount;
        const clientRefId = req.body?.client_ref_id || req.body?.ref_id || req.query?.client_ref_id || req.query?.ref_id || null;
        const appId = req.appId || req.body?.app_id || req.query?.app_id || req.headers['x-app-id'];
        const webhookUrl = req.body?.webhook_url || req.body?.callback_url || req.query?.webhook_url || req.query?.callback_url || null;
        const expiresHoursInput = req.body?.expires_in_hours || req.query?.expires_in_hours || 12;

        if (!amountInput || isNaN(amountInput)) {
            return res.status(400).json({ success: false, message: 'Nominal pembayaran (amount) wajib diisi' });
        }

        const baseAmount = parseInt(amountInput, 10);
        if (baseAmount < 1) {
            return res.status(400).json({ success: false, message: 'Nominal minimal Rp 1' });
        }

        const staticQR = process.env.GOPAY_STATIC_QRIS;
        if (!staticQR) {
            return res.status(500).json({ success: false, message: 'GOPAY_STATIC_QRIS belum dikonfigurasi di file .env' });
        }

        const QRIS_EXPIRY_MS = parseFloat(expiresHoursInput) * 60 * 60 * 1000;
        const activeCodes = db.getActiveUniqueCodes(baseAmount, QRIS_EXPIRY_MS);

        let uniqueCode = 0;
        for (let i = 1; i <= 999; i++) {
            if (!activeCodes.includes(i)) {
                uniqueCode = i;
                break;
            }
        }

        const finalAmount = baseAmount + uniqueCode;
        const dynamicQRString = convertStaticToDynamicQRIS(staticQR, finalAmount);
        const qrisImageBase64 = await QRCode.toDataURL(dynamicQRString);

        const now = new Date();
        const expiresAt = new Date(now.getTime() + QRIS_EXPIRY_MS);
        const qrisId = 'QR-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        const trxId = 'TRX-' + Math.random().toString(36).substring(2, 10).toUpperCase();

        const newOrder = db.saveOrder({
            qrisId,
            trxId,
            clientRefId,
            appId,
            webhookUrl,
            amount: finalAmount,
            baseAmount,
            uniqueCode,
            qrisString: dynamicQRString,
            qrisCode: dynamicQRString,
            createdAt: now,
            expiresAt
        });

        logActivity('INFO', `QRIS Dinamis dibuat | TRX-ID: ${trxId} | App-ID: ${appId} | Ref-ID: ${clientRefId || '-'} | Nominal: Rp ${finalAmount} (Base: ${baseAmount}, Unik: +${uniqueCode}) | Expire: ${expiresHoursInput} jam`);

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        res.json({
            success: true,
            data: {
                qris_id: newOrder.qrisId,
                trx_id: newOrder.trxId,
                app_id: newOrder.appId,
                client_ref_id: newOrder.clientRefId,
                base_amount: baseAmount,
                unique_code: uniqueCode,
                amount: finalAmount,
                qris_string: dynamicQRString,
                qris_image_url: `${baseUrl}/qr/${newOrder.qrisId}.png`,
                qris_image_base64: qrisImageBase64,
                checkout_url: `${baseUrl}/qr/${newOrder.qrisId}`,
                webhook_url: webhookUrl,
                expires_at: expiresAt.toISOString(),
                expires_in_hours: parseFloat(expiresHoursInput)
            }
        });
    } catch (err) {
        logActivity('ERROR', `Gagal membuat QRIS: ${err.message}`);
        res.status(500).json({ success: false, message: 'Gagal membuat QRIS', error: err.message });
    }
};

const getQrStatus = async (req, res) => {
    const qrisId = req.params.id;
    const qris = db.getOrder(qrisId);
    if (!qris) {
        return res.json({ success: false, status: 'NOT_FOUND', message: 'QRIS tidak ditemukan' });
    }

    if (qris.status === 'PAID') {
        return res.json({ success: true, paid: true, status: 'PAID', transaction: qris.transaction });
    }

    if (Date.now() > qris.expiresAt.getTime()) {
        db.updateOrderStatus(qrisId, 'EXPIRED');
        return res.json({ success: false, paid: false, status: 'EXPIRED', message: 'QRIS sudah kedaluwarsa' });
    }

    try {
        const matched = await verifyPayment(qris.amount, qris.createdAt, null, req.headers['user-agent'], qrisId);
        if (matched) {
            logActivity('SUCCESS', `Pembayaran QRIS ID ${qrisId} terverifikasi lunas untuk nominal Rp ${qris.amount}`);
            return res.json({ success: true, paid: true, status: 'PAID', transaction: matched });
        }
        return res.json({ success: true, paid: false, status: 'PENDING', message: 'Belum ada pembayaran masuk' });
    } catch (err) {
        return res.json({ success: false, paid: false, status: 'PENDING', message: err.message });
    }
};

const renderQrCheckout = async (req, res) => {
    const rawId = req.params.id || '';
    const qrisId = rawId.replace(/\.png$/, '');
    const qris = db.getOrder(qrisId);

    if (!qris) {
        return res.status(404).send('<h2>404 - QRIS Tidak Ditemukan atau Sudah Kedaluwarsa</h2>');
    }

    const qrisString = qris.qrisString || qris.data || qris.qrisCode || process.env.GOPAY_STATIC_QRIS || '';

    if (rawId.endsWith('.png')) {
        const qrImageBuffer = await QRCode.toBuffer(qrisString);
        res.setHeader('Content-Type', 'image/png');
        return res.send(qrImageBuffer);
    }

    const qrImageUrl = await QRCode.toDataURL(qrisString);
    const expiresTimestamp = qris.expiresAt.getTime();
    const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(qris.amount);

    const html = renderQrisCheckout(qris, req, qrImageUrl, expiresTimestamp, formattedAmount);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
};

module.exports = {
    createQris,
    getQrStatus,
    renderQrCheckout
};
