// Transaction Controller - Fetch Mutations & Payment Checks
const db = require('../db');
const sessionManager = require('../sessionManager');
const { fetchCachedTransactions, verifyPayment, autoLoginGojek, mutationCache, getActiveMerchantId } = require('../services/gojekService');
const { logActivity } = require('../services/loggerService');

const getTransactions = async (req, res) => {
    try {
        const stats = await db.getClaimedTransactionStats();
        const dbClaimed = await db.getAllClaimedTransactions(200);

        let rawTransactions = [];
        try {
            let headers = await sessionManager.getValidHeaders(req.headers['user-agent']);
            if (headers) {
                const merchantId = await getActiveMerchantId(req.headers['x-gopay-merchant-id']);
                const fetchPromise = fetchCachedTransactions(headers, merchantId);
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('GoJek API Timeout')), 2500));
                rawTransactions = await Promise.race([fetchPromise, timeoutPromise]);
            }
        } catch (e) {
            // Silently fallback to database records if live fetch times out or fails
        }

        const pageSize = parseInt(req.query.pageSize || '100', 10);
        const formattedTransactions = [];
        const seenTxIds = new Set();

        // 1. First add live transactions from GoJek
        if (rawTransactions && Array.isArray(rawTransactions) && rawTransactions.length > 0) {
            for (const tx of rawTransactions) {
                let amt = parseInt(tx.gross_amount || tx.real_gross_amount || 0, 10);
                if (amt > 0 && amt % 100 === 0) amt = amt / 100;
                const txId = tx.id || tx.order_id || tx.wallstreet_transaction_id;
                if (!txId) continue;
                let claimed = await db.getClaimedTransaction(txId);
                seenTxIds.add(txId);

                formattedTransactions.push({
                    amount: amt,
                    status: tx.transaction_status ? tx.transaction_status.toLowerCase() : 'success',
                    time: tx.transaction_time || tx.settlement_time,
                    issuer: tx.qris_provider_aspi_issuer || 'GoPay / Bank',
                    order_id: tx.order_id,
                    transaction_id: txId,
                    qris_id: claimed ? claimed.qris_id : null,
                    merchant_id: (claimed ? claimed.merchant_id : null) || tx.merchant_id || '-'
                });
                if (formattedTransactions.length >= pageSize) break;
            }
        }

        // 2. Next add all stored transactions from database table claimed_transactions
        if (dbClaimed && Array.isArray(dbClaimed) && dbClaimed.length > 0) {
            for (const c of dbClaimed) {
                if (!seenTxIds.has(c.transaction_id)) {
                    seenTxIds.add(c.transaction_id);
                    let formattedTime = c.transaction_time || '-';
                    if ((!formattedTime || formattedTime === '-') && c.claimed_at) {
                        try {
                            const rawAt = Number(c.claimed_at);
                            formattedTime = isNaN(rawAt) ? String(c.claimed_at) : new Date(rawAt > 1e11 ? rawAt : rawAt * 1000).toISOString();
                        } catch (e) {
                            formattedTime = String(c.claimed_at);
                        }
                    }

                    formattedTransactions.push({
                        amount: c.amount,
                        status: 'success',
                        time: formattedTime,
                        issuer: c.payer_issuer || 'GoPay / Bank',
                        order_id: c.order_id || '-',
                        transaction_id: c.transaction_id,
                        qris_id: c.qris_id || null,
                        merchant_id: c.merchant_id || '-',
                        claimed_at: c.claimed_at
                    });
                }
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
            transactions: formattedTransactions,
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
