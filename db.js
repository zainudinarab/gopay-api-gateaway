// Database Abstraction Layer - Complete Dual Engine: SQLite (Default Local) & PostgreSQL (DATABASE_URL)
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { cacheGet, cacheSet, cacheDel } = require('./redis');

const DB_TYPE = (process.env.DB_TYPE || 'sqlite').toLowerCase();
const DATABASE_URL = process.env.DATABASE_URL;
const isPostgres = DB_TYPE === 'postgres' || Boolean(DATABASE_URL && (DATABASE_URL.startsWith('postgres://') || DATABASE_URL.startsWith('postgresql://')));

let sqliteDb = null;
let pgPool = null;

if (isPostgres) {
    const { Pool } = require('pg');
    const pgConfig = DATABASE_URL ? {
        connectionString: DATABASE_URL,
        ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false
    } : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gopay_gateway',
        ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false
    };

    pgPool = new Pool(pgConfig);
    pgPool.on('error', (err) => {
        console.warn('[POSTGRES POOL WARNING]: Connection error on idle client:', err.message);
    });

    // Initialize PostgreSQL Tables with auto-create database and retry logic
    const initPgSchema = async (retries = 10, delay = 2000) => {
        const targetDbName = process.env.DB_NAME || 'gopaygateway';
        for (let i = 1; i <= retries; i++) {
            try {
                let client;
                try {
                    client = await pgPool.connect();
                } catch (connErr) {
                    // Check if error is database does not exist (PostgreSQL error code 3D000)
                    if (connErr.code === '3D000' || (connErr.message && connErr.message.includes('does not exist'))) {
                        console.log(`[DATABASE] Database "${targetDbName}" does not exist. Creating database...`);
                        const adminPool = new Pool({
                            ...pgConfig,
                            database: 'postgres'
                        });
                        const adminClient = await adminPool.connect();
                        await adminClient.query(`CREATE DATABASE "${targetDbName}"`);
                        adminClient.release();
                        await adminPool.end();
                        console.log(`[DATABASE] Database "${targetDbName}" created successfully!`);
                        client = await pgPool.connect();
                    } else {
                        throw connErr;
                    }
                }

                await client.query(`
                    CREATE TABLE IF NOT EXISTS qris_orders (
                        qris_id VARCHAR(100) PRIMARY KEY,
                        trx_id VARCHAR(100) UNIQUE,
                        merchant_id VARCHAR(100),
                        client_ref_id VARCHAR(255),
                        webhook_url TEXT,
                        webhook_status VARCHAR(50) DEFAULT 'PENDING',
                        amount BIGINT NOT NULL,
                        base_amount BIGINT,
                        unique_code INT DEFAULT 0,
                        qris_code TEXT NOT NULL,
                        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
                        app_id VARCHAR(100) DEFAULT 'default',
                        transaction_data TEXT,
                        created_at BIGINT NOT NULL,
                        expires_at BIGINT NOT NULL
                    );

                    CREATE TABLE IF NOT EXISTS claimed_transactions (
                        transaction_id VARCHAR(255) PRIMARY KEY,
                        order_id VARCHAR(255),
                        qris_id VARCHAR(100),
                        merchant_id VARCHAR(100),
                        amount BIGINT NOT NULL,
                        payer_issuer VARCHAR(100),
                        payment_type VARCHAR(100),
                        transaction_time VARCHAR(100),
                        claimed_at BIGINT NOT NULL
                    );

                    CREATE TABLE IF NOT EXISTS webhook_queue (
                        id SERIAL PRIMARY KEY,
                        qris_id VARCHAR(100) NOT NULL,
                        client_ref_id VARCHAR(255),
                        webhook_url TEXT NOT NULL,
                        payload TEXT NOT NULL,
                        attempts INT DEFAULT 0,
                        max_attempts INT DEFAULT 3,
                        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
                        last_error TEXT,
                        created_at BIGINT NOT NULL,
                        next_attempt_at BIGINT NOT NULL
                    );

                    CREATE TABLE IF NOT EXISTS merchants (
                        merchant_id VARCHAR(100) PRIMARY KEY,
                        merchant_name VARCHAR(255),
                        phone_number VARCHAR(50),
                        merchant_type VARCHAR(50) DEFAULT 'gopay',
                        city VARCHAR(100),
                        static_qris TEXT,
                        session_data TEXT,
                        is_active BOOLEAN DEFAULT FALSE,
                        created_at BIGINT NOT NULL,
                        updated_at BIGINT NOT NULL
                    );

                    DROP TABLE IF EXISTS app_settings;

                    CREATE TABLE IF NOT EXISTS api_clients (
                        app_id VARCHAR(100) PRIMARY KEY,
                        app_secret VARCHAR(255) NOT NULL,
                        client_name VARCHAR(255),
                        is_active BOOLEAN DEFAULT TRUE,
                        created_at BIGINT NOT NULL,
                        updated_at BIGINT NOT NULL
                    );
                `);

                try {
                    const defaultSecret = (process.env.APP_SECRET || 'secret123').trim();
                    const adminPass = (process.env.ADMIN_PASSWORD || 'admin123456').trim();
                    const now = Date.now();

                    await client.query(`
                        INSERT INTO api_clients (app_id, app_secret, client_name, is_active, created_at, updated_at)
                        VALUES 
                            ('admin', $1, 'Super Admin Portal', TRUE, $4, $4),
                            ('App1', $2, 'Default Client App1', TRUE, $4, $4),
                            ('TokoOnline', $3, 'Website Toko Online Utama', TRUE, $4, $4)
                        ON CONFLICT (app_id) DO NOTHING
                    `, [adminPass, defaultSecret, 'arabsecret999', now]);

                    // Default Merchant Seeder (imports .GOPAY_SESI_JANGAN_DIHAPUS.json if present)
                    let savedSession = null;
                    try {
                        const fileContent = fs.readFileSync(path.join(__dirname, '.GOPAY_SESI_JANGAN_DIHAPUS.json'), 'utf8');
                        if (fileContent) savedSession = JSON.parse(fileContent);
                    } catch (e) {}

                    const mId = (savedSession && savedSession.merchant_id) || 'G844728303';
                    const mName = (savedSession && savedSession.outlet_name) || 'arabpay, Digital & Kreatif';
                    const mPhone = (savedSession && savedSession.phone_number) || '081240060690';
                    const mSessStr = savedSession ? JSON.stringify(savedSession) : null;
                    const defaultQris = (process.env.GOPAY_STATIC_QRIS || '00020101021126610014COM.GO-JEK.WWW011893600914008447283035204581253033605802ID5926ARABPAY DIGITAL DAN KREATIF6007JAKARTA61051234562070703A0163041B2C').trim();

                    await client.query(`
                        INSERT INTO merchants (merchant_id, merchant_name, phone_number, merchant_type, city, static_qris, session_data, is_active, created_at, updated_at)
                        VALUES ($1, $2, $3, 'gopay', 'Jakarta', $4, $5, TRUE, $6, $6)
                        ON CONFLICT (merchant_id) DO UPDATE SET
                            merchant_name = EXCLUDED.merchant_name,
                            phone_number = EXCLUDED.phone_number,
                            session_data = COALESCE(EXCLUDED.session_data, merchants.session_data),
                            is_active = TRUE,
                            updated_at = EXCLUDED.updated_at
                    `, [mId, mName, mPhone, defaultQris, mSessStr, now]);
                } catch (e) {}
                client.release();
                console.log(`[DATABASE] Connected & Schema Initialized on PostgreSQL (${targetDbName})!`);
                return;
            } catch (err) {
                console.error(`[DATABASE ERROR] Attempt ${i}/${retries} failed to initialize PostgreSQL:`, err.message);
                if (i < retries) {
                    await new Promise(res => setTimeout(res, delay));
                } else {
                    console.error('[DATABASE CRITICAL] Max retries reached. PostgreSQL initialization failed.');
                }
            }
        }
    };
    initPgSchema();
} else {
    const Database = require('better-sqlite3');
    const dbPath = path.join(__dirname, 'gateway.db');
    sqliteDb = new Database(dbPath);
    sqliteDb.pragma('journal_mode = WAL');

    sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS qris_orders (
            qris_id TEXT PRIMARY KEY,
            trx_id TEXT UNIQUE,
            merchant_id TEXT,
            client_ref_id TEXT,
            webhook_url TEXT,
            webhook_status TEXT DEFAULT 'PENDING',
            amount INTEGER NOT NULL,
            base_amount INTEGER,
            unique_code INTEGER DEFAULT 0,
            qris_code TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING',
            app_id TEXT DEFAULT 'default',
            transaction_data TEXT,
            created_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS claimed_transactions (
            transaction_id TEXT PRIMARY KEY,
            order_id TEXT,
            qris_id TEXT,
            merchant_id TEXT,
            amount INTEGER NOT NULL,
            payer_issuer TEXT,
            payment_type TEXT,
            transaction_time TEXT,
            claimed_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS webhook_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            qris_id TEXT NOT NULL,
            client_ref_id TEXT,
            webhook_url TEXT NOT NULL,
            payload TEXT NOT NULL,
            attempts INTEGER DEFAULT 0,
            max_attempts INTEGER DEFAULT 3,
            status TEXT NOT NULL DEFAULT 'PENDING',
            last_error TEXT,
            created_at INTEGER NOT NULL,
            next_attempt_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS merchants (
            merchant_id TEXT PRIMARY KEY,
            merchant_name TEXT,
            phone_number TEXT,
            merchant_type TEXT DEFAULT 'gopay',
            city TEXT,
            static_qris TEXT,
            session_data TEXT,
            is_active INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        DROP TABLE IF EXISTS app_settings;

        CREATE TABLE IF NOT EXISTS api_clients (
            app_id TEXT PRIMARY KEY,
            app_secret TEXT NOT NULL,
            client_name TEXT,
            is_active INTEGER DEFAULT 1,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );
    `);

    try {
        const defaultSecret = (process.env.APP_SECRET || 'secret123').trim();
        const adminPass = (process.env.ADMIN_PASSWORD || 'admin123456').trim();
        const now = Date.now();

        sqliteDb.prepare(`
            INSERT OR IGNORE INTO api_clients (app_id, app_secret, client_name, is_active, created_at, updated_at)
            VALUES 
                ('admin', ?, 'Super Admin Portal', 1, ?, ?),
                ('App1', ?, 'Default Client App1', 1, ?, ?),
                ('TokoOnline', ?, 'Website Toko Online Utama', 1, ?, ?)
        `).run(adminPass, now, now, defaultSecret, now, now, 'arabsecret999', now, now);

        // Default Merchant Seeder (imports .GOPAY_SESI_JANGAN_DIHAPUS.json if present)
        let savedSessionSqlite = null;
        try {
            const fileContent = fs.readFileSync(path.join(__dirname, '.GOPAY_SESI_JANGAN_DIHAPUS.json'), 'utf8');
            if (fileContent) savedSessionSqlite = JSON.parse(fileContent);
        } catch (e) {}

        const mId = (savedSessionSqlite && savedSessionSqlite.merchant_id) || 'G844728303';
        const mName = (savedSessionSqlite && savedSessionSqlite.outlet_name) || 'arabpay, Digital & Kreatif';
        const mPhone = (savedSessionSqlite && savedSessionSqlite.phone_number) || '081240060690';
        const mSessStr = savedSessionSqlite ? JSON.stringify(savedSessionSqlite) : null;
        const defaultQris = (process.env.GOPAY_STATIC_QRIS || '00020101021126610014COM.GO-JEK.WWW011893600914008447283035204581253033605802ID5926ARABPAY DIGITAL DAN KREATIF6007JAKARTA61051234562070703A0163041B2C').trim();

        sqliteDb.prepare(`
            INSERT INTO merchants (merchant_id, merchant_name, phone_number, merchant_type, city, static_qris, session_data, is_active, created_at, updated_at)
            VALUES (?, ?, ?, 'gopay', 'Jakarta', ?, ?, 1, ?, ?)
            ON CONFLICT(merchant_id) DO UPDATE SET
                merchant_name = excluded.merchant_name,
                phone_number = excluded.phone_number,
                session_data = COALESCE(excluded.session_data, merchants.session_data),
                is_active = 1,
                updated_at = excluded.updated_at
        `).run(mId, mName, mPhone, defaultQris, mSessStr, now, now);
    } catch (e) {}
}

function parseQrisDetails(qrisString) {
    if (!qrisString || typeof qrisString !== 'string') return { merchantName: '', city: '' };
    let merchantName = '';
    let city = '';
    let i = 0;
    const str = qrisString.trim();

    while (i < str.length - 4) {
        const tag = str.substring(i, i + 2);
        const len = parseInt(str.substring(i + 2, i + 4), 10);
        if (isNaN(len) || len < 0 || i + 4 + len > str.length) break;
        const val = str.substring(i + 4, i + 4 + len);

        if (tag === '59') {
            merchantName = val;
        } else if (tag === '60') {
            city = val;
        }
        i += 4 + len;
    }

    return { merchantName, city };
}

// Prepared Statements for SQLite Mode
const stmtInsertOrder = sqliteDb ? sqliteDb.prepare(`
    INSERT OR REPLACE INTO qris_orders (qris_id, trx_id, merchant_id, client_ref_id, app_id, webhook_url, webhook_status, amount, base_amount, unique_code, qris_code, status, created_at, expires_at)
    VALUES (@qrisId, @trxId, @merchantId, @clientRefId, @appId, @webhookUrl, @webhookStatus, @amount, @baseAmount, @uniqueCode, @qrisCode, @status, @createdAt, @expiresAt)
`) : null;

const stmtGetOrder = sqliteDb ? sqliteDb.prepare(`SELECT * FROM qris_orders WHERE qris_id = ?`) : null;
const stmtUpdateOrderStatus = sqliteDb ? sqliteDb.prepare(`UPDATE qris_orders SET status = @status, transaction_data = @transactionData WHERE qris_id = @qrisId`) : null;
const stmtUpdateOrderWebhookStatus = sqliteDb ? sqliteDb.prepare(`UPDATE qris_orders SET webhook_status = ? WHERE qris_id = ?`) : null;
const stmtGetClaimedTx = sqliteDb ? sqliteDb.prepare(`SELECT * FROM claimed_transactions WHERE transaction_id = ?`) : null;
const stmtGetOrderByTrxId = sqliteDb ? sqliteDb.prepare(`SELECT * FROM qris_orders WHERE trx_id = ? OR qris_id = ?`) : null;
const stmtClaimTx = sqliteDb ? sqliteDb.prepare(`
    INSERT OR REPLACE INTO claimed_transactions (transaction_id, order_id, qris_id, merchant_id, amount, payer_issuer, payment_type, transaction_time, claimed_at)
    VALUES (@txId, @orderId, @qrisId, @merchantId, @amount, @payerIssuer, @paymentType, @transactionTime, @claimedAt)
`) : null;
const stmtCleanExpiredClaims = sqliteDb ? sqliteDb.prepare(`DELETE FROM claimed_transactions WHERE claimed_at < ?`) : null;
const stmtGetAllOrders = sqliteDb ? sqliteDb.prepare(`SELECT * FROM qris_orders ORDER BY created_at DESC LIMIT ?`) : null;
const stmtGetActiveUniqueCodes = sqliteDb ? sqliteDb.prepare(`SELECT unique_code FROM qris_orders WHERE base_amount = ? AND created_at > ?`) : null;
const stmtGetPendingOrdersForAmount = sqliteDb ? sqliteDb.prepare(`SELECT * FROM qris_orders WHERE amount = ? AND status = 'PENDING' AND expires_at > ? ORDER BY created_at DESC`) : null;
const stmtEnqueueWebhook = sqliteDb ? sqliteDb.prepare(`
    INSERT INTO webhook_queue (qris_id, client_ref_id, webhook_url, payload, attempts, max_attempts, status, created_at, next_attempt_at)
    VALUES (@qrisId, @clientRefId, @webhookUrl, @payload, 0, 3, 'PENDING', @createdAt, @nextAttemptAt)
`) : null;
const stmtGetPendingWebhooks = sqliteDb ? sqliteDb.prepare(`SELECT * FROM webhook_queue WHERE status = 'PENDING' AND next_attempt_at <= ? ORDER BY id ASC LIMIT ?`) : null;
const stmtUpdateWebhookAttempt = sqliteDb ? sqliteDb.prepare(`UPDATE webhook_queue SET attempts = @attempts, status = @status, last_error = @lastError, next_attempt_at = @nextAttemptAt WHERE id = @id`) : null;
const stmtGetAllWebhooks = sqliteDb ? sqliteDb.prepare(`SELECT * FROM webhook_queue ORDER BY id DESC LIMIT ?`) : null;

module.exports = {
    isPostgresMode() {
        return isPostgres;
    },

    async getActiveUniqueCodesForBaseAmount(baseAmount, cooldownMs = 24 * 60 * 60 * 1000) {
        const threshold = Date.now() - cooldownMs;
        if (isPostgres) {
            try {
                const res = await pgPool.query(`SELECT unique_code FROM qris_orders WHERE base_amount = $1 AND created_at > $2`, [baseAmount, threshold]);
                return res.rows.map(r => parseInt(r.unique_code, 10)).filter(c => c > 0);
            } catch (e) {
                console.error('[PG GET UNIQUE CODES ERROR]:', e.message);
                return [];
            }
        }
        const rows = stmtGetActiveUniqueCodes.all(baseAmount, threshold);
        return rows.map(r => r.unique_code).filter(c => c > 0);
    },

    async getActiveUniqueCodes(baseAmount, cooldownMs) {
        return await this.getActiveUniqueCodesForBaseAmount(baseAmount, cooldownMs);
    },

    async getPendingOrdersForAmount(amount) {
        const now = Date.now();
        if (isPostgres) {
            try {
                const res = await pgPool.query(`SELECT * FROM qris_orders WHERE amount = $1 AND status = 'PENDING' AND expires_at > $2 ORDER BY created_at DESC`, [amount, now]);
                return res.rows.map(row => ({
                    qrisId: row.qris_id,
                    trxId: row.trx_id,
                    clientRefId: row.client_ref_id,
                    webhookUrl: row.webhook_url,
                    amount: parseInt(row.amount, 10),
                    baseAmount: parseInt(row.base_amount || row.amount, 10),
                    uniqueCode: parseInt(row.unique_code || 0, 10),
                    createdAt: new Date(parseInt(row.created_at, 10)),
                    expiresAt: new Date(parseInt(row.expires_at, 10))
                }));
            } catch (e) {
                console.error('[PG GET PENDING ORDERS ERROR]:', e.message);
                return [];
            }
        }
        const rows = stmtGetPendingOrdersForAmount.all(amount, now);
        return rows.map(row => ({
            qrisId: row.qris_id,
            trxId: row.trx_id,
            clientRefId: row.client_ref_id,
            webhookUrl: row.webhook_url,
            amount: row.amount,
            baseAmount: row.base_amount || row.amount,
            uniqueCode: row.unique_code || 0,
            createdAt: new Date(row.created_at),
            expiresAt: new Date(row.expires_at)
        }));
    },

    async getAllOrders(limit = 100) {
        if (isPostgres) {
            try {
                const res = await pgPool.query(`SELECT * FROM qris_orders ORDER BY created_at DESC LIMIT $1`, [limit]);
                return res.rows.map(row => ({
                    qrisId: row.qris_id,
                    trxId: row.trx_id,
                    clientRefId: row.client_ref_id,
                    appId: row.app_id || 'default',
                    webhookUrl: row.webhook_url,
                    webhookStatus: row.webhook_status || 'NONE',
                    amount: parseInt(row.amount, 10),
                    baseAmount: parseInt(row.base_amount || row.amount, 10),
                    uniqueCode: parseInt(row.unique_code || 0, 10),
                    data: row.qris_code,
                    status: row.status,
                    createdAt: new Date(parseInt(row.created_at, 10)),
                    expiresAt: new Date(parseInt(row.expires_at, 10)),
                    transaction: row.transaction_data ? JSON.parse(row.transaction_data) : null
                }));
            } catch (e) {
                console.error('[PG GET ALL ORDERS ERROR]:', e.message);
                return [];
            }
        }
        const rows = stmtGetAllOrders.all(limit);
        return rows.map(row => ({
            qrisId: row.qris_id,
            trxId: row.trx_id,
            clientRefId: row.client_ref_id,
            appId: row.app_id || 'default',
            webhookUrl: row.webhook_url,
            webhookStatus: row.webhook_status || 'NONE',
            amount: row.amount,
            baseAmount: row.base_amount || row.amount,
            uniqueCode: row.unique_code || 0,
            data: row.qris_code,
            status: row.status,
            createdAt: new Date(row.created_at),
            expiresAt: new Date(row.expires_at),
            transaction: row.transaction_data ? JSON.parse(row.transaction_data) : null
        }));
    },

    async saveOrder(order) {
        const qrisId = order.qrisId || 'QR-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        const createdAt = order.createdAt ? (typeof order.createdAt === 'object' ? order.createdAt.getTime() : order.createdAt) : Date.now();
        const expiresAt = typeof order.expiresAt === 'object' ? order.expiresAt.getTime() : order.expiresAt;
        const qrisCode = order.data || order.qrisCode || order.qrisString || '';
        const merchantId = order.merchantId || order.merchant_id || null;

        if (isPostgres) {
            try {
                await pgPool.query(`
                    INSERT INTO qris_orders (qris_id, trx_id, merchant_id, client_ref_id, app_id, webhook_url, webhook_status, amount, base_amount, unique_code, qris_code, status, created_at, expires_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    ON CONFLICT (qris_id) DO UPDATE SET status = EXCLUDED.status, webhook_status = EXCLUDED.webhook_status, merchant_id = EXCLUDED.merchant_id
                `, [
                    qrisId, order.trxId, merchantId, order.clientRefId || order.refId || null, order.appId || 'default',
                    order.webhookUrl || null, order.webhookUrl ? 'PENDING' : 'NONE', order.amount,
                    order.baseAmount || order.amount, order.uniqueCode || 0, qrisCode, order.status || 'PENDING',
                    createdAt, expiresAt
                ]);
            } catch (e) {
                console.error('[PG SAVE ORDER ERROR]:', e.message);
            }
        } else {
            stmtInsertOrder.run({
                qrisId,
                trxId: order.trxId,
                merchantId,
                clientRefId: order.clientRefId || order.refId || null,
                appId: order.appId || 'default',
                webhookUrl: order.webhookUrl || null,
                webhookStatus: order.webhookUrl ? 'PENDING' : 'NONE',
                amount: order.amount,
                baseAmount: order.baseAmount || order.amount,
                uniqueCode: order.uniqueCode || 0,
                qrisCode,
                status: order.status || 'PENDING',
                createdAt,
                expiresAt
            });
        }

        return {
            ...order,
            qrisId,
            trxId: order.trxId,
            clientRefId: order.clientRefId || order.refId || null,
            appId: order.appId || 'default',
            qrisCode,
            createdAt: new Date(createdAt),
            expiresAt: new Date(expiresAt)
        };
    },

    async getOrder(qrisId) {
        if (isPostgres) {
            try {
                const res = await pgPool.query(`SELECT * FROM qris_orders WHERE qris_id = $1 OR trx_id = $1`, [qrisId]);
                if (res.rows.length === 0) return null;
                const row = res.rows[0];
                return {
                    qrisId: row.qris_id,
                    trxId: row.trx_id,
                    clientRefId: row.client_ref_id,
                    appId: row.app_id || 'default',
                    webhookUrl: row.webhook_url,
                    webhookStatus: row.webhook_status,
                    amount: parseInt(row.amount, 10),
                    baseAmount: parseInt(row.base_amount || row.amount, 10),
                    uniqueCode: parseInt(row.unique_code || 0, 10),
                    data: row.qris_code,
                    qrisCode: row.qris_code,
                    qrisString: row.qris_code,
                    status: row.status,
                    createdAt: new Date(parseInt(row.created_at, 10)),
                    expiresAt: new Date(parseInt(row.expires_at, 10)),
                    transaction: row.transaction_data ? JSON.parse(row.transaction_data) : null
                };
            } catch (e) {
                console.error('[PG GET ORDER ERROR]:', e.message);
                return null;
            }
        }
        const row = stmtGetOrder.get(qrisId);
        if (!row) return null;
        return {
            qrisId: row.qris_id,
            trxId: row.trx_id,
            clientRefId: row.client_ref_id,
            appId: row.app_id || 'default',
            webhookUrl: row.webhook_url,
            webhookStatus: row.webhook_status,
            amount: row.amount,
            baseAmount: row.base_amount || row.amount,
            uniqueCode: row.unique_code || 0,
            data: row.qris_code,
            qrisCode: row.qris_code,
            qrisString: row.qris_code,
            status: row.status,
            createdAt: new Date(row.created_at),
            expiresAt: new Date(row.expires_at),
            transaction: row.transaction_data ? JSON.parse(row.transaction_data) : null
        };
    },

    async updateOrderStatus(qrisId, status, transactionData = null) {
        if (!qrisId) return;
        if (isPostgres) {
            try {
                await pgPool.query(`UPDATE qris_orders SET status = $1, transaction_data = $2 WHERE qris_id = $3 OR trx_id = $3`, [
                    status, transactionData ? JSON.stringify(transactionData) : null, qrisId
                ]);
            } catch (e) {
                console.error('[PG UPDATE STATUS ERROR]:', e.message);
            }
        } else {
            try {
                sqliteDb.prepare(`UPDATE qris_orders SET status = ?, transaction_data = ? WHERE qris_id = ? OR trx_id = ?`).run(
                    status, transactionData ? JSON.stringify(transactionData) : null, qrisId, qrisId
                );
            } catch (e) {
                console.error('[SQLITE UPDATE STATUS ERROR]:', e.message);
            }
        }
    },

    async updateOrderWebhookStatus(qrisId, webhookStatus) {
        if (!qrisId) return;
        if (isPostgres) {
            try {
                await pgPool.query(`UPDATE qris_orders SET webhook_status = $1 WHERE qris_id = $2 OR trx_id = $2`, [webhookStatus, qrisId]);
            } catch (e) {
                console.error('[PG UPDATE WEBHOOK STATUS ERROR]:', e.message);
            }
        } else {
            try {
                sqliteDb.prepare(`UPDATE qris_orders SET webhook_status = ? WHERE qris_id = ? OR trx_id = ?`).run(webhookStatus, qrisId, qrisId);
            } catch (e) {
                console.error('[SQLITE UPDATE WEBHOOK STATUS ERROR]:', e.message);
            }
        }
    },

    async getClaimedTransaction(txId) {
        if (isPostgres) {
            try {
                const res = await pgPool.query(`SELECT * FROM claimed_transactions WHERE transaction_id = $1`, [txId]);
                if (res.rows.length === 0) return null;
                const row = res.rows[0];
                return {
                    txId: row.transaction_id,
                    qrisId: row.qris_id,
                    qris_id: row.qris_id,
                    trxId: row.qris_id,
                    orderId: row.order_id,
                    amount: parseInt(row.amount, 10),
                    payerIssuer: row.payer_issuer,
                    paymentType: row.payment_type,
                    transactionTime: row.transaction_time,
                    claimedAt: parseInt(row.claimed_at, 10)
                };
            } catch (e) {
                console.error('[PG GET CLAIMED TX ERROR]:', e.message);
                return null;
            }
        }
        const row = stmtGetClaimedTx.get(txId);
        if (!row) return null;
        let publicQrisId = row.qris_id;
        if (row.qris_id) {
            const orderRow = stmtGetOrderByTrxId.get(row.qris_id, row.qris_id);
            if (orderRow && orderRow.qris_id) publicQrisId = orderRow.qris_id;
        }
        return {
            txId: row.transaction_id,
            qrisId: publicQrisId,
            qris_id: publicQrisId,
            trxId: row.qris_id,
            orderId: row.order_id,
            amount: row.amount,
            payerIssuer: row.payer_issuer,
            paymentType: row.payment_type,
            transactionTime: row.transaction_time,
            claimedAt: row.claimed_at
        };
    },

    async claimTransaction(txId, claim) {
        let publicQrisId = claim.qrisId || null;
        if (!isPostgres && publicQrisId) {
            const orderRow = stmtGetOrderByTrxId.get(publicQrisId, publicQrisId);
            if (orderRow) publicQrisId = orderRow.qris_id;
        }

        const merchantId = claim.merchantId || claim.merchant_id || (claim.order ? claim.order.merchantId : null);

        if (isPostgres) {
            try {
                await pgPool.query(`
                    INSERT INTO claimed_transactions (transaction_id, order_id, qris_id, merchant_id, amount, payer_issuer, payment_type, transaction_time, claimed_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (transaction_id) DO UPDATE SET qris_id = EXCLUDED.qris_id, merchant_id = EXCLUDED.merchant_id
                `, [
                    txId, claim.order_id || null, publicQrisId, merchantId, claim.amount,
                    claim.payer_issuer || 'GoPay / Bank', claim.payment_type || 'QRIS',
                    claim.transaction_time || null, Date.now()
                ]);
            } catch (e) {
                console.error('[PG CLAIM TX ERROR]:', e.message);
            }
        } else {
            stmtClaimTx.run({
                txId,
                orderId: claim.order_id || null,
                qrisId: publicQrisId,
                merchantId,
                amount: claim.amount,
                payerIssuer: claim.payer_issuer || 'GoPay / Bank',
                paymentType: claim.payment_type || 'QRIS',
                transactionTime: claim.transaction_time || null,
                claimedAt: Date.now()
            });
        }
    },

    async cleanExpiredClaims(maxAgeMs = 24 * 60 * 60 * 1000) {
        const threshold = Date.now() - maxAgeMs;
        if (isPostgres) {
            try {
                await pgPool.query(`DELETE FROM claimed_transactions WHERE claimed_at < $1`, [threshold]);
            } catch (e) {}
        } else {
            stmtCleanExpiredClaims.run(threshold);
        }
    },

    async enqueueWebhook(data) {
        const now = Date.now();
        if (isPostgres) {
            try {
                const res = await pgPool.query(`
                    INSERT INTO webhook_queue (qris_id, client_ref_id, webhook_url, payload, attempts, max_attempts, status, created_at, next_attempt_at)
                    VALUES ($1, $2, $3, $4, 0, 3, 'PENDING', $5, $6)
                    RETURNING id
                `, [
                    data.qrisId, data.clientRefId || null, data.webhookUrl,
                    typeof data.payload === 'object' ? JSON.stringify(data.payload) : data.payload,
                    now, now
                ]);
                return res.rows[0].id;
            } catch (e) {
                console.error('[PG ENQUEUE WEBHOOK ERROR]:', e.message);
                return 1;
            }
        } else {
            const info = stmtEnqueueWebhook.run({
                qrisId: data.qrisId,
                clientRefId: data.clientRefId || null,
                webhookUrl: data.webhookUrl,
                payload: typeof data.payload === 'object' ? JSON.stringify(data.payload) : data.payload,
                createdAt: now,
                nextAttemptAt: now
            });
            return info.lastInsertRowid;
        }
    },

    async getPendingWebhooks(limit = 10) {
        const now = Date.now();
        if (isPostgres) {
            try {
                const res = await pgPool.query(`SELECT * FROM webhook_queue WHERE status = 'PENDING' AND next_attempt_at <= $1 ORDER BY id ASC LIMIT $2`, [now, limit]);
                return res.rows.map(r => ({
                    id: r.id,
                    qrisId: r.qris_id,
                    clientRefId: r.client_ref_id,
                    webhookUrl: r.webhook_url,
                    payload: JSON.parse(r.payload),
                    attempts: parseInt(r.attempts, 10),
                    maxAttempts: parseInt(r.max_attempts, 10),
                    status: r.status,
                    lastError: r.last_error,
                    createdAt: parseInt(r.created_at, 10),
                    nextAttemptAt: parseInt(r.next_attempt_at, 10)
                }));
            } catch (e) {
                console.error('[PG GET PENDING WEBHOOKS ERROR]:', e.message);
                return [];
            }
        }
        const rows = stmtGetPendingWebhooks.all(now, limit);
        return rows.map(r => ({
            id: r.id,
            qrisId: r.qris_id,
            clientRefId: r.client_ref_id,
            webhookUrl: r.webhook_url,
            payload: JSON.parse(r.payload),
            attempts: r.attempts,
            maxAttempts: r.max_attempts,
            status: r.status,
            lastError: r.last_error,
            createdAt: r.created_at,
            nextAttemptAt: r.next_attempt_at
        }));
    },

    async updateWebhookAttempt(id, status, lastError = null, nextAttemptAt = Date.now()) {
        if (isPostgres) {
            try {
                await pgPool.query(`
                    UPDATE webhook_queue 
                    SET attempts = attempts + 1, status = $1, last_error = $2, next_attempt_at = $3
                    WHERE id = $4
                `, [status, lastError ? String(lastError) : null, nextAttemptAt, id]);
            } catch (e) {
                console.error('[PG UPDATE WEBHOOK ATTEMPT ERROR]:', e.message);
            }
        } else {
            const row = sqliteDb.prepare(`SELECT attempts FROM webhook_queue WHERE id = ?`).get(id);
            const attempts = row ? row.attempts + 1 : 1;
            stmtUpdateWebhookAttempt.run({
                id,
                attempts,
                status,
                lastError: lastError ? String(lastError) : null,
                nextAttemptAt
            });
        }
    },

    async getAllWebhooks(limit = 50) {
        if (isPostgres) {
            try {
                const res = await pgPool.query(`SELECT * FROM webhook_queue ORDER BY id DESC LIMIT $1`, [limit]);
                return res.rows.map(r => ({
                    id: r.id,
                    qrisId: r.qris_id,
                    clientRefId: r.client_ref_id,
                    webhookUrl: r.webhook_url,
                    payload: JSON.parse(r.payload),
                    attempts: parseInt(r.attempts, 10),
                    maxAttempts: parseInt(r.max_attempts, 10),
                    status: r.status,
                    lastError: r.last_error,
                    createdAt: new Date(parseInt(r.created_at, 10)),
                    nextAttemptAt: new Date(parseInt(r.next_attempt_at, 10))
                }));
            } catch (e) {
                console.error('[PG GET ALL WEBHOOKS ERROR]:', e.message);
                return [];
            }
        }
        const rows = stmtGetAllWebhooks.all(limit);
        return rows.map(r => ({
            id: r.id,
            qrisId: r.qris_id,
            clientRefId: r.client_ref_id,
            webhookUrl: r.webhook_url,
            payload: JSON.parse(r.payload),
            attempts: r.attempts,
            maxAttempts: r.max_attempts,
            status: r.status,
            lastError: r.last_error,
            createdAt: new Date(r.created_at),
            nextAttemptAt: new Date(r.next_attempt_at)
        }));
    },

    async clearAllOrders() {
        if (isPostgres) {
            try {
                await pgPool.query("DELETE FROM qris_orders; DELETE FROM claimed_transactions; DELETE FROM webhook_queue;");
            } catch (e) {}
        } else {
            sqliteDb.exec("DELETE FROM qris_orders; DELETE FROM claimed_transactions; DELETE FROM webhook_queue;");
        }
        return true;
    },

    async getUnclaimedTransactions() {
        if (isPostgres) {
            try {
                const res = await pgPool.query(`SELECT * FROM claimed_transactions WHERE qris_id IS NULL OR qris_id = ''`);
                return res.rows.map(r => ({
                    transaction_id: r.transaction_id,
                    order_id: r.order_id,
                    qris_id: r.qris_id,
                    amount: parseInt(r.amount, 10),
                    payer_issuer: r.payer_issuer,
                    payment_type: r.payment_type,
                    transaction_time: r.transaction_time,
                    claimed_at: parseInt(r.claimed_at, 10)
                }));
            } catch (e) {
                console.error('[PG GET UNCLAIMED TX ERROR]:', e.message);
                return [];
            }
        }
        const rows = sqliteDb.prepare(`SELECT * FROM claimed_transactions WHERE qris_id IS NULL OR qris_id = ''`).all();
        return rows.map(r => ({
            transaction_id: r.transaction_id,
            order_id: r.order_id,
            qris_id: r.qris_id,
            amount: r.amount,
            payer_issuer: r.payer_issuer,
            payment_type: r.payment_type,
            transaction_time: r.transaction_time,
            claimed_at: r.claimed_at
        }));
    },

    async updateClaimedTransactionOwner(transactionId, qrisId) {
        if (isPostgres) {
            try {
                await pgPool.query(`UPDATE claimed_transactions SET qris_id = $1 WHERE transaction_id = $2`, [qrisId, transactionId]);
            } catch (e) {}
        } else {
            sqliteDb.prepare(`UPDATE claimed_transactions SET qris_id = ? WHERE transaction_id = ?`).run(qrisId, transactionId);
        }
    },

    async getAllClaimedTransactions(limit = 100) {
        if (isPostgres) {
            try {
                const res = await pgPool.query(`SELECT * FROM claimed_transactions ORDER BY claimed_at DESC LIMIT $1`, [limit]);
                return res.rows.map(r => ({
                    transaction_id: r.transaction_id,
                    order_id: r.order_id,
                    qris_id: r.qris_id,
                    merchant_id: r.merchant_id,
                    amount: parseInt(r.amount, 10),
                    payer_issuer: r.payer_issuer,
                    payment_type: r.payment_type,
                    transaction_time: r.transaction_time,
                    claimed_at: parseInt(r.claimed_at, 10)
                }));
            } catch (e) {
                console.error('[PG GET ALL CLAIMED TX ERROR]:', e.message);
                return [];
            }
        }
        try {
            const rows = sqliteDb.prepare(`SELECT * FROM claimed_transactions ORDER BY claimed_at DESC LIMIT ?`).all(limit);
            return rows.map(r => ({
                transaction_id: r.transaction_id,
                order_id: r.order_id,
                qris_id: r.qris_id,
                merchant_id: r.merchant_id,
                amount: r.amount,
                payer_issuer: r.payer_issuer,
                payment_type: r.payment_type,
                transaction_time: r.transaction_time,
                claimed_at: r.claimed_at
            }));
        } catch (e) {
            console.error('[SQLITE GET ALL CLAIMED TX ERROR]:', e.message);
            return [];
        }
    },

    async getClaimedTransactionStats() {
        const startOfDayMs = new Date().setHours(0, 0, 0, 0);
        if (isPostgres) {
            try {
                const resAll = await pgPool.query(`SELECT COALESCE(SUM(amount), 0) as total_sum, COUNT(*) as total_count FROM claimed_transactions`);
                const resToday = await pgPool.query(`SELECT COALESCE(SUM(amount), 0) as today_sum, COUNT(*) as today_count FROM claimed_transactions WHERE claimed_at >= $1`, [startOfDayMs]);
                return {
                    totalAmount: parseInt(resAll.rows[0].total_sum || '0', 10),
                    totalCount: parseInt(resAll.rows[0].total_count || '0', 10),
                    todayAmount: parseInt(resToday.rows[0].today_sum || '0', 10),
                    todayCount: parseInt(resToday.rows[0].today_count || '0', 10)
                };
            } catch (e) {
                console.error('[PG GET STATS ERROR]:', e.message);
                return { totalAmount: 0, totalCount: 0, todayAmount: 0, todayCount: 0 };
            }
        }
        try {
            const rowAll = sqliteDb.prepare(`SELECT COALESCE(SUM(amount), 0) as total_sum, COUNT(*) as total_count FROM claimed_transactions`).get();
            const rowToday = sqliteDb.prepare(`SELECT COALESCE(SUM(amount), 0) as today_sum, COUNT(*) as today_count FROM claimed_transactions WHERE claimed_at >= ?`).get(startOfDayMs);
            return {
                totalAmount: parseInt(rowAll.total_sum || 0, 10),
                totalCount: parseInt(rowAll.total_count || 0, 10),
                todayAmount: parseInt(rowToday.today_sum || 0, 10),
                todayCount: parseInt(rowToday.today_count || 0, 10)
            };
        } catch (e) {
            return { totalAmount: 0, totalCount: 0, todayAmount: 0, todayCount: 0 };
        }
    },

    // ────────────── UNIFIED MERCHANTS TABLE METHODS ──────────────

    async saveMerchant(merchantData) {
        if (!merchantData || !merchantData.merchant_id) return false;
        const mId = String(merchantData.merchant_id).trim();
        const reservedIds = ['active_merchant_id', 'DEFAULT', 'gopay_static_qris', 'GOBIZ_MAIN_SESSION'];
        if (reservedIds.includes(mId)) {
            return false;
        }
        const mName = String(merchantData.merchant_name || 'Merchant GoPay').trim();
        const phone = merchantData.phone_number ? String(merchantData.phone_number).trim() : null;
        const mType = String(merchantData.merchant_type || 'gopay').toLowerCase().trim();
        const city = merchantData.city ? String(merchantData.city).trim() : '';
        const staticQris = merchantData.static_qris ? String(merchantData.static_qris).trim() : null;
        const sessionData = merchantData.session_data ? (typeof merchantData.session_data === 'object' ? JSON.stringify(merchantData.session_data) : String(merchantData.session_data)) : null;
        const isActive = merchantData.is_active ? 1 : 0;
        const now = Date.now();

        if (isPostgres) {
            try {
                await pgPool.query(`
                    INSERT INTO merchants (merchant_id, merchant_name, phone_number, merchant_type, city, static_qris, session_data, is_active, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
                    ON CONFLICT (merchant_id) DO UPDATE SET
                        merchant_name = EXCLUDED.merchant_name,
                        phone_number = COALESCE(EXCLUDED.phone_number, merchants.phone_number),
                        merchant_type = EXCLUDED.merchant_type,
                        city = EXCLUDED.city,
                        static_qris = COALESCE(EXCLUDED.static_qris, merchants.static_qris),
                        session_data = COALESCE(EXCLUDED.session_data, merchants.session_data),
                        updated_at = EXCLUDED.updated_at
                `, [mId, mName, phone, mType, city, staticQris, sessionData, isActive, now]);

                return true;
            } catch (e) {
                console.error('[PG SAVE MERCHANT ERROR]:', e.message);
                return false;
            }
        } else {
            try {
                sqliteDb.prepare(`
                    INSERT INTO merchants (merchant_id, merchant_name, phone_number, merchant_type, city, static_qris, session_data, is_active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(merchant_id) DO UPDATE SET
                        merchant_name = excluded.merchant_name,
                        phone_number = COALESCE(excluded.phone_number, merchants.phone_number),
                        merchant_type = excluded.merchant_type,
                        city = excluded.city,
                        static_qris = COALESCE(excluded.static_qris, merchants.static_qris),
                        session_data = COALESCE(excluded.session_data, merchants.session_data),
                        updated_at = excluded.updated_at
                `).run(mId, mName, phone, mType, city, staticQris, sessionData, isActive, now, now);

                return true;
            } catch (e) {
                console.error('[SQLITE SAVE MERCHANT ERROR]:', e.message);
                return false;
            }
        }
    },

    async updateMerchantSession(merchantId, sessionData, setActive = true) {
        if (!merchantId) return false;
        const mId = String(merchantId).trim();
        const strSession = typeof sessionData === 'object' ? JSON.stringify(sessionData) : String(sessionData || '');
        const now = Date.now();

        if (setActive) {
            await this.setActiveMerchant(mId);
        }

        if (isPostgres) {
            try {
                await pgPool.query(`
                    UPDATE merchants SET session_data = $1, is_active = $2, updated_at = $3 WHERE merchant_id = $4
                `, [strSession, setActive, now, mId]);
                return true;
            } catch (e) {
                console.error('[PG UPDATE MERCHANT SESSION ERROR]:', e.message);
                return false;
            }
        } else {
            try {
                sqliteDb.prepare(`UPDATE merchants SET session_data = ?, is_active = ?, updated_at = ? WHERE merchant_id = ?`)
                    .run(strSession, setActive ? 1 : 0, now, mId);
                return true;
            } catch (e) {
                console.error('[SQLITE UPDATE MERCHANT SESSION ERROR]:', e.message);
                return false;
            }
        }
    },

    async getMerchantById(merchantId) {
        if (!merchantId) return null;
        const mId = String(merchantId).trim();
        if (isPostgres) {
            try {
                const res = await pgPool.query(`SELECT * FROM merchants WHERE merchant_id = $1`, [mId]);
                return res.rows.length > 0 ? res.rows[0] : null;
            } catch (e) { return null; }
        } else {
            try {
                return sqliteDb.prepare(`SELECT * FROM merchants WHERE merchant_id = ?`).get(mId) || null;
            } catch (e) { return null; }
        }
    },

    async getActiveMerchant() {
        if (isPostgres) {
            try {
                let res = await pgPool.query(`SELECT * FROM merchants WHERE is_active = TRUE LIMIT 1`);
                if (res.rows.length === 0) {
                    res = await pgPool.query(`SELECT * FROM merchants WHERE session_data IS NOT NULL ORDER BY updated_at DESC LIMIT 1`);
                }
                if (res.rows.length === 0) {
                    res = await pgPool.query(`SELECT * FROM merchants ORDER BY updated_at DESC LIMIT 1`);
                }
                return res.rows.length > 0 ? res.rows[0] : null;
            } catch (e) { return null; }
        } else {
            try {
                let row = sqliteDb.prepare(`SELECT * FROM merchants WHERE is_active = 1 LIMIT 1`).get();
                if (!row) {
                    row = sqliteDb.prepare(`SELECT * FROM merchants WHERE session_data IS NOT NULL ORDER BY updated_at DESC LIMIT 1`).get();
                }
                if (!row) {
                    row = sqliteDb.prepare(`SELECT * FROM merchants ORDER BY updated_at DESC LIMIT 1`).get();
                }
                return row || null;
            } catch (e) { return null; }
        }
    },

    async setActiveMerchant(merchantId) {
        if (!merchantId) return false;
        const mId = String(merchantId).trim();
        const now = Date.now();
        if (isPostgres) {
            try {
                await pgPool.query(`UPDATE merchants SET is_active = FALSE`);
                await pgPool.query(`UPDATE merchants SET is_active = TRUE, updated_at = $1 WHERE merchant_id = $2`, [now, mId]);
                return true;
            } catch (e) { return false; }
        } else {
            try {
                sqliteDb.prepare(`UPDATE merchants SET is_active = 0`).run();
                sqliteDb.prepare(`UPDATE merchants SET is_active = 1, updated_at = ? WHERE merchant_id = ?`).run(now, mId);
                return true;
            } catch (e) { return false; }
        }
    },

    async getAllMerchants() {
        let rows = [];
        if (isPostgres) {
            try {
                const res = await pgPool.query(`SELECT * FROM merchants WHERE merchant_id NOT IN ('active_merchant_id', 'DEFAULT', 'gopay_static_qris', 'GOBIZ_MAIN_SESSION') ORDER BY updated_at DESC`);
                rows = res.rows;
            } catch (e) {
                console.error('[PG GET ALL MERCHANTS ERROR]:', e.message);
                return [];
            }
        } else {
            try {
                rows = sqliteDb.prepare(`SELECT * FROM merchants WHERE merchant_id NOT IN ('active_merchant_id', 'DEFAULT', 'gopay_static_qris', 'GOBIZ_MAIN_SESSION') ORDER BY updated_at DESC`).all();
            } catch (e) {
                return [];
            }
        }

        const hasAnyActive = rows.some(r => r.is_active);

        return rows.map((r, idx) => {
            let sessionParsed = null;
            if (r.session_data) {
                try { sessionParsed = JSON.parse(r.session_data); } catch (e) {}
            }
            const phone = r.phone_number || (sessionParsed && (sessionParsed.phone_number || sessionParsed.phoneNumber || sessionParsed.phone)) || '-';
            const isActive = Boolean(r.is_active) || (!hasAnyActive && idx === 0);

            return {
                merchantId: r.merchant_id,
                merchant_id: r.merchant_id,
                merchantName: r.merchant_name || 'Merchant GoPay',
                merchant_name: r.merchant_name || 'Merchant GoPay',
                phoneNumber: phone,
                phone_number: phone,
                merchantType: r.merchant_type || 'gopay',
                merchant_type: r.merchant_type || 'gopay',
                city: r.city || '',
                staticQris: r.static_qris || '',
                static_qris: r.static_qris || '',
                hasSession: Boolean(r.session_data),
                isActive: isActive,
                updatedAt: parseInt(r.updated_at, 10)
            };
        });
    },

    async setActiveMerchant(merchantId) {
        if (!merchantId) return false;
        const mId = String(merchantId).trim();
        
        if (isPostgres) {
            try {
                await pgPool.query(`UPDATE merchants SET is_active = FALSE`);
                await pgPool.query(`UPDATE merchants SET is_active = TRUE WHERE merchant_id = $1`, [mId]);
            } catch (e) {
                console.error('[PG SET ACTIVE MERCHANT ERROR]:', e.message);
            }
        } else {
            try {
                sqliteDb.prepare(`UPDATE merchants SET is_active = 0`).run();
                sqliteDb.prepare(`UPDATE merchants SET is_active = 1 WHERE merchant_id = ?`).run(mId);
            } catch (e) {}
        }
        return true;
    },

    async deleteMerchantSession(merchantId = null) {
        if (isPostgres) {
            try {
                if (merchantId) {
                    await pgPool.query(`UPDATE merchants SET session_data = NULL, updated_at = NOW() WHERE merchant_id = $1`, [merchantId]);
                } else {
                    await pgPool.query(`UPDATE merchants SET session_data = NULL, updated_at = NOW()`);
                }
            } catch (e) {
                console.error('[PG DELETE MERCHANT SESSION ERROR]:', e.message);
            }
        } else {
            try {
                if (merchantId) {
                    sqliteDb.prepare(`UPDATE merchants SET session_data = NULL, updated_at = CURRENT_TIMESTAMP WHERE merchant_id = ?`).run(merchantId);
                } else {
                    sqliteDb.prepare(`UPDATE merchants SET session_data = NULL, updated_at = CURRENT_TIMESTAMP`).run();
                }
            } catch (e) {}
        }
        return true;
    },

    async deleteMerchant(merchantId) {
        if (!merchantId) return false;
        const mId = String(merchantId).trim();
        if (isPostgres) {
            try {
                await pgPool.query(`DELETE FROM merchants WHERE merchant_id = $1`, [mId]);
                return true;
            } catch (e) {
                console.error('[PG DELETE MERCHANT ERROR]:', e.message);
                return false;
            }
        } else {
            try {
                sqliteDb.prepare(`DELETE FROM merchants WHERE merchant_id = ?`).run(mId);
                return true;
            } catch (e) {
                console.error('[SQLITE DELETE MERCHANT ERROR]:', e.message);
                return false;
            }
        }
    },

    // Wrappers untuk backward compatibility
    async saveMerchantSession(sessionData, key = null) {
        if (!sessionData) return;
        let parsed = null;
        if (typeof sessionData === 'string') {
            try { parsed = JSON.parse(sessionData); } catch (e) {}
        } else {
            parsed = sessionData;
        }

        const mId = (parsed && (parsed.merchant_id || parsed.merchantId)) ? (parsed.merchant_id || parsed.merchantId) : (key && key !== 'GOBIZ_MAIN_SESSION' ? key : null);
        
        let targetMerchant = null;
        if (mId) {
            targetMerchant = await this.getMerchantById(mId);
        }
        if (!targetMerchant) {
            targetMerchant = await this.getActiveMerchant();
        }

        const finalMerchantId = targetMerchant ? targetMerchant.merchant_id : (mId || 'G844728303');
        const phone = parsed && (parsed.phone_number || parsed.phoneNumber || parsed.phone);

        await this.saveMerchant({
            merchant_id: finalMerchantId,
            merchant_name: (parsed && (parsed.outlet_name || parsed.merchant_name)) || (targetMerchant && targetMerchant.merchant_name) || 'Merchant GoPay',
            phone_number: phone || (targetMerchant && targetMerchant.phone_number) || null,
            session_data: sessionData,
            is_active: true
        });
    },

    async getMerchantSession(key = 'GOBIZ_MAIN_SESSION') {
        let activeM = null;
        if (key && key !== 'GOBIZ_MAIN_SESSION' && key !== 'gobiz_primary') {
            activeM = await this.getMerchantById(key);
        }
        if (!activeM) {
            activeM = await this.getActiveMerchant();
        }
        if (activeM && activeM.session_data) {
            try {
                return JSON.parse(activeM.session_data);
            } catch (e) {
                return activeM.session_data;
            }
        }
        return null;
    },

    async deleteMerchantSession(key = 'gobiz_primary') {
        const activeM = await this.getActiveMerchant();
        if (activeM) {
            await this.updateMerchantSession(activeM.merchant_id, null, false);
        }
    },

    async saveSetting(merchantId, staticQris, merchantType = 'gopay', customMerchantName = null, customCity = null) {
        if (!merchantId) return;
        const mId = String(merchantId).trim();
        const strVal = String(staticQris || '').trim();
        const mType = String(merchantType || 'gopay').toLowerCase().trim();
        const parsed = parseQrisDetails(strVal);
        const mName = customMerchantName || parsed.merchantName || 'Merchant GoPay';
        const mCity = customCity || parsed.city || '';

        await this.saveMerchant({
            merchant_id: mId,
            merchant_name: mName,
            merchant_type: mType,
            city: mCity,
            static_qris: strVal
        });
    },

    async getSetting(merchantId) {
        if (!merchantId) return null;
        const m = await this.getMerchantById(merchantId);
        if (m && m.static_qris) return m.static_qris;
        const activeM = await this.getActiveMerchant();
        return activeM ? activeM.static_qris : null;
    },

    async getStaticQris(merchantId = null) {
        let mId = merchantId;
        if (!mId) {
            const activeM = await this.getActiveMerchant();
            if (activeM) mId = activeM.merchant_id;
        }

        if (mId) {
            const m = await this.getMerchantById(mId);
            if (m && m.static_qris && m.static_qris.trim()) {
                return m.static_qris.trim();
            }
        }

        const defaultM = await this.getMerchantById('DEFAULT');
        if (defaultM && defaultM.static_qris) return defaultM.static_qris.trim();
        return (process.env.GOPAY_STATIC_QRIS || '').trim();
    },

    async saveStaticQris(qrisString, merchantId = null, merchantType = 'gopay', merchantName = null, city = null) {
        if (!qrisString) return;
        let mId = merchantId;
        if (!mId) {
            const activeM = await this.getActiveMerchant();
            if (activeM) mId = activeM.merchant_id;
        }
        if (!mId) mId = 'G844728303';

        await this.saveSetting(mId, qrisString, merchantType, merchantName, city);
    },

    async getAllMerchantSettings() {
        return await this.getAllMerchants();
    },

    async updateMerchantSettings(merchantId, fields = {}) {
        if (!merchantId) return { success: false, message: 'merchant_id wajib diisi' };
        const mId = String(merchantId).trim();
        const existing = await this.getMerchantById(mId);

        const updateData = {
            merchant_id: mId,
            merchant_name: fields.merchant_name !== undefined ? fields.merchant_name : (existing ? existing.merchant_name : 'Merchant GoPay'),
            phone_number: fields.phone_number !== undefined ? fields.phone_number : (existing ? existing.phone_number : null),
            merchant_type: fields.merchant_type !== undefined ? fields.merchant_type : (existing ? existing.merchant_type : 'gopay'),
            city: fields.city !== undefined ? fields.city : (existing ? existing.city : ''),
            static_qris: fields.static_qris !== undefined ? fields.static_qris : (existing ? existing.static_qris : null),
            session_data: fields.session_data !== undefined ? fields.session_data : (existing ? existing.session_data : null)
        };

        const success = await this.saveMerchant(updateData);
        return { success, message: success ? `Data Merchant ${mId} berhasil diperbarui` : 'Gagal mengupdate merchant' };
    },

    async getAllApiClients() {
        let rows = [];
        if (isPostgres) {
            try {
                const res = await pgPool.query(`SELECT * FROM api_clients ORDER BY created_at ASC`);
                rows = res.rows;
            } catch (e) {
                console.error('[PG GET ALL API CLIENTS ERROR]:', e.message);
                return [];
            }
        } else {
            try {
                rows = sqliteDb.prepare(`SELECT * FROM api_clients ORDER BY created_at ASC`).all();
            } catch (e) {
                return [];
            }
        }
        return rows.map(r => ({
            appId: r.app_id,
            app_id: r.app_id,
            appSecret: r.app_secret,
            app_secret: r.app_secret,
            clientName: r.client_name || r.app_id,
            client_name: r.client_name || r.app_id,
            isActive: Boolean(r.is_active),
            is_active: Boolean(r.is_active),
            createdAt: parseInt(r.created_at, 10),
            updatedAt: parseInt(r.updated_at, 10)
        }));
    },

    async getApiClient(appId) {
        if (!appId) return null;
        const cleanId = String(appId).trim();
        const cacheKey = 'api_client:' + cleanId;

        // 1. Try Redis Cache first (Fast <1ms lookup)
        const cached = await cacheGet(cacheKey);
        if (cached && typeof cached === 'object' && (cached.app_id || cached.appId)) {
            return cached;
        }

        // 2. Cache MISS -> Query PostgreSQL / SQLite
        let r = null;
        if (isPostgres) {
            try {
                const res = await pgPool.query(`SELECT * FROM api_clients WHERE app_id = $1`, [cleanId]);
                if (res.rows.length > 0) r = res.rows[0];
            } catch (e) {}
        } else {
            try {
                r = sqliteDb.prepare(`SELECT * FROM api_clients WHERE app_id = ?`).get(cleanId);
            } catch (e) {}
        }

        if (!r) return null;

        const clientData = {
            appId: r.app_id,
            app_id: r.app_id,
            appSecret: r.app_secret,
            app_secret: r.app_secret,
            clientName: r.client_name || r.app_id,
            client_name: r.client_name || r.app_id,
            isActive: Boolean(r.is_active),
            is_active: Boolean(r.is_active)
        };

        // 3. Save to Redis Cache (TTL 1 Hour = 3600 seconds)
        await cacheSet(cacheKey, clientData, 3600);

        return clientData;
    },

    async saveApiClient(appId, appSecret, clientName = '', isActive = true) {
        if (!appId || !appSecret) return false;
        const cleanId = String(appId).trim();
        const cleanSecret = String(appSecret).trim();
        const cleanName = String(clientName || cleanId).trim();
        const activeBool = Boolean(isActive);
        const now = Date.now();
        let success = false;

        if (isPostgres) {
            try {
                await pgPool.query(`
                    INSERT INTO api_clients (app_id, app_secret, client_name, is_active, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $5)
                    ON CONFLICT (app_id) DO UPDATE SET
                        app_secret = EXCLUDED.app_secret,
                        client_name = EXCLUDED.client_name,
                        is_active = EXCLUDED.is_active,
                        updated_at = EXCLUDED.updated_at
                `, [cleanId, cleanSecret, cleanName, activeBool, now]);
                success = true;
            } catch (e) {
                console.error('[PG SAVE API CLIENT ERROR]:', e.message);
            }
        } else {
            try {
                sqliteDb.prepare(`
                    INSERT INTO api_clients (app_id, app_secret, client_name, is_active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(app_id) DO UPDATE SET
                        app_secret = excluded.app_secret,
                        client_name = excluded.client_name,
                        is_active = excluded.is_active,
                        updated_at = excluded.updated_at
                `).run(cleanId, cleanSecret, cleanName, activeBool ? 1 : 0, now, now);
                success = true;
            } catch (e) {}
        }

        if (success) {
            // Update Redis cache immediately
            const clientData = {
                appId: cleanId,
                app_id: cleanId,
                appSecret: cleanSecret,
                app_secret: cleanSecret,
                clientName: cleanName,
                client_name: cleanName,
                isActive: activeBool,
                is_active: activeBool
            };
            await cacheSet('api_client:' + cleanId, clientData, 3600);
        }

        return success;
    },

    async deleteApiClient(appId) {
        if (!appId) return false;
        const cleanId = String(appId).trim();
        let success = false;
        if (isPostgres) {
            try {
                await pgPool.query(`DELETE FROM api_clients WHERE app_id = $1`, [cleanId]);
                success = true;
            } catch (e) {}
        } else {
            try {
                sqliteDb.prepare(`DELETE FROM api_clients WHERE app_id = ?`).run(cleanId);
                success = true;
            } catch (e) {}
        }

        if (success) {
            // Invalidate Redis cache immediately
            await cacheDel('api_client:' + cleanId);
        }
        return success;
    },

    async verifyApiClient(appId, appSecret) {
        if (!appId || !appSecret) return false;
        const client = await this.getApiClient(appId);
        if (!client) return false;
        if (!client.isActive) return false;
        return client.appSecret === String(appSecret).trim();
    },



    isPostgres,
    dbType: isPostgres ? 'PostgreSQL' : 'SQLite WAL',
    pgPool,
    sqliteDb
};
