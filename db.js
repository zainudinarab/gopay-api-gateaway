const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'gateway.db');
const db = new Database(dbPath);

// Enable Write-Ahead Logging (WAL) for concurrency & speed
db.pragma('journal_mode = WAL');

// Initialize database schema
db.exec(`
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
`);

// Add missing columns if database existed before
try { db.exec("ALTER TABLE qris_orders ADD COLUMN base_amount INTEGER;"); } catch (e) {}
try { db.exec("ALTER TABLE qris_orders ADD COLUMN unique_code INTEGER DEFAULT 0;"); } catch (e) {}
try { db.exec("ALTER TABLE qris_orders ADD COLUMN client_ref_id TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE qris_orders ADD COLUMN webhook_url TEXT;"); } catch (e) {}
try { db.exec("ALTER TABLE qris_orders ADD COLUMN webhook_status TEXT DEFAULT 'PENDING';"); } catch (e) {}
try { db.exec("ALTER TABLE qris_orders ADD COLUMN app_id TEXT DEFAULT 'default';"); } catch (e) {}

// Prepared statements for high performance
const stmtInsertOrder = db.prepare(`
    INSERT OR REPLACE INTO qris_orders (qris_id, trx_id, client_ref_id, app_id, webhook_url, webhook_status, amount, base_amount, unique_code, qris_code, status, created_at, expires_at)
    VALUES (@qrisId, @trxId, @clientRefId, @appId, @webhookUrl, @webhookStatus, @amount, @baseAmount, @uniqueCode, @qrisCode, @status, @createdAt, @expiresAt)
`);

const stmtGetOrder = db.prepare(`
    SELECT * FROM qris_orders WHERE qris_id = ?
`);

const stmtUpdateOrderStatus = db.prepare(`
    UPDATE qris_orders 
    SET status = @status, transaction_data = @transactionData
    WHERE qris_id = @qrisId
`);

const stmtUpdateOrderWebhookStatus = db.prepare(`
    UPDATE qris_orders 
    SET webhook_status = ?
    WHERE qris_id = ?
`);

const stmtGetClaimedTx = db.prepare(`
    SELECT * FROM claimed_transactions WHERE transaction_id = ?
`);

const stmtGetOrderByTrxId = db.prepare(`
    SELECT * FROM qris_orders WHERE trx_id = ? OR qris_id = ?
`);

const stmtClaimTx = db.prepare(`
    INSERT OR REPLACE INTO claimed_transactions (transaction_id, order_id, qris_id, amount, payer_issuer, payment_type, transaction_time, claimed_at)
    VALUES (@txId, @orderId, @qrisId, @amount, @payerIssuer, @paymentType, @transactionTime, @claimedAt)
`);

const stmtCleanExpiredClaims = db.prepare(`
    DELETE FROM claimed_transactions WHERE claimed_at < ?
`);

const stmtGetAllOrders = db.prepare(`
    SELECT * FROM qris_orders ORDER BY created_at DESC LIMIT ?
`);

const stmtGetActiveUniqueCodes = db.prepare(`
    SELECT unique_code FROM qris_orders 
    WHERE base_amount = ? AND created_at > ?
`);

const stmtGetPendingOrdersForAmount = db.prepare(`
    SELECT * FROM qris_orders 
    WHERE amount = ? AND status = 'PENDING' AND expires_at > ?
    ORDER BY created_at DESC
`);

// Webhook Queue Prepared Statements
const stmtEnqueueWebhook = db.prepare(`
    INSERT INTO webhook_queue (qris_id, client_ref_id, webhook_url, payload, attempts, max_attempts, status, created_at, next_attempt_at)
    VALUES (@qrisId, @clientRefId, @webhookUrl, @payload, 0, 3, 'PENDING', @createdAt, @nextAttemptAt)
`);

const stmtGetPendingWebhooks = db.prepare(`
    SELECT * FROM webhook_queue 
    WHERE status = 'PENDING' AND next_attempt_at <= ? 
    ORDER BY id ASC LIMIT ?
`);

const stmtUpdateWebhookAttempt = db.prepare(`
    UPDATE webhook_queue 
    SET attempts = @attempts, status = @status, last_error = @lastError, next_attempt_at = @nextAttemptAt
    WHERE id = @id
`);

const stmtGetAllWebhooks = db.prepare(`
    SELECT * FROM webhook_queue ORDER BY id DESC LIMIT ?
`);

module.exports = {
    getActiveUniqueCodesForBaseAmount(baseAmount, cooldownMs = 24 * 60 * 60 * 1000) {
        const threshold = Date.now() - cooldownMs;
        const rows = stmtGetActiveUniqueCodes.all(baseAmount, threshold);
        return rows.map(r => r.unique_code).filter(c => c > 0);
    },

    getActiveUniqueCodes(baseAmount, cooldownMs) {
        return this.getActiveUniqueCodesForBaseAmount(baseAmount, cooldownMs);
    },

    getPendingOrdersForAmount(amount) {
        const now = Date.now();
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
        stmtUpdateOrderStatus.run({
            qrisId,
            status,
            transactionData: transactionData ? JSON.stringify(transactionData) : null
        });
    },

    updateOrderWebhookStatus(qrisId, webhookStatus) {
        stmtUpdateOrderWebhookStatus.run(webhookStatus, qrisId);
    },

    getClaimedTransaction(txId) {
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
        if (publicQrisId) {
            const orderRow = stmtGetOrderByTrxId.get(publicQrisId, publicQrisId);
            if (orderRow) publicQrisId = orderRow.qris_id;
        }
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
    },

    cleanExpiredClaims(maxAgeMs = 24 * 60 * 60 * 1000) {
        const threshold = Date.now() - maxAgeMs;
        stmtCleanExpiredClaims.run(threshold);
    },

    // Webhook Queue Database Helper Functions
    enqueueWebhook(data) {
        const now = Date.now();
        const info = stmtEnqueueWebhook.run({
            qrisId: data.qrisId,
            clientRefId: data.clientRefId || null,
            webhookUrl: data.webhookUrl,
            payload: typeof data.payload === 'object' ? JSON.stringify(data.payload) : data.payload,
            createdAt: now,
            nextAttemptAt: now
        });
        return info.lastInsertRowid;
    },

    getPendingWebhooks(limit = 10) {
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
        const row = db.prepare(`SELECT attempts FROM webhook_queue WHERE id = ?`).get(id);
        const attempts = row ? row.attempts + 1 : 1;
        stmtUpdateWebhookAttempt.run({
            id,
            attempts,
            status,
            lastError: lastError ? String(lastError) : null,
            nextAttemptAt
        });
    },

    getAllWebhooks(limit = 50) {
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
        db.exec("DELETE FROM qris_orders; DELETE FROM claimed_transactions; DELETE FROM webhook_queue;");
        return true;
    },

    getUnclaimedTransactions() {
        const rows = db.prepare(`SELECT * FROM claimed_transactions WHERE qris_id IS NULL OR qris_id = ''`).all();
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
        db.prepare(`UPDATE claimed_transactions SET qris_id = ? WHERE transaction_id = ?`).run(qrisId, transactionId);
    }
};
