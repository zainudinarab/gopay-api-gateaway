// GoJek API Service - Transactions & Payment Verification
const axios = require('axios');
const path = require('path');
const { spawn } = require('child_process');
const db = require('../db');
const sessionManager = require('../sessionManager');
const { logActivity } = require('./loggerService');

const mutationCache = {
    data: null,
    fetchedAt: 0,
    ttl: 10000 // 10 Detik TTL Cache Mutasi
};

async function autoLoginGojek() {
    logActivity('INFO', '[AUTO-LOGIN] Memulai auto-login otomatis ke GoBiz...');
    const loginScript = path.join(__dirname, '..', 'login.js');
    return new Promise((resolve, reject) => {
        const pyProc = spawn(process.execPath, [loginScript], { cwd: path.join(__dirname, '..') });
        let stdoutData = '';
        let stderrData = '';

        pyProc.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });

        pyProc.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        pyProc.on('close', (code) => {
            if (code === 0 && (stdoutData.includes('Berhasil') || stdoutData.includes('Sesi'))) {
                logActivity('SUCCESS', '[AUTO-LOGIN] Auto-login GoBiz BERHASIL!');
                mutationCache.data = null;
                resolve(true);
            } else {
                logActivity('ERROR', `[AUTO-LOGIN] Auto-login GAGAL (exit code ${code}). Stderr: ${stderrData}`);
                resolve(false);
            }
        });
    });
}

async function fetchCachedTransactions(headers, customMerchantId, forceRefresh = false) {
    const now = new Date();
    const nowMs = now.getTime();
    if (!forceRefresh && mutationCache.data && (nowMs - mutationCache.fetchedAt) < mutationCache.ttl) {
        return mutationCache.data;
    }

    const merchantId = customMerchantId || process.env.GOPAY_MERCHANT_ID || '';
    const startTimeISO = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
    const endTimeISO = now.toISOString();

    const GOJEK_TRANSACTIONS_URL = 'https://api.gojekapi.com/merchant-analytics/v2/merchants/transactions';
    const response = await axios.get(GOJEK_TRANSACTIONS_URL, {
        headers: headers,
        params: {
            from: 0,
            size: 50,
            statuses: 'SETTLEMENT,CAPTURE,REFUND,PARTIAL_REFUND',
            payment_types: 'QRIS,GOPAY,OFFLINE_CREDIT_CARD,OFFLINE_DEBIT_CARD,CREDIT_CARD',
            start_time: startTimeISO,
            end_time: endTimeISO,
            merchant_ids: merchantId
        },
        timeout: 10000
    });

    const txList = response.data?.transactions || response.data?.data?.transactions || response.data?.data || [];
    mutationCache.data = txList;
    mutationCache.fetchedAt = nowMs;
    return txList;
}

async function verifyPayment(targetAmount, orderCreationTime = null, customMerchantId = null, userAgent = null, qrisId = null, forceRefresh = false) {
    if (forceRefresh) {
        mutationCache.data = null;
    }
    let headers = await sessionManager.getValidHeaders(userAgent);

    if (!headers && process.env.GOPAY_EMAIL && process.env.GOPAY_PASSWORD) {
        logActivity('INFO', 'Sesi tidak ditemukan, memicu auto-login...');
        await autoLoginGojek();
        headers = await sessionManager.getValidHeaders(userAgent);
    }

    if (!headers) throw new Error('Sesi GoPay belum ada. Silakan login via browser di /login');

    const merchantId = customMerchantId || process.env.GOPAY_MERCHANT_ID || '';
    let rawTransactions;

    try {
        rawTransactions = await fetchCachedTransactions(headers, merchantId, forceRefresh);
    } catch (firstErr) {
        if (firstErr.response && firstErr.response.status === 401) {
            logActivity('WARNING', 'Sesi expired (401). Memulai auto-refresh...');
            const refreshed = await sessionManager.refreshSession();
            if (refreshed) {
                const newHeaders = await sessionManager.getValidHeaders(userAgent);
                mutationCache.data = null;
                rawTransactions = await fetchCachedTransactions(newHeaders, merchantId, true);
            } else {
                throw firstErr;
            }
        } else {
            throw firstErr;
        }
    }

    const filterStartTimeMs = orderCreationTime 
        ? new Date(orderCreationTime).getTime() 
        : Date.now() - (12 * 60 * 60 * 1000);

    for (const tx of rawTransactions) {
        const txStatus = (tx.transaction_status || '').toLowerCase();
        if (txStatus !== 'success' && txStatus !== 'settlement' && txStatus !== 'completed') {
            continue;
        }

        let txAmount = parseInt(tx.gross_amount || tx.real_gross_amount || 0, 10);
        if (txAmount > 0 && txAmount % 100 === 0) txAmount = txAmount / 100;

        const txId = tx.id || tx.order_id || tx.wallstreet_transaction_id;
        const txTimestamp = new Date(tx.transaction_time || tx.settlement_time || tx.created_at || 0).getTime();

        if (txAmount === targetAmount && txTimestamp >= filterStartTimeMs) {
            const existingClaim = db.getClaimedTransaction(txId);

            if (!existingClaim) {
                const GRACE_PERIOD_MS = 2 * 60 * 60 * 1000;
                const TOLERANCE_MS = 12 * 60 * 60 * 1000;

                function isSameDateOrActiveWindow(order) {
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
                }

                let targetOwnerQrisId = null;

                if (qrisId) {
                    const callerOrder = db.getOrder(qrisId);
                    if (callerOrder && callerOrder.status === 'PENDING' && callerOrder.amount === txAmount) {
                        if (isSameDateOrActiveWindow(callerOrder)) {
                            targetOwnerQrisId = qrisId;
                        }
                    }
                }

                if (!targetOwnerQrisId) {
                    const pendingOrders = db.getPendingOrdersForAmount(targetAmount)
                        .filter(o => isSameDateOrActiveWindow(o));
                    if (pendingOrders.length > 0) {
                        targetOwnerQrisId = pendingOrders[0].qrisId;
                    }
                }

                if (!targetOwnerQrisId) {
                    targetOwnerQrisId = qrisId;
                }

                const matched = {
                    transaction_id: txId,
                    order_id: tx.order_id,
                    amount: txAmount,
                    payer_issuer: tx.qris_provider_aspi_issuer || 'GoPay / Bank',
                    payment_type: tx.payment_type || tx.transaction_source || 'GOPAY_INSTORE',
                    transaction_time: tx.transaction_time || tx.settlement_time
                };

                db.claimTransaction(txId, {
                    order_id: tx.order_id,
                    qrisId: targetOwnerQrisId,
                    amount: txAmount,
                    payer_issuer: matched.payer_issuer,
                    payment_type: matched.payment_type,
                    transaction_time: matched.transaction_time
                });

                if (targetOwnerQrisId) {
                    db.updateOrderStatus(targetOwnerQrisId, 'PAID', matched);

                    const ownerOrder = db.getOrder(targetOwnerQrisId);
                    if (ownerOrder && ownerOrder.webhookUrl && (ownerOrder.webhookStatus === 'PENDING' || ownerOrder.webhookStatus === 'NONE')) {
                        db.enqueueWebhook({
                            qrisId: targetOwnerQrisId,
                            clientRefId: ownerOrder.clientRefId,
                            webhookUrl: ownerOrder.webhookUrl,
                            payload: {
                                event: 'payment.success',
                                qris_id: ownerOrder.qrisId,
                                trx_id: ownerOrder.trxId,
                                client_ref_id: ownerOrder.clientRefId,
                                status: 'PAID',
                                amount: ownerOrder.amount,
                                base_amount: ownerOrder.baseAmount,
                                unique_code: ownerOrder.uniqueCode,
                                transaction: matched
                            }
                        });
                        db.updateOrderWebhookStatus(targetOwnerQrisId, 'QUEUED');
                        logActivity('INFO', `Webhook notifikasi dimasukkan ke antrian queue untuk QRIS ${targetOwnerQrisId}`);
                    }
                }

                logActivity('INFO', `TRX ${txId} diklaim oleh QRIS ${targetOwnerQrisId || 'manual-check'} (Closest Creation Match)`);
                
                if (!qrisId || qrisId === targetOwnerQrisId) {
                    return matched;
                } else {
                    continue;
                }
            } else if (qrisId && existingClaim.qrisId === qrisId) {
                return {
                    transaction_id: txId,
                    order_id: existingClaim.orderId,
                    amount: existingClaim.amount,
                    payer_issuer: existingClaim.payerIssuer,
                    payment_type: existingClaim.paymentType,
                    transaction_time: existingClaim.transactionTime
                };
            } else {
                logActivity('INFO', `TRX ${txId} sudah diklaim oleh QRIS ${existingClaim.qrisId || 'lain'}, skip untuk QRIS ${qrisId}`);
                continue;
            }
        }
    }
    return null;
}

module.exports = {
    mutationCache,
    autoLoginGojek,
    fetchCachedTransactions,
    verifyPayment
};
