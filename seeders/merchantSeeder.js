// Standalone Merchant Seeder Script - Auto-imports .GOPAY_SESI_JANGAN_DIHAPUS.json
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../db');

function getSavedSessionData() {
    try {
        const fileContent = fs.readFileSync(path.join(__dirname, '../.GOPAY_SESI_JANGAN_DIHAPUS.json'), 'utf8');
        return fileContent ? JSON.parse(fileContent) : null;
    } catch (e) {
        return null;
    }
}

const savedSession = getSavedSessionData();
const sessionJsonStr = savedSession ? JSON.stringify(savedSession) : null;

const initialMerchants = [
    {
        merchant_id: (savedSession && savedSession.merchant_id) || 'G844728303',
        merchant_name: (savedSession && savedSession.outlet_name) || 'arabpay, Digital & Kreatif',
        phone_number: (savedSession && savedSession.phone_number) || '081240060690',
        merchant_type: 'gopay',
        city: 'Jakarta',
        static_qris: (process.env.GOPAY_STATIC_QRIS || '00020101021126610014COM.GO-JEK.WWW011893600914008447283035204581253033605802ID5926ARABPAY DIGITAL DAN KREATIF6007JAKARTA61051234562070703A0163041B2C').trim(),
        session_data: sessionJsonStr,
        is_active: true
    },
    {
        merchant_id: 'M991823411',
        merchant_name: 'Warung Makan GoBiz',
        phone_number: '085712345678',
        merchant_type: 'gopay',
        city: 'Bandung',
        static_qris: '00020101021126610014COM.GO-JEK.WWW011893600914008447283035204581253033605802ID5919WARUNG MAKAN GOBIZ6007BANDUNG61051234562070703A0163041B2C',
        is_active: false
    },
    {
        merchant_id: 'K551029482',
        merchant_name: 'Kasir POS Cabang 1',
        phone_number: '081398765432',
        merchant_type: 'gopay',
        city: 'Surabaya',
        static_qris: '00020101021126610014COM.GO-JEK.WWW011893600914008447283035204581253033605802ID5918KASIR POS CABANG 16008SURABAYA61051234562070703A0163041B2C',
        is_active: false
    }
];

async function seedMerchants() {
    console.log('========================================================');
    console.log('    SEEDING DATA TOKO & SESI GOBIZ (.GOPAY_SESI_JANGAN_DIHAPUS) ');
    console.log('========================================================\n');

    let seededCount = 0;
    for (const m of initialMerchants) {
        try {
            const res = await db.saveMerchant(m);
            if (res) {
                seededCount++;
                const sessStatus = m.session_data ? '🟢 SESI GOBIZ AKTIF' : '⚪ Tanpa Sesi';
                console.log(` ✅ Seeded Merchant: ${m.merchant_name} (${m.merchant_id}) - ${m.phone_number} [${sessStatus}]`);
            }
        } catch (e) {
            console.error(` ❌ Error seeding ${m.merchant_id}:`, e.message);
        }
    }

    console.log(`\n🎉 SEEDING SELESAI! ${seededCount} merchant beserta sesi GoBiz berhasil disalin ke Database.`);
    process.exit(0);
}

seedMerchants();
