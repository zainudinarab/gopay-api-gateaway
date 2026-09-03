// Payment Service Manager - Factory & Strategy Pattern for Multi-Provider (GoPay, ShopeePay, OVO, DANA)
const gojekService = require('./gojekService');

const providers = {};

/**
 * Register Provider Strategy
 * @param {string} type 
 * @param {Object} serviceInstance 
 */
function registerProvider(type, serviceInstance) {
    if (!type || !serviceInstance) return;
    providers[type.toLowerCase().trim()] = serviceInstance;
}

// Register default GoPay / GoBiz provider
registerProvider('gopay', {
    name: 'GOPAY',
    verifyPayment: gojekService.verifyPayment,
    fetchTransactions: gojekService.fetchCachedTransactions,
    getActiveMerchantId: gojekService.getActiveMerchantId,
    autoLogin: gojekService.autoLoginGojek
});

// Register default GoBiz (alias to GoPay)
registerProvider('gobiz', providers['gopay']);

// Register ShopeePay provider module
const shopeepayService = require('./shopeepayService');
registerProvider('shopeepay', shopeepayService);

/**
 * Get Provider Instance by Type
 * @param {string} providerType e.g., 'gopay', 'shopeepay', 'ovo', 'dana'
 */
function getProvider(providerType = 'gopay') {
    const key = (providerType || 'gopay').toLowerCase().trim();
    if (!providers[key]) {
        // Fallback to gopay if provider not found or unsupported yet
        return providers['gopay'];
    }
    return providers[key];
}

/**
 * Universal Payment Verification across any provider
 */
async function verifyPayment(providerType, targetAmount, orderCreationTime = null, customMerchantId = null, userAgent = null, qrisId = null, forceRefresh = false) {
    const provider = getProvider(providerType);
    if (!provider || typeof provider.verifyPayment !== 'function') {
        throw new Error(`Provider '${providerType}' tidak mendukung verifikasi pembayaran.`);
    }
    return await provider.verifyPayment(targetAmount, orderCreationTime, customMerchantId, userAgent, qrisId, forceRefresh);
}

/**
 * Universal Transaction Fetcher across any provider
 */
async function fetchTransactions(providerType, headers, merchantId, forceRefresh = false) {
    const provider = getProvider(providerType);
    if (!provider || typeof provider.fetchTransactions !== 'function') {
        return [];
    }
    return await provider.fetchTransactions(headers, merchantId, forceRefresh);
}

module.exports = {
    registerProvider,
    getProvider,
    verifyPayment,
    fetchTransactions
};
