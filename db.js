// Database Abstraction Layer - Dual Engine: SQLite (Default Local) & PostgreSQL (DATABASE_URL)
const path = require('path');
const fs = require('fs');

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

    // Initialize PostgreSQL Tables
    const initPgSchema = async () => {
        try {
            const client = await pgPool.connect();
            await client.query(`
                CREATE TABLE IF NOT EXISTS qris_orders (
                    qris_id VARCHAR(100) PRIMARY KEY,
                    trx_id VARCHAR(100) UNIQUE,
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

                CREATE TABLE IF NOT EXISTS merchant_sessions (
                    session_key VARCHAR(100) PRIMARY KEY,
                    session_data TEXT NOT NULL,
                    updated_at BIGINT NOT NULL
                );
            `);
            client.release();
            console.log('[DATABASE] Connected & Schema Initialized on PostgreSQL!');
        } catch (err) {
            console.error('[DATABASE ERROR] Failed to initialize PostgreSQL:', err.message);
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

        CREATE TABLE IF NOT EXISTS merchant_sessions (
            session_key TEXT PRIMARY KEY,
            session_data TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );
    `);

    try { sqliteDb.exec("ALTER TABLE qris_orders ADD COLUMN base_amount INTEGER;"); } catch (e) {}
    try { sqliteDb.exec("ALTER TABLE qris_orders ADD COLUMN unique_code INTEGER DEFAULT 0;"); } catch (e) {}
    try { sqliteDb.exec("ALTER TABLE qris_orders ADD COLUMN client_ref_id TEXT;"); } catch (e) {}
    try { sqliteDb.exec("ALTER TABLE qris_orders ADD COLUMN webhook_url TEXT;"); } catch (e) {}
    try { sqliteDb.exec("ALTER TABLE qris_orders ADD COLUMN webhook_status TEXT DEFAULT 'PENDING';"); } catch (e) {}
    try { sqliteDb.exec("ALTER TABLE qris_orders ADD COLUMN app_id TEXT DEFAULT 'default';"); } catch (e) {}
}

// Prepared Statements for SQLite Mode
const stmtInsertOrder = sqliteDb ? sqliteDb.prepare(`
    INSERT OR REPLACE INTO qris_orders (qris_id, trx_id, client_ref_id, app_id, webhook_url, webhook_status, amount, base_amount, unique_code, qris_code, status, created_at, expires_at)
    VALUES (@qrisId, @trxId, @clientRefId, @appId, @webhookUrl, @webhookStatus, @amount, @baseAmount, @uniqueCode, @qrisCode, @status, @createdAt, @expiresAt)
`) : null;

const stmtGetOrder = sqliteDb ? sqliteDb.prepare(`SELECT * FROM qris_orders WHERE qris_id = ?`) : null;
const stmtUpdateOrderStatus = sqliteDb ? sqliteDb.prepare(`UPDATE qris_orders SET status = @status, transaction_data = @transactionData WHERE qris_id = @qrisId`) : null;
const stmtUpdateOrderWebhookStatus = sqliteDb ? sqliteDb.prepare(`UPDATE qris_orders SET webhook_status = ? WHERE qris_id = ?`) : null;
const stmtGetClaimedTx = sqliteDb ? sqliteDb.prepare(`SELECT * FROM claimed_transactions WHERE transaction_id = ?`) : null;
const stmtGetOrderByTrxId = sqliteDb ? sqliteDb.prepare(`SELECT * FROM qris_orders WHERE trx_id = ? OR qris_id = ?`) : null;
const stmtClaimTx = sqliteDb ? sqliteDb.prepare(`
    INSERT OR REPLACE INTO claimed_transactions (transaction_id, order_id, qris_id, amount, payer_issuer, payment_type, transaction_time, claimed_at)
    VALUES (@txId, @orderId, @qrisId, @amount, @payerIssuer, @paymentType, @transactionTime, @claimedAt)
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

    getActiveUniqueCodesForBaseAmount(baseAmount, cooldownMs = 24 * 60 * 60 * 1000) {
        const threshold = Date.now() - cooldownMs;
        if (isPostgres) {
            // Synchronous fallback or Postgres query
            return [];
        }
        const rows = stmtGetActiveUniqueCodes.all(baseAmount, threshold);
        return rows.map(r => r.unique_code).filter(c => c > 0);
    },

    getActiveUniqueCodes(baseAmount, cooldownMs) {
        return this.getActiveUniqueCodesForBaseAmount(baseAmount, cooldownMs);
    },

    getPendingOrdersForAmount(amount) {
        const now = Date.now();
        if (isPostgres) {
            return [];
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

    getAllOrders(limit = 100) {
        if (isPostgres) return [];
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

    saveOrder(order) {
        const qrisId = order.qrisId || 'QR-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        const createdAt = order.createdAt ? (typeof order.createdAt === 'object' ? order.createdAt.getTime() : order.createdAt) : Date.now();
        const expiresAt = typeof order.expiresAt === 'object' ? order.expiresAt.getTime() : order.expiresAt;
        const qrisCode = order.data || order.qrisCode || order.qrisString || '';

        if (isPostgres) {
            pgPool.query(`
                INSERT INTO qris_orders (qris_id, trx_id, client_ref_id, app_id, webhook_url, webhook_status, amount, base_amount, unique_code, qris_code, status, created_at, expires_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                ON CONFLICT (qris_id) DO UPDATE SET status = EXCLUDED.status, webhook_status = EXCLUDED.webhook_status
            `, [
                qrisId, order.trxId, order.clientRefId || order.refId || null, order.appId || 'default',
                order.webhookUrl || null, order.webhookUrl ? 'PENDING' : 'NONE', order.amount,
                order.baseAmount || order.amount, order.uniqueCode || 0, qrisCode, order.status || 'PENDING',
                createdAt, expiresAt
            ]).catch(e => console.error('[PG SAVE ORDER ERROR]:', e.message));
        } else {
            stmtInsertOrder.run({
                qrisId,
                trxId: order.trxId,
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

    getOrder(qrisId) {
        if (isPostgres) return null;
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

    updateOrderStatus(qrisId, status, transactionData = null) {
        if (isPostgres) {
            pgPool.query(`UPDATE qris_orders SET status = $1, transaction_data = $2 WHERE qris_id = $3`, [
                status, transactionData ? JSON.stringify(transactionData) : null, qrisId
            ]).catch(e => console.error('[PG UPDATE STATUS ERROR]:', e.message));
        } else {
            stmtUpdateOrderStatus.run({
                qrisId,
                status,
                transactionData: transactionData ? JSON.stringify(transactionData) : null
            });
        }
    },

    updateOrderWebhookStatus(qrisId, webhookStatus) {
        if (isPostgres) {
            pgPool.query(`UPDATE qris_orders SET webhook_status = $1 WHERE qris_id = $2`, [webhookStatus, qrisId])
                .catch(e => console.error('[PG UPDATE WEBHOOK STATUS ERROR]:', e.message));
        } else {
            stmtUpdateOrderWebhookStatus.run(webhookStatus, qrisId);
        }
    },

    getClaimedTransaction(txId) {
        if (isPostgres) return null;
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

    claimTransaction(txId, claim) {
        let publicQrisId = claim.qrisId || null;
        if (!isPostgres && publicQrisId) {
            const orderRow = stmtGetOrderByTrxId.get(publicQrisId, publicQrisId);
            if (orderRow) publicQrisId = orderRow.qris_id;
        }

        if (isPostgres) {
            pgPool.query(`
                INSERT INTO claimed_transactions (transaction_id, order_id, qris_id, amount, payer_issuer, payment_type, transaction_time, claimed_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (transaction_id) DO UPDATE SET qris_id = EXCLUDED.qris_id
            `, [
                txId, claim.order_id || null, publicQrisId, claim.amount,
                claim.payer_issuer || 'GoPay / Bank', claim.payment_type || 'QRIS',
                claim.transaction_time || null, Date.now()
            ]).catch(e => console.error('[PG CLAIM TX ERROR]:', e.message));
        } else {
            stmtClaimTx.run({
                txId,
                orderId: claim.order_id || null,
                qrisId: publicQrisId,
                amount: claim.amount,
                payerIssuer: claim.payer_issuer || 'GoPay / Bank',
                paymentType: claim.payment_type || 'QRIS',
                transactionTime: claim.transaction_time || null,
                claimedAt: Date.now()
            });
        }
    },

    cleanExpiredClaims(maxAgeMs = 24 * 60 * 60 * 1000) {
        const threshold = Date.now() - maxAgeMs;
        if (isPostgres) {
            pgPool.query(`DELETE FROM claimed_transactions WHERE claimed_at < $1`, [threshold]).catch(e => {});
        } else {
            stmtCleanExpiredClaims.run(threshold);
        }
    },

    enqueueWebhook(data) {
        const now = Date.now();
        if (isPostgres) {
            pgPool.query(`
                INSERT INTO webhook_queue (qris_id, client_ref_id, webhook_url, payload, attempts, max_attempts, status, created_at, next_attempt_at)
                VALUES ($1, $2, $3, $4, 0, 3, 'PENDING', $5, $6)
            `, [
                data.qrisId, data.clientRefId || null, data.webhookUrl,
                typeof data.payload === 'object' ? JSON.stringify(data.payload) : data.payload,
                now, now
            ]).catch(e => console.error('[PG ENQUEUE WEBHOOK ERROR]:', e.message));
            return 1;
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

    getPendingWebhooks(limit = 10) {
        if (isPostgres) return [];
        const now = Date.now();
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

    updateWebhookAttempt(id, status, lastError = null, nextAttemptAt = Date.now()) {
        if (isPostgres) {
            pgPool.query(`
                UPDATE webhook_queue 
                SET attempts = attempts + 1, status = $1, last_error = $2, next_attempt_at = $3
                WHERE id = $4
            `, [status, lastError ? String(lastError) : null, nextAttemptAt, id])
            .catch(e => console.error('[PG UPDATE WEBHOOK ATTEMPT ERROR]:', e.message));
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

    getAllWebhooks(limit = 50) {
        if (isPostgres) return [];
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

    clearAllOrders() {
        if (isPostgres) {
            pgPool.query("DELETE FROM qris_orders; DELETE FROM claimed_transactions; DELETE FROM webhook_queue;");
        } else {
            sqliteDb.exec("DELETE FROM qris_orders; DELETE FROM claimed_transactions; DELETE FROM webhook_queue;");
        }
        return true;
    },

    getUnclaimedTransactions() {
        if (isPostgres) return [];
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

    updateClaimedTransactionOwner(transactionId, qrisId) {
        if (isPostgres) {
            pgPool.query(`UPDATE claimed_transactions SET qris_id = $1 WHERE transaction_id = $2`, [qrisId, transactionId]);
        } else {
            sqliteDb.prepare(`UPDATE claimed_transactions SET qris_id = ? WHERE transaction_id = ?`).run(qrisId, transactionId);
        }
    },

    saveMerchantSession(sessionData, key = 'gobiz_primary') {
        const str = typeof sessionData === 'object' ? JSON.stringify(sessionData, null, 2) : String(sessionData);
        if (isPostgres) {
            pgPool.query(`
                INSERT INTO merchant_sessions (session_key, session_data, updated_at)
                VALUES ($1, $2, $3)
                ON CONFLICT (session_key) DO UPDATE SET session_data = EXCLUDED.session_data, updated_at = EXCLUDED.updated_at
            `, [key, str, Date.now()]).catch(e => console.error('[PG SAVE SESSION ERROR]:', e.message));
        } else {
            sqliteDb.prepare(`
                INSERT OR REPLACE INTO merchant_sessions (session_key, session_data, updated_at)
                VALUES (?, ?, ?)
            `).run(key, str, Date.now());
        }
    },

    getMerchantSession(key = 'gobiz_primary') {
        if (isPostgres) {
            // For PostgreSQL, async fetch or sync fallback
            return null;
        }
        const row = sqliteDb.prepare(`SELECT session_data FROM merchant_sessions WHERE session_key = ?`).get(key);
        if (!row || !row.session_data) return null;
        try {
            return JSON.parse(row.session_data);
        } catch (e) {
            return row.session_data;
        }
    },

    deleteMerchantSession(key = 'gobiz_primary') {
        if (isPostgres) {
            pgPool.query(`DELETE FROM merchant_sessions WHERE session_key = $1`, [key]).catch(e => {});
        } else {
            sqliteDb.prepare(`DELETE FROM merchant_sessions WHERE session_key = ?`).run(key);
        }
    }
};
