// Transaction Controller - Fetch Mutations & Payment Checks
const db = require('../db');
const sessionManager = require('../sessionManager');
const { fetchCachedTransactions, verifyPayment, autoLoginGojek, mutationCache } = require('../services/gojekService');
const { logActivity } = require('../services/loggerService');

const getTransactions = async (req, res) => {
    try {
        const stats = await db.getClaimedTransactionStats();
        const dbClaimed = await db.getAllClaimedTransactions(100);

        let headers = await sessionManager.getValidHeaders(req.headers['user-agent']);
        if (!headers && process.env.GOPAY_EMAIL && process.env.GOPAY_PASSWORD) {
            logActivity('INFO', 'Sesi tidak ditemukan, memicu auto-login...');
            await autoLoginGojek();
            headers = await sessionManager.getValidHeaders(req.headers['user-agent']);
        }

        let rawTransactions = [];
        if (headers) {
            try {
                const merchantId = req.headers['x-gopay-merchant-id'] || process.env.GOPAY_MERCHANT_ID || '';
                rawTransactions = await fetchCachedTransactions(headers, merchantId);
            } catch (firstErr) {
                if (firstErr.response && firstErr.response.status === 401) {
                    logActivity('WARNING', 'Sesi expired (401). Memulai auto-refresh...');
                    const refreshed = await sessionManager.refreshSession();
                    if (refreshed) {
                        const newHeaders = await sessionManager.getValidHeaders(req.headers['user-agent']);
                        mutationCache.data = null;
                        rawTransactions = await fetchCachedTransactions(newHeaders, merchantId);
                    }
                }
            }
        }

        const filterStartMs = req.query.startTime ? parseInt(req.query.startTime, 10) * 1000 : 0;
        const filterEndMs = req.query.endTime ? parseInt(req.query.endTime, 10) * 1000 : Date.now();
        const pageSize = parseInt(req.query.pageSize || '50', 10);

        const formattedTransactions = [];
        if (rawTransactions && rawTransactions.length > 0) {
            for (const tx of rawTransactions) {
                const txMs = new Date(tx.transaction_time || tx.created_at || tx.settlement_time || 0).getTime();
                if (txMs >= filterStartMs && txMs <= filterEndMs) {
                    let amt = parseInt(tx.gross_amount || tx.real_gross_amount || 0, 10);
                    if (amt > 0 && amt % 100 === 0) amt = amt / 100;
                    const txId = tx.id || tx.order_id || tx.wallstreet_transaction_id;
                    let claimed = await db.getClaimedTransaction(txId);

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
        }

        if (formattedTransactions.length === 0 && dbClaimed.length > 0) {
            for (const c of dbClaimed) {
                formattedTransactions.push({
                    amount: c.amount,
                    status: 'success',
                    time: c.transaction_time || (c.claimed_at ? new Date(c.claimed_at).toISOString() : '-'),
                    issuer: c.payer_issuer || 'GoPay / Bank',
                    order_id: c.order_id || '-',
                    transaction_id: c.transaction_id,
                    qris_id: c.qris_id
                });
                if (formattedTransactions.length >= pageSize) break;
            }
        }

        const calculatedTotal = stats.totalAmount > 0 
            ? stats.totalAmount 
            : formattedTransactions.reduce((total, tx) => total + tx.amount, 0);

        res.json({
            success: true,
            total_amount: String(calculatedTotal),
            today_amount: String(stats.todayAmount),
            stats: stats,
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
