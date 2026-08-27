// GoPay Partner API Gateway - Main Entry Point (MVC Modular Architecture)
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const apiRoutes = require('./routes/apiRoutes');
const webRoutes = require('./routes/webRoutes');

const { startWebhookWorker } = require('./workers/webhookWorker');
const { startReconcilerWorker } = require('./workers/reconcilerWorker');
const { startSessionWorker } = require('./workers/sessionWorker');
const { logActivity } = require('./services/loggerService');

const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());

// Root & Health Check Endpoints
app.get('/', (req, res) => {
    res.send('GoPay Partner API Gateway Berjalan (SQLite DB, 10s Cache & Webhook Queue Active)');
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'GoPay Partner API Gateway', database: 'SQLite (gateway.db)', timestamp: new Date() });
});

app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Layanan API GoPay Berfungsi Normal', timestamp: new Date() });
});

// Register API & Web Routers
app.use('/api', apiRoutes);
app.use('/', apiRoutes); // Support top-level endpoints (/create-qris, /check-payment, etc.)
app.use('/', webRoutes);

// Start Background Workers
startWebhookWorker(5000);
startReconcilerWorker(5000);
startSessionWorker();

app.listen(PORT, () => {
    logActivity('SYSTEM', `GoPay Partner Gateway berjalan pada port ${PORT} (Admin Password Protected, SQLite DB & Webhook Queue Active)`);
});
