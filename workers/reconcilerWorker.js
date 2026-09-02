// Background Worker - Unclaimed Transactions Auto-Reconciler
const db = require('../db');
const sessionManager = require('../sessionManager');
const { fetchCachedTransactions } = require('../services/gojekService');
const { logActivity } = require('../services/loggerService');

async function reconcileUnclaimedTransactions() {
    try {
        // 1. Automatic Live Background Reconciliation directly from GoJek API
        const headers = await sessionManager.getValidHeaders();
        if (headers) {
            const merchantId = process.env.GOPAY_MERCHANT_ID || '';
            let rawTransactions = [];
            try {
                rawTransactions = await fetchCachedTransactions(headers, merchantId, true);
            } catch (err) {}

            if (rawTransactions && rawTransactions.length > 0) {
                for (const tx of rawTransactions) {
                    const txStatus = (tx.transaction_status || '').toLowerCase();
                    if (txStatus !== 'success' && txStatus !== 'settlement' && txStatus !== 'completed') continue;

                    let amt = parseInt(tx.gross_amount || tx.real_gross_amount || 0, 10);
                    if (amt > 0 && amt % 100 === 0) amt = amt / 100;
                    const txId = tx.id || tx.order_id || tx.wallstreet_transaction_id;
                    const txMs = new Date(tx.transaction_time || tx.settlement_time || tx.created_at || 0).getTime();

                    let claimed = await db.getClaimedTransaction(txId);
                    if (!claimed || !claimed.qrisId) {
                        const GRACE_PERIOD_MS = 2 * 60 * 60 * 1000;
                        const TOLERANCE_MS = 12 * 60 * 60 * 1000;
                        const rawPending = await db.getPendingOrdersForAmount(amt);
                        const pendingOrders = (rawPending || []).filter(order => {
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
                            logActivity('SUCCESS', `[BACKGROUND LIVE RECONCILER] TRX ${txId} (Rp ${amt}) otomatis dicocokkan dengan QRIS ID ${targetOrder.qrisId}`);
                        }
                    }
                }
            }
        }

        // 2. Reconcile any existing unclaimed transactions in DB
        const unclaimed = await db.getUnclaimedTransactions();
        if (!unclaimed || unclaimed.length === 0) return;

        for (const tx of unclaimed) {
            const txTimestamp = tx.transaction_time ? new Date(tx.transaction_time).getTime() : tx.claimed_at;
            const GRACE_PERIOD_MS = 2 * 60 * 60 * 1000;
            const TOLERANCE_MS = 12 * 60 * 60 * 1000;

            const rawPending = await db.getPendingOrdersForAmount(tx.amount);
            const pendingOrders = (rawPending || []).filter(order => {
                const txDate = new Date(txTimestamp);
                const orderCreateDate = new Date(order.createdAt);
                const orderCreateMs = orderCreateDate.getTime();
                const orderExpireMs = new Date(order.expiresAt).getTime();
                const isSameCalendarDay = (txDate.getFullYear() === orderCreateDate.getFullYear() &&
                                           txDate.getMonth() === orderCreateDate.getMonth() &&
                                           txDate.getDate() === orderCreateDate.getDate());
                const isWithinActiveWindow = ((orderCreateMs - TOLERANCE_MS) <= txTimestamp && 
                                              txTimestamp <= (orderExpireMs + GRACE_PERIOD_MS));
                return isSameCalendarDay || isWithinActiveWindow;
            });

            if (pendingOrders.length > 0) {
                const targetOrder = pendingOrders[0];
                const matched = {
                    transaction_id: tx.transaction_id,
                    order_id: tx.order_id,
                    amount: tx.amount,
                    payer_issuer: tx.payer_issuer,
                    payment_type: tx.payment_type,
                    transaction_time: tx.transaction_time
                };

                await db.updateClaimedTransactionOwner(tx.transaction_id, targetOrder.qrisId);
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

                logActivity('SUCCESS', `[AUTO-RECONCILER] Transaksi ${tx.transaction_id} (Rp ${tx.amount}) berhasil dicocokkan & diklaim oleh QRIS ID ${targetOrder.qrisId}`);
            }
        }
    } catch (err) {
        logActivity('ERROR', 'Error pada reconcileUnclaimedTransactions: ' + err.message);
    }
}

function startReconcilerWorker(intervalMs = 10000) {
    setInterval(reconcileUnclaimedTransactions, intervalMs);
    logActivity('SYSTEM', 'Background Auto-Reconciler Worker aktif (Auto Live GoJek Poll Active)');
}

module.exports = {
    reconcileUnclaimedTransactions,
    startReconcilerWorker
};
