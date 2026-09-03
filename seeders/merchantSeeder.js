// Standalone Merchant Seeder Script
require('dotenv').config();
const db = require('../db');

const initialMerchants = [
    {
        merchant_id: 'G844728303',
        merchant_name: 'Toko Utama GoPay',
        phone_number: '081234567890',
        merchant_type: 'gopay',
        city: 'Jakarta',
        static_qris: (process.env.GOPAY_STATIC_QRIS || '00020101021126610014COM.GO-JEK.WWW011893600914008447283035204581253033605802ID5916TOKO UTAMA GOPAY6007JAKARTA61051234562070703A0163041B2C').trim(),
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
    console.log('          SEEDING DATA TOKO MERCHANT (merchants)        ');
    console.log('========================================================\n');

    let seededCount = 0;
    for (const m of initialMerchants) {
        try {
            const res = await db.saveMerchant(m);
            if (res) {
                seededCount++;
                console.log(` ✅ Seeded Merchant: ${m.merchant_name} (${m.merchant_id}) - ${m.city}`);
            }
        } catch (e) {
            console.error(` ❌ Error seeding ${m.merchant_id}:`, e.message);
        }
    }

    console.log(`\n🎉 SEEDING SELESAI! ${seededCount} merchant berhasil disalin/disimpan ke Database.`);
    process.exit(0);
}

seedMerchants();
