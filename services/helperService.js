// Helper Service - CRC16 EMVCo QRIS Utilities
function calcCRC16(str) {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
            } else {
                crc = (crc << 1) & 0xFFFF;
            }
        }
    }
    let hex = crc.toString(16).toUpperCase();
    return hex.padStart(4, '0');
}

function convertStaticToDynamicQRIS(staticQR, amount) {
    if (!staticQR || typeof staticQR !== 'string') return '';
    let base = staticQR.trim();

    // Hapus CRC lama di akhir jika ada
    if (base.endsWith('6304') || /6304[0-9A-Fa-f]{4}$/i.test(base)) {
        base = base.replace(/6304[0-9A-Fa-f]{4}$/i, '');
    }

    // Ubah Tag 01 dari Static (010211) menjadi Dynamic (010212)
    base = base.replace(/010211/, '010212');

    // Hapus Tag 54 lama jika pernah terpasang
    base = base.replace(/54\d{2}\d+/, '');

    const amtStr = String(Math.floor(amount));
    const amtLengthStr = String(amtStr.length).padStart(2, '0');
    const tag54 = `54${amtLengthStr}${amtStr}`;

    // Sisipkan Tag 54 tepat setelah Tag 53 (5303360 = IDR)
    const tag53Pos = base.indexOf('5303360');
    if (tag53Pos !== -1) {
        const insertPos = tag53Pos + '5303360'.length;
        base = base.slice(0, insertPos) + tag54 + base.slice(insertPos);
    } else {
        const tag58Pos = base.indexOf('5802ID');
        if (tag58Pos !== -1) {
            base = base.slice(0, tag58Pos) + tag54 + base.slice(tag58Pos);
        } else {
            base += tag54;
        }
    }

    const payloadForCRC = base + '6304';
    const checksum = calcCRC16(payloadForCRC);
    return payloadForCRC + checksum;
}

module.exports = {
    calcCRC16,
    convertStaticToDynamicQRIS
};
