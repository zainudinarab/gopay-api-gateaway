// ShopeePay Merchant API Service (Extensible Provider Module)
const { logActivity } = require('./loggerService');

const shopeepayCache = {
    data: null,
    fetchedAt: 0,
    ttl: 10000
};

/**
 * Fetch ShopeePay Transactions & QRIS Mutations
 */
async function fetchTransactions(headers, customMerchantId, forceRefresh = false) {
    logActivity('INFO', `[SHOPEEPAY] Checking transactions for merchant: ${customMerchantId || 'default'}`);
    // Stub implementation for ShopeePay Partner API integration
    // When adding ShopeePay credentials in .env (e.g. SHOPEEPAY_PARTNER_ID, SHOPEEPAY_SECRET_KEY)
    // The API request logic goes here.
    return [];
}

/**
 * Verify Payment for ShopeePay QRIS
 */
async function verifyPayment(targetAmount, orderCreationTime = null, customMerchantId = null, userAgent = null, qrisId = null, forceRefresh = false) {
    logActivity('INFO', `[SHOPEEPAY] Verifying payment of Rp ${targetAmount}`);
    // Return payment status object matching standard gateway format
    return {
        matched: false,
        message: 'ShopeePay integration module ready for API keys configuration.'
    };
}

module.exports = {
    name: 'SHOPEEPAY',
    fetchTransactions,
    verifyPayment
};
