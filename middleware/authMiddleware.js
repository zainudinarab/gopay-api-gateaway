// Middleware Auth - API Key & Admin Password Protection
const apiKeyAuth = (req, res, next) => {
    let appId = req.headers['x-app-id'] || req.query.app_id || req.body?.app_id;
    const appSecret = req.headers['x-app-secret'] || req.headers['x-admin-password'] || req.headers['x-api-key'] || req.query.app_secret || req.query.api_key || req.query.apikey || req.body?.app_secret || req.body?.api_key || req.body?.admin_password;

    const validSecret = process.env.APP_SECRET || 'secret123';
    const validAdminPass = process.env.ADMIN_PASSWORD || 'admin123456';

    const isAdmin = appSecret && (appSecret === validAdminPass || appSecret === 'admin123456');

    if (isAdmin && (!appId || String(appId).trim() === '')) {
        appId = 'admin';
    }

    if (!appId || String(appId).trim() === '') {
        return res.status(400).json({ success: false, message: 'Autentikasi Gagal: Parameter app_id wajib diisi' });
    }

    const cleanAppId = String(appId).trim();
    const rawAllowedAppIds = process.env.ALLOWED_APP_IDS || process.env.APP_IDS || '';
    const allowedAppIds = rawAllowedAppIds.split(',').map(id => id.trim()).filter(Boolean);

    if (!isAdmin && allowedAppIds.length > 0 && !allowedAppIds.includes(cleanAppId)) {
        return res.status(403).json({ success: false, message: `Autentikasi Gagal: app_id '${cleanAppId}' tidak terdaftar` });
    }

    if (!appSecret || (appSecret !== validSecret && appSecret !== validAdminPass)) {
        return res.status(401).json({ success: false, message: 'Autentikasi Gagal: app_secret / api_key tidak valid' });
    }

    req.appId = cleanAppId;
    req.appSecret = appSecret;
    req.apiKey = appSecret;
    next();
};

const adminPassAuth = (req, res, next) => {
    const pass = req.headers['x-admin-password'] || req.headers['x-api-key'] || req.body?.admin_password || req.query?.admin_password;
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
