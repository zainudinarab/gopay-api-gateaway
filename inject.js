const fs = require('fs');
const db = require('./db');

async function inject() {
    try {
        const content = fs.readFileSync('.GOPAY_SESI_JANGAN_DIHAPUS.json', 'utf8');
        const data = JSON.parse(content);
        await db.saveMerchantSession(data);
        console.log('[SUCCESS] Sesi GoBiz berhasil dimasukkan ke Database PostgreSQL server!');
        process.exit(0);
    } catch (err) {
        console.error('[ERROR]', err);
        process.exit(1);
    }
}
inject();
