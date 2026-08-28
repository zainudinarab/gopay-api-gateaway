// Transaction Controller - Fetch Mutations & Payment Checks
const db = require('../db');
const sessionManager = require('../sessionManager');
const { fetchCachedTransactions, verifyPayment, autoLoginGojek, mutationCache } = require('../services/gojekService');
const { logActivity } = require('../services/loggerService');

const getTransactions = async (req, res) => {
    let headers = await sessionManager.getValidHeaders(req.headers['user-agent']);

    if (!headers && process.env.GOPAY_EMAIL && process.env.GOPAY_PASSWORD) {
        logActivity('INFO', 'Sesi tidak ditemukan, memicu auto-login...');
        await autoLoginGojek();
        headers = await sessionManager.getValidHeaders(req.headers['user-agent']);
    }

    if (!headers) return res.status(400).json({ success: false, error: 'Sesi GoPay belum ada. Silakan login via browser di /login' });

    try {
        const merchantId = req.headers['x-gopay-merchant-id'] || process.env.GOPAY_MERCHANT_ID || '';
        let rawTransactions;
        try {
            rawTransactions = await fetchCachedTransactions(headers, merchantId);
        } catch (firstErr) {
            if (firstErr.response && firstErr.response.status === 401) {
                logActivity('WARNING', 'Sesi expired (401). Memulai auto-refresh...');
                const refreshed = await sessionManager.refreshSession();
                if (refreshed) {
                    const newHeaders = await sessionManager.getValidHeaders(req.headers['user-agent']);
                    mutationCache.data = null;
                    rawTransactions = await fetchCachedTransactions(newHeaders, merchantId);
                } else {
                    throw firstErr;
                }
            } else {
                throw firstErr;
            }
        }

        const filterStartMs = req.query.startTime ? parseInt(req.query.startTime, 10) * 1000 : 0;
        const filterEndMs = req.query.endTime ? parseInt(req.query.endTime, 10) * 1000 : Date.now();
        const pageSize = parseInt(req.query.pageSize || '20', 10);

        const formattedTransactions = [];
        for (const tx of rawTransactions) {
            const txMs = new Date(tx.transaction_time || tx.created_at || tx.settlement_time || 0).getTime();
            if (txMs >= filterStartMs && txMs <= filterEndMs) {
                let amt = parseInt(tx.gross_amount || tx.real_gross_amount || 0, 10);
                if (amt > 0 && amt % 100 === 0) amt = amt / 100;
                const txId = tx.id || tx.order_id || tx.wallstreet_transaction_id;
                let claimed = await db.getClaimedTransaction(txId);

                if (!claimed || !claimed.qrisId) {
                    const GRACE_PERIOD_MS = 2 * 60 * 60 * 1000;
                    const TOLERANCE_MS = 12 * 60 * 60 * 1000;
                    const pendingOrders = (await db.getPendingOrdersForAmount(amt)).filter(order => {
                        const txDate = new Date(txMs);
                        const orderCreateDate = new Date(order.createdAt);
                        const orderCreateMs = orderCreateDate.getTime();
                        const orderExpireMs = new Date(order.expiresAt).getTime();
                        const isSameCalendarDay = (txDate.getFullYear() === orderCreateDate.getFullYear() &&
                                                   txDate.getMonth() === orderCreateDate.getMonth() &&
                                                   txDate.getDate() === orderCreateDate.getDate());
                        const isWithinActiveWindow = ((orderCreateMs - TOLERANCE_MS) <= txMs && 
                                                      txMs <= (orderExpireMs + GRACE_PERIOD_MS));
                        return isSameCalendarDay || isWithinActiveWindow;
                    });

                    if (pendingOrders.length > 0) {
                        const targetOrder = pendingOrders[0];
                        const matched = {
                            transaction_id: txId,
                            order_id: tx.order_id,
                            amount: amt,
                            payer_issuer: tx.qris_provider_aspi_issuer || 'GoPay / Bank',
                            payment_type: tx.payment_type || tx.transaction_source || 'GOPAY_INSTORE',
                            transaction_time: tx.transaction_time || tx.settlement_time
                        };
                        await db.claimTransaction(txId, {
                            order_id: tx.order_id,
                            qrisId: targetOrder.qrisId,
                            amount: amt,
                            payer_issuer: matched.payer_issuer,
                            payment_type: matched.payment_type,
                            transaction_time: matched.transaction_time
                        });
                        await db.updateOrderStatus(targetOrder.qrisId, 'PAID', matched);

                        if (targetOrder.webhookUrl && (targetOrder.webhookStatus === 'PENDING' || targetOrder.webhookStatus === 'NONE')) {
                            await db.enqueueWebhook({
                                qrisId: targetOrder.qrisId,
                                clientRefId: targetOrder.clientRefId,
                                webhookUrl: targetOrder.webhookUrl,
                                payload: {
                                    event: 'payment.success',
                                    qris_id: targetOrder.qrisId,
                                    trx_id: targetOrder.trxId,
                                    client_ref_id: targetOrder.clientRefId,
                                    status: 'PAID',
                                    amount: targetOrder.amount,
                                    base_amount: targetOrder.baseAmount,
                                    unique_code: targetOrder.uniqueCode,
                                    transaction: matched
                                }
                            });
                            await db.updateOrderWebhookStatus(targetOrder.qrisId, 'QUEUED');
                        }
                        logActivity('SUCCESS', `[ON-THE-FLY RECONCILER] TRX ${txId} (Rp ${amt}) otomatis dicocokkan dengan QRIS ID ${targetOrder.qrisId}`);
                        claimed = await db.getClaimedTransaction(txId);
                    }
                }

                formattedTransactions.push({
                    amount: amt,
                    status: tx.transaction_status ? tx.transaction_status.toLowerCase() : 'success',
                    time: tx.transaction_time || tx.settlement_time,
                    issuer: tx.qris_provider_aspi_issuer || 'GoPay / Bank',
                    order_id: tx.order_id,
                    transaction_id: txId,
                    qris_id: claimed ? claimed.qrisId : null
                });
            }
            if (formattedTransactions.length >= pageSize) break;
        }

        res.json({
            success: true,
            total_amount: String(formattedTransactions.reduce((total, tx) => total + tx.amount, 0)),
            data: { transactions: formattedTransactions }
        });
    } catch (err) {
        console.error('[TRANSACTIONS ERROR]:', err);
        res.status(500).json({ success: false, error: err.message, stack: err.stack });
    }
};

const checkPayment = async (req, res) => {
    const amount = req.body?.amount || req.query?.amount;
    const startTime = req.body?.startTime || req.query?.startTime || req.query?.start_time;
    const scopeId = req.body?.trx_id || req.query?.trx_id || null;

    if (!amount || isNaN(amount)) {
        return res.status(400).json({ success: false, message: 'Nominal pembayaran tidak valid' });
    }

    try {
        const merchantId = req.headers['x-gopay-merchant-id'] || null;
        const matchedTransaction = await verifyPayment(amount, startTime, merchantId, req.headers['user-agent'], scopeId);

        if (matchedTransaction) {
            logActivity('SUCCESS', `Pembayaran terverifikasi lunas untuk nominal Rp ${parseInt(amount, 10)}`, matchedTransaction);
            return res.json({
                success: true,
                paid: true,
                transaction: matchedTransaction
            });
        } else {
            return res.json({
                success: true,
                paid: false,
                message: 'Pembayaran belum ditemukan atau sudah pernah diklaim'
            });
        }
    } catch (err) {
        const errorDetail = err.response ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message;
        logActivity('ERROR', `Gagal periksa pembayaran: ${errorDetail}`);
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil data transaksi dari API GoPay',
            error: errorDetail
        });
    }
};

module.exports = {
    getTransactions,
    checkPayment
};
