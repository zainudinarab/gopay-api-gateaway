// Views - Root Home Landing Page HTML Generator
function renderHomePage() {
    return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GoPay Payment Gateway</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-body: #0b0f19;
            --bg-card: #111827;
            --bg-card-hover: #1f2937;
            --border-color: #374151;
            --text-main: #f9fafb;
            --text-muted: #9ca3af;
            --accent-cyan: #38bdf8;
            --accent-blue: #0284c7;
            --accent-green: #22c55e;
            --glow-cyan: rgba(56, 189, 248, 0.2);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }

        body {
            background-color: var(--bg-body);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background-image: 
                radial-gradient(circle at 50% 30%, rgba(2, 132, 199, 0.15) 0%, transparent 60%),
                radial-gradient(circle at 80% 80%, rgba(34, 197, 94, 0.08) 0%, transparent 50%);
        }

        .container {
            width: 100%;
            max-width: 820px;
            text-align: center;
            animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .logo-box {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 72px; height: 72px;
            background: linear-gradient(135deg, rgba(2, 132, 199, 0.25), rgba(56, 189, 248, 0.1));
            border: 1px solid rgba(56, 189, 248, 0.35);
            border-radius: 20px;
            color: var(--accent-cyan);
            box-shadow: 0 0 30px var(--glow-cyan);
            margin-bottom: 24px;
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(34, 197, 94, 0.12);
            color: var(--accent-green);
            border: 1px solid rgba(34, 197, 94, 0.3);
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 20px;
        }

        .pulse-dot {
            width: 8px; height: 8px;
            border-radius: 50%;
            background: var(--accent-green);
            box-shadow: 0 0 10px var(--accent-green);
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }

        h1 {
            font-size: 34px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: -0.5px;
            margin-bottom: 12px;
        }

        p.subtitle {
            font-size: 15.5px;
            color: var(--text-muted);
            max-width: 580px;
            margin: 0 auto 36px;
            line-height: 1.6;
        }

        /* Features Grid */
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
            gap: 18px;
            margin-bottom: 36px;
            text-align: left;
        }

        .feature-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 20px;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .feature-card:hover {
            background: var(--bg-card-hover);
            border-color: rgba(56, 189, 248, 0.35);
            transform: translateY(-2px);
        }

        .feature-icon {
            font-size: 24px;
            margin-bottom: 10px;
        }

        .feature-title {
            font-size: 15px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 6px;
        }

        .feature-desc {
            font-size: 12.5px;
            color: var(--text-muted);
            line-height: 1.5;
        }

        /* Action Buttons */
        .action-buttons {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            flex-wrap: wrap;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            font-weight: 700;
            font-size: 14px;
            padding: 14px 32px;
            border-radius: 14px;
            text-decoration: none;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            cursor: pointer;
        }

        .btn-primary {
            background: linear-gradient(135deg, var(--accent-blue), #0369a1);
            color: #ffffff;
            border: none;
            box-shadow: 0 4px 20px rgba(2, 132, 199, 0.4);
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(2, 132, 199, 0.6);
        }

        footer {
            margin-top: 40px;
            font-size: 12.5px;
            color: #64748b;
        }
    </style>
</head>
<body>

    <div class="container">
        <div class="logo-box">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>

        <div style="display: block;">
            <div class="status-badge">
                <span class="pulse-dot"></span>
                <span>System Status: Active & Operational</span>
            </div>
        </div>

        <h1>GoPay Payment Gateway</h1>
        <p class="subtitle">Layanan API Gateway Pembayaran QRIS Otomatis & Real-time Transaction Verification System.</p>

        <div class="features-grid">
            <div class="feature-card">
                <div class="feature-icon">⚡</div>
                <div class="feature-title">Penerbitan QRIS Dinamis</div>
                <div class="feature-desc">Pembuatan kode QRIS secara instan & presisi per transaksi pembayaran.</div>
            </div>

            <div class="feature-card">
                <div class="feature-icon">🔔</div>
                <div class="feature-title">Notifikasi Real-Time</div>
                <div class="feature-desc">Pengiriman notifikasi callback otomatis ke sistem pihak ketiga saat terbayar.</div>
            </div>

            <div class="feature-card">
                <div class="feature-icon">🛡️</div>
                <div class="feature-title">Verifikasi Pembayaran</div>
                <div class="feature-desc">Pemeriksaan dan pencocokan status transaksi secara cepat dan akurat.</div>
            </div>

            <div class="feature-card">
                <div class="feature-icon">💻</div>
                <div class="feature-title">Dashboard Manajemen</div>
                <div class="feature-desc">Antarmuka kontrol admin terpadu untuk pemantauan dan pengelolaan.</div>
            </div>
        </div>

        <div class="action-buttons">
            <a href="/login" class="btn btn-primary">
                🔑 Masuk ke Portal Admin
            </a>
        </div>

        <footer>
            GoPay Payment Gateway &copy; 2026. All rights reserved.
        </footer>
    </div>

</body>
</html>`;
}

module.exports = {
    renderHomePage
};
