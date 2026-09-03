// Auth Controller - Admin Authentication & OTP Handlers (With Redis Session Persistence)
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const db = require('../db');
const { cacheSet, cacheGet, cacheDel } = require('../redis');
const { mutationCache } = require('../services/gojekService');
const { logActivity } = require('../services/loggerService');

let activeLoginProcess = null;

const adminAuth = (req, res) => {
    const pass = (req.body?.admin_password || req.query?.admin_password || '').trim();
    const validPass = (process.env.ADMIN_PASSWORD || 'admin123456').trim();
    if (pass && pass === validPass) {
        res.json({ success: true, message: 'Password Admin Valid' });
    } else {
        res.status(401).json({ success: false, message: 'Password Admin Salah' });
    }
};

const saveOtpRedisState = async (mId, ph) => {
    try {
        const key = 'otp_cooldown:' + (mId || ph);
        const now = Date.now();
        const ttlSeconds = 120;
        await cacheSet(key, {
            phone: ph,
            merchant_id: mId || null,
            requested_at: now,
            expires_at: now + (ttlSeconds * 1000)
        }, ttlSeconds);
    } catch (e) {}
};

const requestOTP = async (req, res) => {
    let phone = (req.body?.phone || req.query?.phone || '').trim();
    const merchantId = (req.body?.merchant_id || req.body?.merchantId || req.query?.merchant_id || '').trim();

    if (merchantId) {
        try {
            const m = await db.getMerchantById(merchantId);
            if (m && m.phone_number) {
                phone = m.phone_number.trim();
            }
        } catch (e) {}
    }

    if (!phone) {
        return res.status(400).json({ success: false, message: 'Nomor HP wajib diisi atau daftarkan merchant terlebih dahulu' });
    }

    // Normalisasi format nomor HP (contoh: +628... atau 628... -> 08...)
    if (phone.startsWith('+62')) {
        phone = '0' + phone.slice(3);
    } else if (phone.startsWith('62')) {
        phone = '0' + phone.slice(2);
    }

    if (activeLoginProcess && activeLoginProcess.proc) {
        try { activeLoginProcess.proc.kill(); } catch (e) {}
        activeLoginProcess = null;
    }

    logActivity('INFO', `[WEB LOGIN] Meminta Kode OTP untuk Merchant: ${merchantId || 'Default'} (${phone})`);
    const loginScript = path.join(__dirname, '..', 'login.js');
    const proc = spawn(process.execPath, [loginScript, phone], { cwd: path.join(__dirname, '..') });
    activeLoginProcess = { proc, merchantId: merchantId || null, phone };

    // Kirim nomor HP via stdin untuk memastikan login.js menerimanya 100%
    try {
        proc.stdin.write(phone + '\n');
    } catch (e) {}

    let responseSent = false;
    let outputBuffer = '';

    proc.stdout.on('data', async (chunk) => {
        const str = chunk.toString().trim();
        outputBuffer += str + '\n';
        console.log('[LOGIN CLI STDOUT]:', str);
        if (str) {
            logActivity('INFO', `[LOGIN OTP PROCESS] ${str}`);
        }

        if (!responseSent && (str.includes('OTP') || str.includes('dikirim') || str.includes('Masukkan') || str.includes('otp'))) {
            responseSent = true;
            await saveOtpRedisState(merchantId, phone);
            logActivity('SUCCESS', `[WEB LOGIN] Kode OTP berhasil dikirimkan via SMS/WA ke ${phone}`);
            return res.json({
                success: true,
                message: `Kode OTP berhasil dikirim ke ${phone}! Silakan periksa SMS/WA di HP Anda.`,
                remaining_seconds: 120
            });
        }

        if (!responseSent && (str.toLowerCase().includes('gagal') || str.toLowerCase().includes('error'))) {
            responseSent = true;
            logActivity('ERROR', `[WEB LOGIN] Gagal mengirimkan OTP: ${str}`);
            return res.status(500).json({ success: false, message: str });
        }
    });

    proc.stderr.on('data', (chunk) => {
        const errStr = chunk.toString().trim();
        console.log('[LOGIN CLI ERROR]:', errStr);
        if (errStr) {
            logActivity('ERROR', `[LOGIN OTP ERROR] ${errStr}`);
        }
    });

    proc.on('exit', async (code) => {
        if (!responseSent) {
            responseSent = true;
            if (outputBuffer.includes('berhasil') || outputBuffer.includes('OTP')) {
                await saveOtpRedisState(merchantId, phone);
                logActivity('SUCCESS', `[WEB LOGIN] Kode OTP berhasil dikirim ke ${phone}!`);
                res.json({ success: true, message: `Kode OTP berhasil dikirim ke ${phone}!`, remaining_seconds: 120 });
            } else {
                logActivity('ERROR', `[WEB LOGIN] Gagal mengirim OTP (Exit Code ${code})`);
                res.status(500).json({ success: false, message: 'Gagal mengirim OTP. Pastikan nomor HP terdaftar di GoBiz.' });
            }
        }
    });

    setTimeout(async () => {
        if (!responseSent) {
            responseSent = true;
            await saveOtpRedisState(merchantId, phone);
            logActivity('INFO', `[WEB LOGIN] Permintaan OTP dikirim ke HP ${phone}`);
            res.json({ success: true, message: `Permintaan OTP dikirim. Silakan periksa SMS/WA di HP ${phone}.`, remaining_seconds: 120 });
        }
    }, 15000);
};

const getOtpStatus = async (req, res) => {
    const merchantId = (req.query?.merchant_id || req.params?.merchantId || req.query?.phone || '').trim();
    if (!merchantId) return res.json({ success: true, active: false });

    const key = 'otp_cooldown:' + merchantId;
    let session = await cacheGet(key);

    if (!session) {
        return res.json({ success: true, active: false });
    }

    const now = Date.now();
    const remainingSecs = Math.max(0, Math.floor((session.expires_at - now) / 1000));

    if (remainingSecs <= 0) {
        await cacheDel(key);
        return res.json({ success: true, active: false });
    }

    return res.json({
        success: true,
        active: true,
        phone: session.phone,
        merchant_id: session.merchant_id,
        remaining_seconds: remainingSecs
    });
};

const verifyOTP = async (req, res) => {
    const otpCode = (req.body?.otp_code || req.body?.otp || req.query?.otp || '').trim();
    const targetMerchantId = (req.body?.merchant_id || req.body?.merchantId || req.query?.merchant_id || '').trim();

    if (!otpCode) {
        return res.status(400).json({ success: false, message: 'Kode OTP wajib diisi' });
    }

    if (!activeLoginProcess || !activeLoginProcess.proc) {
        return res.status(400).json({ success: false, message: 'Belum ada permintaan OTP aktif. Silakan minta OTP terlebih dahulu.' });
    }

    logActivity('INFO', `[WEB LOGIN] Memverifikasi Kode OTP: ${otpCode}`);
    let responseSent = false;
    const { proc, merchantId: currentMId, phone } = activeLoginProcess;
    const finalMerchantId = targetMerchantId || currentMId;

    const finalizeSession = async () => {
        mutationCache.data = null;
        activeLoginProcess = null;
        try {
            const sess = await db.getMerchantSession();
            if (sess) {
                const mId = finalMerchantId || sess.merchant_id || sess.merchantId || 'G844728303';
                await db.updateMerchantSession(mId, sess, true);
            }
            if (finalMerchantId) {
                await cacheDel('otp_cooldown:' + finalMerchantId);
            }
            if (phone) {
                await cacheDel('otp_cooldown:' + phone);
            }
        } catch (e) {}
    };

    proc.stdout.on('data', async (chunk) => {
        const str = chunk.toString().trim();
        console.log('[LOGIN CLI VERIFY]:', str);
        if (str) {
            logActivity('INFO', `[LOGIN VERIFY PROCESS] ${str}`);
        }

        if (!responseSent && (str.includes('Berhasil') || str.includes('Sesi') || str.includes('disimpan'))) {
            responseSent = true;
            await finalizeSession();
            logActivity('SUCCESS', `[WEB LOGIN] Login GoBiz BERHASIL! Sesi Merchant telah aktif & tersimpan di database.`);
            return res.json({ success: true, message: 'Login GoBiz Berhasil! Sesi Merchant telah aktif.' });
        }

        if (!responseSent && (str.toLowerCase().includes('gagal') || str.toLowerCase().includes('salah') || str.toLowerCase().includes('invalid'))) {
            responseSent = true;
            logActivity('WARNING', `[WEB LOGIN] Verifikasi OTP Gagal: Kode OTP Salah atau Expired.`);
            return res.status(400).json({ success: false, message: 'Kode OTP Salah atau Kedaluwarsa. Silakan coba lagi.' });
        }
    });

    proc.stdin.write(otpCode + '\n');

    proc.on('exit', async (code) => {
        if (!responseSent) {
            responseSent = true;
            await finalizeSession();
            logActivity('SUCCESS', `[WEB LOGIN] Verifikasi OTP selesai. Sesi GoBiz aktif.`);
            res.json({ success: true, message: 'Login GoBiz Berhasil! Sesi Merchant telah aktif.' });
        }
    });

    setTimeout(async () => {
        if (!responseSent) {
            responseSent = true;
            await finalizeSession();
            logActivity('INFO', `[WEB LOGIN] Verifikasi OTP selesai.`);
            res.json({ success: true, message: 'Proses verifikasi selesai. Sesi GoBiz telah diperbarui.' });
        }
    }, 10000);
};

const logout = async (req, res) => {
    try {
        const merchantId = req.body?.merchant_id || req.body?.merchantId || req.query?.merchant_id || req.query?.merchantId || null;
        const sessionFile = path.join(__dirname, '..', '.GOPAY_SESI_JANGAN_DIHAPUS.json');
        if (!merchantId || merchantId === 'G844728303') {
            if (fs.existsSync(sessionFile)) {
                try { fs.unlinkSync(sessionFile); } catch(e){}
            }
        }
        await db.deleteMerchantSession(merchantId);
        if (merchantId) {
            await cacheDel('otp_cooldown:' + merchantId);
        }
        mutationCache.data = null;
        logActivity('INFO', `[WEB LOGIN] Sesi GoBiz ${merchantId ? ('(ID: ' + merchantId + ')') : ''} berhasil dihapus dari Disk & Database.`);
        res.json({ success: true, message: 'Sesi GoBiz Berhasil Dihapus (Logged Out).' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    adminAuth,
    requestOTP,
    getOtpStatus,
    verifyOTP,
    logout
};
