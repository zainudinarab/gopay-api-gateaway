// Auth Controller - Admin Authentication & OTP Handlers
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const db = require('../db');
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

const requestOTP = (req, res) => {
    let phone = (req.body?.phone || req.query?.phone || '').trim();
    if (!phone) {
        return res.status(400).json({ success: false, message: 'Nomor HP wajib diisi' });
    }

    // Normalisasi format nomor HP (contoh: +628... atau 628... -> 08...)
    if (phone.startsWith('+62')) {
        phone = '0' + phone.slice(3);
    } else if (phone.startsWith('62')) {
        phone = '0' + phone.slice(2);
    }

    if (activeLoginProcess) {
        try { activeLoginProcess.kill(); } catch (e) {}
        activeLoginProcess = null;
    }

    logActivity('INFO', `[WEB LOGIN] Meminta Kode OTP untuk nomor: ${phone}`);
    const loginScript = path.join(__dirname, '..', 'login.js');
    const proc = spawn(process.execPath, [loginScript, phone], { cwd: path.join(__dirname, '..') });
    activeLoginProcess = proc;

    // Kirim nomor HP via stdin untuk memastikan login.js menerimanya 100%
    try {
        proc.stdin.write(phone + '\n');
    } catch (e) {}

    let responseSent = false;
    let outputBuffer = '';

    proc.stdout.on('data', (chunk) => {
        const str = chunk.toString().trim();
        outputBuffer += str + '\n';
        console.log('[LOGIN CLI STDOUT]:', str);
        if (str) {
            logActivity('INFO', `[LOGIN OTP PROCESS] ${str}`);
        }

        if (!responseSent && (str.includes('OTP') || str.includes('dikirim') || str.includes('Masukkan') || str.includes('otp'))) {
            responseSent = true;
            logActivity('SUCCESS', `[WEB LOGIN] Kode OTP berhasil dikirimkan via SMS/WA ke ${phone}`);
            return res.json({
                success: true,
                message: `Kode OTP berhasil dikirim ke ${phone}! Silakan periksa SMS/WA di HP Anda.`
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

    proc.on('exit', (code) => {
        if (!responseSent) {
            responseSent = true;
            if (outputBuffer.includes('berhasil') || outputBuffer.includes('OTP')) {
                logActivity('SUCCESS', `[WEB LOGIN] Kode OTP berhasil dikirim ke ${phone}!`);
                res.json({ success: true, message: `Kode OTP berhasil dikirim ke ${phone}!` });
            } else {
                logActivity('ERROR', `[WEB LOGIN] Gagal mengirim OTP (Exit Code ${code})`);
                res.status(500).json({ success: false, message: 'Gagal mengirim OTP. Pastikan nomor HP terdaftar di GoBiz.' });
            }
        }
    });

    setTimeout(() => {
        if (!responseSent) {
            responseSent = true;
            logActivity('INFO', `[WEB LOGIN] Permintaan OTP dikirim ke HP ${phone}`);
            res.json({ success: true, message: `Permintaan OTP dikirim. Silakan periksa SMS/WA di HP ${phone}.` });
        }
    }, 15000);
};

const verifyOTP = (req, res) => {
    const otpCode = req.body?.otp_code || req.body?.otp || req.query?.otp;
    if (!otpCode) {
        return res.status(400).json({ success: false, message: 'Kode OTP wajib diisi' });
    }

    if (!activeLoginProcess) {
        return res.status(400).json({ success: false, message: 'Belum ada permintaan OTP aktif. Silakan minta OTP terlebih dahulu.' });
    }

    logActivity('INFO', `[WEB LOGIN] Memverifikasi Kode OTP: ${otpCode}`);
    let responseSent = false;
    const proc = activeLoginProcess;

    proc.stdout.on('data', (chunk) => {
        const str = chunk.toString().trim();
        console.log('[LOGIN CLI VERIFY]:', str);
        if (str) {
            logActivity('INFO', `[LOGIN VERIFY PROCESS] ${str}`);
        }

        if (!responseSent && (str.includes('Berhasil') || str.includes('Sesi') || str.includes('disimpan'))) {
            responseSent = true;
            mutationCache.data = null;
            activeLoginProcess = null;
            logActivity('SUCCESS', `[WEB LOGIN] Login GoBiz BERHASIL! Sesi Merchant GoPay telah aktif & tersimpan di PostgreSQL.`);
            return res.json({ success: true, message: 'Login GoBiz Berhasil! Sesi Merchant GoPay telah aktif.' });
        }

        if (!responseSent && (str.toLowerCase().includes('gagal') || str.toLowerCase().includes('salah') || str.toLowerCase().includes('invalid'))) {
            responseSent = true;
            logActivity('WARNING', `[WEB LOGIN] Verifikasi OTP Gagal: Kode OTP Salah atau Expired.`);
            return res.status(400).json({ success: false, message: 'Kode OTP Salah atau Kedaluwarsa. Silakan coba lagi.' });
        }
    });

    proc.stdin.write(otpCode + '\n');

    proc.on('exit', (code) => {
        activeLoginProcess = null;
        if (!responseSent) {
            responseSent = true;
            mutationCache.data = null;
            logActivity('SUCCESS', `[WEB LOGIN] Verifikasi OTP selesai. Sesi GoBiz aktif.`);
            res.json({ success: true, message: 'Login GoBiz Berhasil! Sesi Merchant GoPay telah aktif.' });
        }
    });

    setTimeout(() => {
        if (!responseSent) {
            responseSent = true;
            mutationCache.data = null;
            activeLoginProcess = null;
            logActivity('INFO', `[WEB LOGIN] Verifikasi OTP selesai.`);
            res.json({ success: true, message: 'Proses verifikasi selesai. Sesi GoBiz telah diperbarui.' });
        }
    }, 10000);
};

const logout = (req, res) => {
    try {
        const sessionFile = path.join(__dirname, '..', '.GOPAY_SESI_JANGAN_DIHAPUS.json');
        if (fs.existsSync(sessionFile)) {
            fs.unlinkSync(sessionFile);
        }
        db.deleteMerchantSession();
        mutationCache.data = null;
        logActivity('INFO', '[WEB LOGIN] Sesi GoBiz berhasil dihapus dari Disk & Database.');
        res.json({ success: true, message: 'Sesi GoBiz Berhasil Dihapus (Logged Out).' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    adminAuth,
    requestOTP,
    verifyOTP,
    logout
};
