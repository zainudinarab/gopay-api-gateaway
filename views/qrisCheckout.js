// Views - QRIS Checkout Page HTML Generator
function renderQrisCheckout(qris, req, qrImageUrl, expiresTimestamp, formattedAmount) {
    return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pembayaran QRIS - ${formattedAmount}</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
        body { background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; width: 100%; max-width: 380px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); text-align: center; }
        .badge-qris { display: inline-flex; align-items: center; gap: 6px; background: rgba(2, 132, 199, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 20px; padding: 6px 14px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
        .amount-title { font-size: 13px; color: #94a3b8; margin-bottom: 4px; }
        .amount-value { font-size: 26px; font-weight: 700; color: #38bdf8; margin-bottom: 20px; }
        .qr-wrapper { background: #ffffff; border-radius: 16px; padding: 16px; display: inline-block; margin-bottom: 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3); }
        .qr-wrapper img { width: 220px; height: 220px; display: block; border-radius: 8px; }
        .timer-box { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 12px; font-size: 13px; color: #cbd5e1; display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .timer-val { font-weight: 700; color: #f59e0b; font-family: monospace; font-size: 15px; }
        .status-badge { display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600; font-size: 14px; padding: 12px; border-radius: 12px; margin-bottom: 16px; }
        .status-pending { background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); }
        .status-paid { background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); }
        .status-expired { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
        .btn-check { width: 100%; background: #0284c7; color: #ffffff; border: none; font-weight: 600; font-size: 14px; padding: 12px; border-radius: 12px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-check:hover { background: #0369a1; }
        .btn-check:disabled { opacity: 0.5; cursor: not-allowed; }
        .toggle-box { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 12px; color: #94a3b8; margin-top: 14px; }
        .spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .success-box { display: none; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 16px; text-align: left; font-size: 13px; color: #cbd5e1; margin-top: 16px; }
        .success-box strong { color: #4ade80; display: block; font-size: 15px; margin-bottom: 6px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="badge-qris">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            GoPay / QRIS Dinamis
        </div>

        <div class="amount-title">Total Pembayaran</div>
        <div class="amount-value">${formattedAmount}</div>

        <div class="qr-wrapper" id="qr-container">
            <img src="${qrImageUrl}" alt="QRIS Code">
        </div>

        <div class="timer-box">
            <span>Batas Waktu Pembayaran</span>
            <span class="timer-val" id="timer-text">05:00</span>
        </div>

        <div class="status-badge status-pending" id="status-badge">
            <span id="status-icon">🟡</span>
            <span id="status-text">Menunggu Pembayaran</span>
        </div>

        <button class="btn-check" id="btn-check" onclick="checkStatusManual()">
            <span class="spinner" id="btn-spinner"></span>
            <span id="lbl-label">🔄 Cek Status Pembayaran</span>
        </button>

        <div class="toggle-box">
            <input type="checkbox" id="chk-auto" onchange="handleAutoPollChange(this)">
            <label for="chk-auto">Cek otomatis setiap 8 detik (Opsional)</label>
        </div>

        <div class="success-box" id="success-details">
            <strong>✅ Pembayaran Berhasil!</strong>
            <p>Order ID: <span id="tx-order"></span></p>
            <p>Sumber: <span id="tx-issuer"></span></p>
            <p>Waktu: <span id="tx-time"></span></p>
        </div>
    </div>

    <script>
        const qrisId = "${req.params.id}";
        const expiresTimestamp = ${expiresTimestamp};
        let isChecking = false;
        let isPaid = ${qris.status === 'PAID'};
        let isExpired = false;
        let pollTimer = null;

        function updateCountdown() {
            if (isPaid) return;
            const now = Date.now();
            const diff = expiresTimestamp - now;

            if (diff <= 0) {
                isExpired = true;
                document.getElementById('timer-text').innerText = "00:00:00";
                document.getElementById('status-badge').className = "status-badge status-expired";
                document.getElementById('status-icon').innerText = "🔴";
                document.getElementById('status-text').innerText = "QRIS Kedaluwarsa";
                document.getElementById('btn-check').disabled = true;
                document.getElementById('chk-auto').disabled = true;
                clearInterval(countdownInterval);
                stopAutoPoll();
                return;
            }

            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            
            if (hours > 0) {
                document.getElementById('timer-text').innerText = 
                    String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
            } else {
                document.getElementById('timer-text').innerText = 
                    String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
            }
        }

        const countdownInterval = setInterval(updateCountdown, 1000);
        updateCountdown();

        async function checkStatusManual() {
            if (isChecking || isPaid || isExpired) return;
            isChecking = true;

            const btn = document.getElementById('btn-check');
            const spinner = document.getElementById('btn-spinner');
            const label = document.getElementById('lbl-label');

            btn.disabled = true;
            spinner.style.display = 'inline-block';
            label.innerText = 'Memeriksa...';

            try {
                const res = await fetch('/api/qr-status/' + qrisId);
                const data = await res.json();

                if (data.success && data.paid) {
                    onPaymentSuccess(data.transaction);
                } else if (data.status === 'EXPIRED') {
                    isExpired = true;
                    updateCountdown();
                } else {
                    document.getElementById('status-text').innerText = "Belum Dibayar (Dicoba lagi...)";
                    setTimeout(() => {
                        if (!isPaid && !isExpired) {
                            document.getElementById('status-text').innerText = "Menunggu Pembayaran";
                        }
                    }, 2000);
                }
            } catch (err) {
                console.error("Gagal periksa status:", err);
            } finally {
                isChecking = false;
                if (!isPaid && !isExpired) {
                    btn.disabled = false;
                }
                spinner.style.display = 'none';
                label.innerText = '🔄 Cek Status Pembayaran';
            }
        }

        function onPaymentSuccess(tx) {
            isPaid = true;
            stopAutoPoll();
            clearInterval(countdownInterval);

            const qrContainer = document.getElementById('qr-container');
            if (qrContainer) qrContainer.style.display = 'none';
            const timerBox = document.querySelector('.timer-box');
            if (timerBox) timerBox.style.display = 'none';
            const toggleBox = document.querySelector('.toggle-box');
            if (toggleBox) toggleBox.style.display = 'none';

            document.getElementById('status-badge').className = "status-badge status-paid";
            document.getElementById('status-icon').innerText = "🟢";
            document.getElementById('status-text').innerText = "Pembayaran Berhasil / Lunas";

            const btn = document.getElementById('btn-check');
            if (btn) {
                btn.disabled = true;
                btn.style.display = 'none';
            }

            if (tx) {
                document.getElementById('tx-order').innerText = tx.order_id || tx.transaction_id || '-';
                document.getElementById('tx-issuer').innerText = tx.payer_issuer || 'GoPay / Bank';
                document.getElementById('tx-time').innerText = tx.transaction_time ? new Date(tx.transaction_time).toLocaleString('id-ID') : '-';
                document.getElementById('success-details').style.display = 'block';
            }
        }

        function startAutoPoll() {
            stopAutoPoll();
            pollTimer = setInterval(() => {
                if (!isChecking && !isPaid && !isExpired) {
                    checkStatusManual();
                }
            }, 8000);
        }

        function stopAutoPoll() {
            if (pollTimer) {
                clearInterval(pollTimer);
                pollTimer = null;
            }
        }

        function handleAutoPollChange(chk) {
            if (chk.checked) {
                startAutoPoll();
            } else {
                stopAutoPoll();
            }
        }

        if (isPaid) {
            onPaymentSuccess(${JSON.stringify(qris.transaction)});
        } else if (document.getElementById('chk-auto').checked) {
            startAutoPoll();
        }
    </script>
</body>
</html>`;
}

module.exports = {
    renderQrisCheckout
};
