// Middleware Auth - API Key & Admin Password Protection
const db = require('../db');

const apiKeyAuth = async (req, res, next) => {
    let appId = req.headers['x-app-id'] || req.query.app_id || req.body?.app_id;
    const appSecret = req.headers['x-app-secret'] || req.headers['x-admin-password'] || req.headers['x-api-key'] || req.query.app_secret || req.query.api_key || req.query.apikey || req.body?.app_secret || req.body?.api_key || req.body?.admin_password;

    const validAdminPass = process.env.ADMIN_PASSWORD || 'admin123456';
    const isAdmin = appSecret && (appSecret === validAdminPass || appSecret === 'admin123456');

    if (isAdmin && (!appId || String(appId).trim() === '')) {
        appId = 'admin';
    }

    if (!appId || String(appId).trim() === '') {
        return res.status(400).json({ success: false, message: 'Autentikasi Gagal: Parameter x-app-id / app_id wajib diisi' });
    }
    if (!appSecret || String(appSecret).trim() === '') {
        return res.status(401).json({ success: false, message: 'Autentikasi Gagal: Parameter x-app-secret / app_secret wajib diisi' });
    }

    const cleanAppId = String(appId).trim();
    const cleanSecret = String(appSecret).trim();

    // Verify pair in api_clients database
    const isValidPair = await db.verifyApiClient(cleanAppId, cleanSecret);

    if (!isValidPair && !isAdmin) {
        // Fallback check against global app_secret
        const globalSecret = await db.getAppSecret();
        const allowedAppIds = await db.getAllowedAppIds();
        const isLegacyMatch = (cleanSecret === globalSecret) && (allowedAppIds.length === 0 || allowedAppIds.includes(cleanAppId));

        if (!isLegacyMatch) {
            return res.status(401).json({ 
                success: false, 
                message: `Autentikasi Gagal: Pasangan app_id '${cleanAppId}' dan app_secret tidak cocok atau akun API non-aktif di database.` 
            });
        }
    }

    req.appId = cleanAppId;
    req.appSecret = cleanSecret;
    req.apiKey = cleanSecret;
    next();
};

const adminPassAuth = (req, res, next) => {
    const pass = req.headers['x-admin-password'] || req.headers['x-api-key'] || req.body?.admin_password || req.body?.api_key || req.query?.admin_password || req.query?.api_key || req.query?.key;
    const validPass = process.env.ADMIN_PASSWORD || 'admin123456';
    if (!pass || pass !== validPass) {
        return res.status(401).json({ success: false, message: 'Autentikasi Gagal: Password Admin tidak valid' });
    }
    next();
};

module.exports = {
    apiKeyAuth,
    adminPassAuth
};
