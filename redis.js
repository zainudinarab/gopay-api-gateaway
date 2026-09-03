// Redis Client Module - Fast Caching & Key-Value Storage
require('dotenv').config();
const Redis = require('ioredis');

const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false';
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const REDIS_DB = parseInt(process.env.REDIS_DB || '0', 10);

let isConnected = false;
let redisClient = null;

if (REDIS_ENABLED) {
    try {
        redisClient = new Redis({
            host: REDIS_HOST,
            port: REDIS_PORT,
            password: REDIS_PASSWORD,
            db: REDIS_DB,
            retryStrategy(times) {
                if (times > 3) {
                    return null; // Stop retrying after 3 attempts to avoid log spam if Redis server is offline
                }
                return Math.min(times * 200, 2000);
            },
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
            lazyConnect: false
        });

        redisClient.on('connect', () => {
            isConnected = true;
            console.log(`[REDIS] Connected & Ready at ${REDIS_HOST}:${REDIS_PORT} (DB: ${REDIS_DB})!`);
        });

        redisClient.on('error', (err) => {
            if (isConnected) {
                console.warn(`[REDIS WARNING]: Connection error: ${err.message}`);
            }
            isConnected = false;
        });

        redisClient.on('end', () => {
            isConnected = false;
        });
    } catch (e) {
        console.warn(`[REDIS INIT ERROR]: ${e.message}`);
        isConnected = false;
    }
}

// Helper methods with silent fallback if Redis is offline
async function cacheGet(key) {
    if (!isConnected || !redisClient) return null;
    try {
        const data = await redisClient.get(key);
        if (!data) return null;
        try { return JSON.parse(data); } catch(e) { return data; }
    } catch (e) {
        return null;
    }
}

async function cacheSet(key, value, ttlSeconds = 300) {
    if (!isConnected || !redisClient) return false;
    try {
        const strVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
        if (ttlSeconds && ttlSeconds > 0) {
            await redisClient.set(key, strVal, 'EX', ttlSeconds);
        } else {
            await redisClient.set(key, strVal);
        }
        return true;
    } catch (e) {
        return false;
    }
}

async function cacheDel(key) {
    if (!isConnected || !redisClient) return false;
    try {
        await redisClient.del(key);
        return true;
    } catch (e) {
        return false;
    }
}

function isRedisConnected() {
    return isConnected && redisClient && redisClient.status === 'ready';
}

module.exports = {
    redisClient,
    cacheGet,
    cacheSet,
    cacheDel,
    isRedisConnected
};
