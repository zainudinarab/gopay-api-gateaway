// Order Controller - Order Management, Reset & Manual Claim
const db = require('../db');
const { logActivity } = require('../services/loggerService');

const getAllOrders = async (req, res) => {
    const limit = parseInt(req.query.limit || '100', 10);
    const orders = await db.getAllOrders(limit);
    res.json({
        success: true,
        total: orders.length,
        data: orders
    });
};

const clearAllOrders = async (req, res) => {
    try {
        await db.clearAllOrders();
        logActivity('WARNING', '[DATABASE RESET] SELURUH data order, klaim transaksi, dan antrian webhook berhasil dibersihkan.');
        res.json({
            success: true,
            message: 'Database berhasil dibersihkan! Seluruh data order, klaim transaksi, dan antrian webhook telah dihapus.'
        });
    } catch (err) {
        logActivity('ERROR', `Gagal mereset database: ${err.message}`);
        res.status(500).json({ success: false, message: 'Gagal mereset database', error: err.message });
    }
};

const manualClaimOrder = async (req, res) => {
    const qrisId = req.body?.qris_id || req.body?.qrisId || req.query?.qris_id;
    const txId = req.body?.transaction_id || req.body?.txId || req.query?.transaction_id;
    const notes = req.body?.notes || 'Manual Validation by Admin';

    if (!qrisId) {
        return res.status(400).json({ success: false, message: 'Param qris_id wajib diisi' });
    }

    const order = await db.getOrder(qrisId);
    if (!order) {
        return res.status(404).json({ success: false, message: 'Order QRIS tidak ditemukan di database' });
    }

    const matched = {
        transaction_id: txId || `MANUAL-${Date.now()}`,
        order_id: order.trxId,
        amount: order.amount,
        payer_issuer: 'MANUAL_ADMIN_VALIDATION',
        payment_type: 'MANUAL_CLAIM',
        transaction_time: new Date().toISOString(),
        notes: notes
    };

    if (txId) {
        await db.claimTransaction(txId, {
            order_id: order.trxId,
            qrisId: order.qrisId,
            amount: order.amount,
            payer_issuer: matched.payer_issuer,
            payment_type: matched.payment_type,
            transaction_time: matched.transaction_time
        });
    }

    await db.updateOrderStatus(order.qrisId, 'PAID', matched);

    if (order.webhookUrl) {
        await db.enqueueWebhook({
            qrisId: order.qrisId,
            clientRefId: order.clientRefId,
            webhookUrl: order.webhookUrl,
            payload: {
                event: 'payment.success',
                qris_id: order.qrisId,
                trx_id: order.trxId,
                client_ref_id: order.clientRefId,
                status: 'PAID',
                amount: order.amount,
                base_amount: order.baseAmount,
                unique_code: order.uniqueCode,
                transaction: matched
            }
        });
        await db.updateOrderWebhookStatus(order.qrisId, 'QUEUED');
    }

    logActivity('SUCCESS', `[MANUAL CLAIM] Order QRIS ID ${order.qrisId} berhasil divalidasi lunas secara manual oleh Admin!`);

    res.json({
        success: true,
        message: `Order QRIS ${order.qrisId} berhasil divalidasi LUNAS secara manual! Webhook telah diantrikan.`,
        data: {
            qris_id: order.qrisId,
            status: 'PAID',
            transaction: matched
        }
    });
};

module.exports = {
    getAllOrders,
    clearAllOrders,
    manualClaimOrder
};
