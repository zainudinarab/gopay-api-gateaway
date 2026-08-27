// Background Worker - Unclaimed Transactions Auto-Reconciler
const db = require('../db');
const { logActivity } = require('../services/loggerService');

function reconcileUnclaimedTransactions() {
    try {
        const unclaimed = db.getUnclaimedTransactions();
        if (!unclaimed || unclaimed.length === 0) return;

        for (const tx of unclaimed) {
            const txTimestamp = tx.transaction_time ? new Date(tx.transaction_time).getTime() : tx.claimed_at;
            const GRACE_PERIOD_MS = 2 * 60 * 60 * 1000;
            const TOLERANCE_MS = 12 * 60 * 60 * 1000;

            const pendingOrders = db.getPendingOrdersForAmount(tx.amount).filter(order => {
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

                db.updateClaimedTransactionOwner(tx.transaction_id, targetOrder.qrisId);
                db.updateOrderStatus(targetOrder.qrisId, 'PAID', matched);

                if (targetOrder.webhookUrl && (targetOrder.webhookStatus === 'PENDING' || targetOrder.webhookStatus === 'NONE')) {
                    db.enqueueWebhook({
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
                    db.updateOrderWebhookStatus(targetOrder.qrisId, 'QUEUED');
                }

                logActivity('SUCCESS', `[AUTO-RECONCILER] Transaksi ${tx.transaction_id} (Rp ${tx.amount}) berhasil dicocokkan & diklaim oleh QRIS ID ${targetOrder.qrisId}`);
            }
        }
    } catch (err) {
        logActivity('ERROR', 'Error pada reconcileUnclaimedTransactions: ' + err.message);
    }
}

function startReconcilerWorker(intervalMs = 5000) {
    setInterval(reconcileUnclaimedTransactions, intervalMs);
    logActivity('SYSTEM', 'Background Auto-Reconciler Worker aktif');
}

module.exports = {
    reconcileUnclaimedTransactions,
    startReconcilerWorker
};
