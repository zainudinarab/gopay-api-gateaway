// Component: Frontend Client Scripts
function renderScripts() {
    return `
    <script>
        let adminPass = localStorage.getItem('admin_pass') || sessionStorage.getItem('admin_pass') || 'admin123456';
        let autoLogsTimer = null;
        let isAutoLogsOn = true;
        let cachedLogsData = [];

        function updateLiveClock() {
            const el = document.getElementById('live-clock');
            if (el) {
                el.innerText = new Date().toLocaleTimeString('id-ID');
            }
        }
        setInterval(updateLiveClock, 1000);
        setTimeout(updateLiveClock, 100);

        function showAlert(type, text) {
            const errBox = document.getElementById('msg-error');
            const succBox = document.getElementById('msg-success');
            if (errBox) errBox.style.display = 'none';
            if (succBox) succBox.style.display = 'none';

            if (type === 'error') {
                if (errBox) { errBox.innerText = text; errBox.style.display = 'block'; }
                else { alert(text); }
            } else {
                if (succBox) { succBox.innerText = text; succBox.style.display = 'block'; }
            }
        }

        const pageMeta = {
            'dashboard': { title: '📊 Executive Gateway Overview', subtitle: 'Ringkasan analisis statistik transaksi, mutasi, dan performa merchant.' },
            'orders': { title: 'Order QRIS', subtitle: 'Kelola dan pantau seluruh transaksi QRIS yang diterbitkan.' },
            'auth': { title: 'Sesi GoBiz Merchant', subtitle: 'Konfigurasi dan verifikasi sesi login GoBiz Merchant.' },
            'webhooks': { title: 'Antrian Webhook', subtitle: 'Log antrian pengiriman notifikasi HTTP POST otomatis.' },
            'tx': { title: 'Mutasi Transaksi GoJek', subtitle: 'Daftar riwayat pembayaran yang terdeteksi dari GoJek API.' },
            'logs': { title: 'Live System Logs Monitor', subtitle: 'Pantau aktivitas background workers, API requests, dan error logs secara real-time.' },
            'docs': { title: 'Dokumentasi Integrasi API', subtitle: 'Panduan teknis penggunaan REST API Gateway.' }
        };

        function switchTabByName(tabName, evt) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            const btnTarget = evt ? (evt.currentTarget || evt.target) : document.querySelector('.tab-btn[data-tab="' + tabName + '"]');
            if (btnTarget) btnTarget.classList.add('active');
            
            const contentTarget = document.getElementById('tab-' + tabName);
            if (contentTarget) contentTarget.classList.add('active');

            if (pageMeta[tabName]) {
                const headerTitle = document.getElementById('header-page-title');
                const headerSub = document.getElementById('header-page-subtitle');
                if (headerTitle) headerTitle.innerText = pageMeta[tabName].title;
                if (headerSub) headerSub.innerText = pageMeta[tabName].subtitle;
            }

            if (tabName !== 'logs' && autoLogsTimer) {
                clearInterval(autoLogsTimer);
                autoLogsTimer = null;
            }

            const currentPath = window.location.pathname;
            if (currentPath.startsWith('/dashboard') || currentPath.startsWith('/sessions') || currentPath.startsWith('/sessi')) {
                const targetPath = (tabName === 'auth' || tabName === 'sessions') ? '/sessions' : '/dashboard';
                try {
                    window.history.replaceState(null, '', targetPath + '?tab=' + tabName);
                } catch(e) {}
            }

            if (tabName === 'dashboard') try { if (typeof loadDashboardOverviewStats === 'function') loadDashboardOverviewStats(); } catch(e){}
            if (tabName === 'orders') try { if (typeof loadOrdersTable === 'function') loadOrdersTable(); } catch(e){}
            if (tabName === 'auth' || tabName === 'sessions') try { if (typeof loadMerchantsList === 'function') loadMerchantsList(); } catch(e){}
            if (tabName === 'webhooks') try { if (typeof loadWebhooksTable === 'function') loadWebhooksTable(); } catch(e){}
            if (tabName === 'tx') loadTransactionsTable();
            if (tabName === 'logs') {
                loadLogsConsole();
                if (isAutoLogsOn && !autoLogsTimer) {
                    autoLogsTimer = setInterval(loadLogsConsole, 3000);
                }
            }
        }

        function refreshCurrentTab() {
            const activeTab = document.querySelector('.tab-btn.active');
            if (activeTab) {
                const tabName = activeTab.getAttribute('data-tab');
                switchTabByName(tabName);
            }
        }

        function lockPortalAdmin() {
            localStorage.removeItem('admin_pass');
            sessionStorage.removeItem('admin_pass');
            adminPass = '';
            window.location.href = '/login';
        }

        async function unlockAdmin(forcedTab = null, isLoginRoute = false) {
            const inpPass = document.getElementById('inp-admin-pass');
            const pass = (inpPass && inpPass.value.trim()) || adminPass || localStorage.getItem('admin_pass') || sessionStorage.getItem('admin_pass') || 'admin123456';
            if (!pass) {
                showAlert('error', 'Masukkan Password Admin terlebih dahulu.');
                return;
            }

            const btn = document.getElementById('btn-unlock');
            const spin = document.getElementById('spin-lock');
            const lbl = document.getElementById('lbl-lock');

            if (btn) btn.disabled = true;
            if (spin) spin.style.display = 'inline-block';
            if (lbl) lbl.innerText = 'Memverifikasi...';

            try {
                const res = await fetch('/api/login/admin-auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ admin_password: pass })
                });
                const data = await res.json();

                if (data.success) {
                    adminPass = pass;
                    localStorage.setItem('admin_pass', pass);
                    sessionStorage.setItem('admin_pass', pass);
                    
                    if (isLoginRoute) {
                        window.location.href = '/dashboard';
                        return;
                    }

                    const lockSection = document.getElementById('section-admin-lock');
                    const dashSection = document.getElementById('section-dashboard');
                    if (lockSection) lockSection.style.display = 'none';
                    if (dashSection) dashSection.classList.add('active');
                    
                    const urlParams = new URLSearchParams(window.location.search);
                    const pathName = window.location.pathname;
                    let tabToOpen = forcedTab || urlParams.get('tab');
                    if (!tabToOpen) {
                        tabToOpen = (pathName.startsWith('/sessions') || pathName.startsWith('/sessi')) ? 'auth' : 'orders';
                    }
                    switchTabByName(tabToOpen);
                } else {
                    localStorage.removeItem('admin_pass');
                    sessionStorage.removeItem('admin_pass');
                    adminPass = '';
                    if (!isLoginRoute && window.location.pathname !== '/login') {
                        window.location.href = '/login';
                    } else {
                        showAlert('error', data.message || 'Password Admin Salah');
                    }
                }
            } catch (err) {
                showAlert('error', 'Error: ' + err.message);
            } finally {
                if (btn) btn.disabled = false;
                if (spin) spin.style.display = 'none';
                if (lbl) lbl.innerText = '🔑 Masuk ke Portal Admin';
            }
        }

        // Initialize Route & Tabs Persistence
        (function initAdminRouting() {
            const pathName = window.location.pathname;
            const urlParams = new URLSearchParams(window.location.search);
            let tabFromUrl = urlParams.get('tab');

            if (!tabFromUrl && (pathName.startsWith('/sessions') || pathName.startsWith('/sessi'))) {
                tabFromUrl = 'auth';
            }

            if (pathName === '/login') {
                if (adminPass) {
                    const inp = document.getElementById('inp-admin-pass');
                    if (inp) inp.value = adminPass;
                    unlockAdmin(null, true);
                } else {
                    const secLock = document.getElementById('section-admin-lock');
                    const secDash = document.getElementById('section-dashboard');
                    if (secLock) secLock.style.display = 'flex';
                    if (secDash) secDash.classList.remove('active');
                }
            } else {
                if (!adminPass) adminPass = 'admin123456';
                const inp = document.getElementById('inp-admin-pass');
                if (inp) inp.value = adminPass;
                unlockAdmin(tabFromUrl || 'orders');
            }
        })();

        async function loadLogsConsole() {
            const container = document.getElementById('terminal-logs');
            if (!container) return;
            try {
                const res = await fetch('/api/logs?api_key=' + encodeURIComponent(adminPass));
                const data = await res.json();
                if (data.success && data.logs) {
                    cachedLogsData = data.logs;
                    filterLogsDisplay();
                }
            } catch (e) {
                container.innerText = '[ERROR] Gagal memuat logs: ' + e.message;
            }
        }

        function filterLogsDisplay() {
            const container = document.getElementById('terminal-logs');
            if (!container) return;
            const sel = document.getElementById('select-log-level');
            const selectedLevel = sel ? sel.value : 'ALL';
            let logsToRender = cachedLogsData;

            if (selectedLevel !== 'ALL') {
                logsToRender = cachedLogsData.filter(l => l.level === selectedLevel);
            }

            if (logsToRender.length === 0) {
                container.innerHTML = '<span style="color:#64748b;">(Belum ada log sesuai filter)</span>';
                return;
            }

            const formattedHtml = logsToRender.map(l => {
                let badgeColor = '#38bdf8';
                if (l.level === 'SYSTEM') badgeColor = '#4ade80';
                if (l.level === 'ERROR') badgeColor = '#f87171';
                if (l.level === 'INFO') badgeColor = '#38bdf8';

                const timeStr = new Date(l.timestamp).toLocaleTimeString('id-ID');
                return '<span style="color:#64748b;">[' + timeStr + ']</span> <span style="color:' + badgeColor + '; font-weight:700;">[' + l.level + ']</span> ' + escapeHtml(l.message);
            }).join('\\n');

            container.innerHTML = formattedHtml;
        }

        function toggleAutoLogs() {
            const btn = document.getElementById('btn-auto-logs');
            isAutoLogsOn = !isAutoLogsOn;
            if (isAutoLogsOn) {
                if (btn) {
                    btn.style.background = 'rgba(34,197,94,0.15)';
                    btn.style.borderColor = 'rgba(34,197,94,0.3)';
                    btn.style.color = 'var(--accent-green)';
                    btn.innerText = '⚡ Auto Refresh (ON)';
                }
                loadLogsConsole();
                if (!autoLogsTimer) autoLogsTimer = setInterval(loadLogsConsole, 3000);
            } else {
                if (btn) {
                    btn.style.background = 'rgba(100,116,139,0.15)';
                    btn.style.borderColor = 'rgba(100,116,139,0.3)';
                    btn.style.color = 'var(--text-muted)';
                    btn.innerText = '⏸️ Auto Refresh (OFF)';
                }
                if (autoLogsTimer) {
                    clearInterval(autoLogsTimer);
                    autoLogsTimer = null;
                }
            }
        }

        function clearLogsConsole() {
            const el = document.getElementById('terminal-logs');
            if (el) el.innerText = '(Tampilan log di-cleared)';
        }

        function escapeHtml(text) {
            return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        let allOrdersData = [];
        let ordersCurrentPage = 1;
        const ordersPageSize = 10;

        function renderOrdersPage() {
            const tbody = document.getElementById('tbody-orders');
            if (!tbody) return;

            if (!allOrdersData || allOrdersData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-slate-400 font-medium">Belum ada data order QRIS.</td></tr>';
                const elInfo = document.getElementById('orders-page-info');
                const elTot = document.getElementById('orders-total-count');
                if (elInfo) elInfo.innerText = '0 - 0';
                if (elTot) elTot.innerText = '0';
                return;
            }

            const totalCount = allOrdersData.length;
            const totalPages = Math.ceil(totalCount / ordersPageSize) || 1;
            if (ordersCurrentPage > totalPages) ordersCurrentPage = totalPages;
            if (ordersCurrentPage < 1) ordersCurrentPage = 1;

            const startIndex = (ordersCurrentPage - 1) * ordersPageSize;
            const endIndex = Math.min(startIndex + ordersPageSize, totalCount);
            const pageItems = allOrdersData.slice(startIndex, endIndex);

            tbody.innerHTML = pageItems.map(function(o) {
                var statusTag = o.status === 'PAID' ? '<span class="tag tag-paid">🟢 PAID</span>' : (o.status === 'EXPIRED' ? '<span class="tag tag-expired">🔴 EXPIRED</span>' : '<span class="tag tag-pending">🟡 PENDING</span>');
                var whTag = o.webhookStatus === 'SUCCESS' ? '<span class="tag tag-success">🟢 SUCCESS</span>' : (o.webhookStatus === 'FAILED' ? '<span class="tag tag-failed">🔴 FAILED</span>' : (o.webhookStatus === 'QUEUED' || o.webhookStatus === 'PENDING' ? '<span class="tag tag-pending">🟡 QUEUED</span>' : '<span class="text-slate-500">-</span>'));
                var fmtAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(o.amount);
                var fmtDate = new Date(o.createdAt).toLocaleString('id-ID');
                var claimBtn = (o.status !== 'PAID') 
                    ? '<button onclick="manualClaimOrder(&quot;' + o.qrisId + '&quot;)" class="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-colors">✅ Validasi Manual</button>' 
                    : '';
                return '<tr class="hover:bg-slate-800/40 transition-colors border-b border-slate-800/60">' +
                    '<td class="px-4 py-3.5"><strong class="font-mono text-sky-400 font-bold">' + o.qrisId + '</strong></td>' +
                    '<td class="px-4 py-3.5"><span class="tag tag-success">' + (o.appId || 'default') + '</span></td>' +
                    '<td class="px-4 py-3.5 text-slate-300 font-medium">' + (o.clientRefId || '-') + '</td>' +
                    '<td class="px-4 py-3.5"><span class="font-mono font-bold text-white">' + fmtAmount + '</span> <span class="text-[11px] text-slate-400 font-normal">(Unik: +' + o.uniqueCode + ')</span></td>' +
                    '<td class="px-4 py-3.5">' + statusTag + '</td>' +
                    '<td class="px-4 py-3.5">' + whTag + '</td>' +
                    '<td class="px-4 py-3.5 text-xs text-slate-400 font-mono">' + fmtDate + '</td>' +
                    '<td class="px-4 py-3.5 text-right flex items-center justify-end gap-2">' +
                        '<a href="/qr/' + o.qrisId + '" target="_blank" class="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 text-xs font-semibold inline-flex items-center gap-1 transition-colors">🔗 Lihat QR</a>' +
                        claimBtn +
                    '</td>' +
                '</tr>';
            }).join('');

            // Update Pagination Info
            const elInfo = document.getElementById('orders-page-info');
            const elTot = document.getElementById('orders-total-count');
            const elNum = document.getElementById('orders-page-num');
            const btnPrev = document.getElementById('btn-orders-prev');
            const btnNext = document.getElementById('btn-orders-next');

            if (elInfo) elInfo.innerText = (startIndex + 1) + ' - ' + endIndex;
            if (elTot) elTot.innerText = totalCount;
            if (elNum) elNum.innerText = 'Halaman ' + ordersCurrentPage + ' dari ' + totalPages;
            if (btnPrev) btnPrev.disabled = (ordersCurrentPage <= 1);
            if (btnNext) btnNext.disabled = (ordersCurrentPage >= totalPages);
        }

        function prevOrdersPage() {
            if (ordersCurrentPage > 1) {
                ordersCurrentPage--;
                renderOrdersPage();
            }
        }

        function nextOrdersPage() {
            const totalPages = Math.ceil(allOrdersData.length / ordersPageSize);
            if (ordersCurrentPage < totalPages) {
                ordersCurrentPage++;
                renderOrdersPage();
            }
        }

        async function loadOrdersTable() {
            const tbody = document.getElementById('tbody-orders');
            if (!tbody) return;
            try {
                const pass = adminPass || localStorage.getItem('admin_pass') || sessionStorage.getItem('admin_pass') || 'admin123456';
                const res = await fetch('/api/orders?limit=200&api_key=' + encodeURIComponent(pass));
                const data = await res.json();
                if (data.success && data.data) {
                    allOrdersData = data.data;
                    ordersCurrentPage = 1;
                    renderOrdersPage();
                }
            } catch (e) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-rose-400">Gagal memuat order: ' + e.message + '</td></tr>';
            }
        }

        async function manualClaimOrder(qrisId, txId = null) {
            let confirmMsg = 'Konfirmasi validasi LUNAS manual untuk QRIS ID ' + qrisId + '? Notifikasi webhook akan dikirimkan otomatis.';
            if (txId) {
                confirmMsg = 'Jodohkan transaksi ID ' + txId + ' dengan QRIS ID ' + qrisId + ' secara manual?';
            } else {
                const inputTx = prompt('Validasi Manual untuk QRIS ID: ' + qrisId + '\\nMasukkan Transaction ID GoJek (Opsional / Boleh Kosong):');
                if (inputTx === null) return;
                if (inputTx.trim()) txId = inputTx.trim();
            }

            if (!confirm(confirmMsg)) return;

            try {
                const res = await fetch('/api/orders/manual-claim', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': adminPass
                    },
                    body: JSON.stringify({
                        qris_id: qrisId,
                        transaction_id: txId,
                        notes: 'Validasi Manual via Admin Portal'
                    })
                });
                const data = await res.json();
                if (data.success) {
                    alert(data.message);
                    loadOrdersTable();
                    loadTransactionsTable();
                    loadWebhooksTable();
                } else {
                    alert('Gagal: ' + (data.message || 'Gagal klaim manual'));
                }
            } catch (e) {
                alert('Error: ' + e.message);
            }
        }

        let allTxData = [];
        let txCurrentPage = 1;
        const txPageSize = 10;

        function renderTxPage() {
            const tbody = document.getElementById('tbody-transactions');
            if (!tbody) return;

            if (!allTxData || allTxData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-slate-400 font-medium">Belum ada riwayat mutasi transaksi GoJek.</td></tr>';
                const elInfo = document.getElementById('tx-page-info');
                const elTot = document.getElementById('tx-total-count');
                if (elInfo) elInfo.innerText = '0 - 0';
                if (elTot) elTot.innerText = '0';
                return;
            }

            const totalCount = allTxData.length;
            const totalPages = Math.ceil(totalCount / txPageSize) || 1;
            if (txCurrentPage > totalPages) txCurrentPage = totalPages;
            if (txCurrentPage < 1) txCurrentPage = 1;

            const startIndex = (txCurrentPage - 1) * txPageSize;
            const endIndex = Math.min(startIndex + txPageSize, totalCount);
            const pageItems = allTxData.slice(startIndex, endIndex);

            tbody.innerHTML = pageItems.map(function(t) {
                var txId = t.transaction_id || t.transactionId || '-';
                var qId = t.qris_id || t.qrisId || null;
                var mId = t.merchant_id || t.merchantId || '-';
                var amt = Number(t.amount || 0);
                var payer = t.payer_issuer || t.payerIssuer || t.payment_type || 'GoPay / QRIS';
                var txTime = t.transaction_time || t.transactionTime || t.time || '-';
                
                var claimedTime = '-';
                if (t.claimed_at) {
                    try {
                        var rawAt = Number(t.claimed_at);
                        claimedTime = isNaN(rawAt) ? String(t.claimed_at) : new Date(rawAt > 1e11 ? rawAt : rawAt * 1000).toLocaleString('id-ID');
                    } catch(e) {
                        claimedTime = String(t.claimed_at);
                    }
                }

                var fmtAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amt);
                var qrisLink = (qId && qId !== '-') 
                    ? '<strong class="font-mono text-emerald-400 font-bold">' + qId + '</strong>' 
                    : '<span class="text-slate-500">-</span>';

                return '<tr class="hover:bg-slate-800/40 transition-colors border-b border-slate-800/60">' +
                    '<td class="px-4 py-3.5"><strong class="font-mono text-sky-400 font-bold text-xs">' + txId + '</strong></td>' +
                    '<td class="px-4 py-3.5">' + qrisLink + '</td>' +
                    '<td class="px-4 py-3.5"><code class="font-mono text-amber-400 font-bold text-xs">' + mId + '</code></td>' +
                    '<td class="px-4 py-3.5"><span class="font-mono font-bold text-white">' + fmtAmount + '</span></td>' +
                    '<td class="px-4 py-3.5"><span class="tag tag-success font-semibold">' + payer + '</span></td>' +
                    '<td class="px-4 py-3.5 text-xs text-slate-400 font-mono">' + txTime + '</td>' +
                    '<td class="px-4 py-3.5 text-right text-xs text-slate-400 font-mono">' + claimedTime + '</td>' +
                '</tr>';
            }).join('');

            // Update Pagination Info
            const elInfo = document.getElementById('tx-page-info');
            const elTot = document.getElementById('tx-total-count');
            const elNum = document.getElementById('tx-page-num');
            const btnPrev = document.getElementById('btn-tx-prev');
            const btnNext = document.getElementById('btn-tx-next');

            if (elInfo) elInfo.innerText = (startIndex + 1) + ' - ' + endIndex;
            if (elTot) elTot.innerText = totalCount;
            if (elNum) elNum.innerText = 'Halaman ' + txCurrentPage + ' dari ' + totalPages;
            if (btnPrev) btnPrev.disabled = (txCurrentPage <= 1);
            if (btnNext) btnNext.disabled = (txCurrentPage >= totalPages);
        }

        function prevTxPage() {
            if (txCurrentPage > 1) {
                txCurrentPage--;
                renderTxPage();
            }
        }

        function nextTxPage() {
            const totalPages = Math.ceil(allTxData.length / txPageSize);
            if (txCurrentPage < totalPages) {
                txCurrentPage++;
                renderTxPage();
            }
        }

        async function loadTransactionsTable() {
            const tbody = document.getElementById('tbody-transactions');
            if (!tbody) return;
            console.log('[DEBUG TX] loadTransactionsTable started');
            try {
                const pass = adminPass || localStorage.getItem('admin_pass') || sessionStorage.getItem('admin_pass') || 'admin123456';
                console.log('[DEBUG TX] Fetching /transactions with pass length:', pass.length);
                const res = await fetch('/transactions?pageSize=200&app_id=admin&api_key=' + encodeURIComponent(pass), {
                    headers: {
                        'x-admin-password': pass,
                        'x-api-key': pass,
                        'x-app-id': 'admin'
                    }
                });
                const data = await res.json();
                console.log('[DEBUG TX] /transactions data received:', data);
                const txList = (data && data.transactions) || (data && data.data && data.data.transactions) || (Array.isArray(data) ? data : []);
                console.log('[DEBUG TX] Extracted txList count:', txList ? txList.length : 0);
                if (txList) {
                    allTxData = txList;
                    txCurrentPage = 1;
                    renderTxPage();
                }
            } catch (e) {
                console.error('[DEBUG TX] Error loading transactions:', e);
                tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-rose-400 font-bold">Gagal memuat mutasi: ' + e.message + '</td></tr>';
            }
        }

        function promptLinkToQris(txId) {
            currentJodohkanTxId = txId;
            const info = document.getElementById('modal-tx-info');
            const inp = document.getElementById('modal-inp-qris');
            const modal = document.getElementById('modal-jodohkan');
            if (info) info.innerText = 'Transaction ID GoJek: ' + txId;
            if (inp) inp.value = '';
            if (modal) modal.style.display = 'flex';
        }

        function closeJodohkanModal() {
            const modal = document.getElementById('modal-jodohkan');
            if (modal) modal.style.display = 'none';
        }

        async function submitJodohkanModal() {
            const targetQris = document.getElementById('modal-inp-qris').value.trim();
            if (!targetQris) {
                alert('Silakan masukkan QRIS ID terlebih dahulu.');
                return;
            }
            closeJodohkanModal();
            await manualClaimOrder(targetQris, currentJodohkanTxId);
        }

        async function clearAllOrders() {
            if (!confirm('Apakah Anda yakin ingin menghapus SELURUH data order QRIS dari database?')) return;
            try {
                const res = await fetch('/api/orders/clear', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': adminPass
                    }
                });
                const data = await res.json();
                alert(data.message);
                loadOrdersTable();
            } catch (e) {
                alert('Error: ' + e.message);
            }
        }

        let _selectedOtpMerchantId = null;

        async function triggerOtpForMerchant(merchantId, phone) {
            _selectedOtpMerchantId = merchantId;
            const modal = document.getElementById('modal-login-otp');
            const info = document.getElementById('modal-otp-merchant-info');
            const phoneInp = document.getElementById('modal-inp-phone');
            const step1 = document.getElementById('modal-otp-step-1');
            const step2 = document.getElementById('modal-otp-step-2');
            const sentPhone = document.getElementById('modal-otp-sent-phone');

            const s = (window._merchantSettingsCache || {})[merchantId] || {};
            const mName = s.merchant_name || s.merchantName || 'Merchant GoPay';
            const mPhone = phone || s.phone_number || s.phoneNumber || '';

            if (info) info.innerText = '🏪 ' + mName + ' (ID: ' + merchantId + ')';
            if (phoneInp) phoneInp.value = mPhone;
            
            // Check Redis active OTP state
            try {
                const targetKey = merchantId || mPhone;
                const res = await fetch('/api/login/otp-status/' + encodeURIComponent(targetKey), {
                    headers: { 'x-admin-password': adminPass }
                }).then(r => r.json()).catch(() => ({ active: false }));

                if (res.success && res.active && res.remaining_seconds > 0) {
                    if (sentPhone) sentPhone.innerText = res.phone || mPhone;
                    if (step1) step1.style.display = 'none';
                    if (step2) step2.style.display = 'block';
                    if (modal) modal.style.display = 'flex';
                    const codeInp = document.getElementById('modal-inp-otp-code');
                    if (codeInp) codeInp.focus();
                    startModalResendTimer(res.remaining_seconds);
                    showAlert('info', 'ℹ️ Membuka sesi OTP aktif untuk ' + (res.phone || mPhone) + '. Silakan masukkan kode OTP.');
                    return;
                }
            } catch (e) {}

            if (step1) step1.style.display = 'block';
            if (step2) step2.style.display = 'none';
            if (modal) modal.style.display = 'flex';
        }

        function closeLoginOtpModal() {
            const modal = document.getElementById('modal-login-otp');
            if (modal) modal.style.display = 'none';
            _selectedOtpMerchantId = null;
        }

        async function submitModalRequestOtp() {
            const phoneInp = document.getElementById('modal-inp-phone');
            const phone = phoneInp ? phoneInp.value.trim() : '';
            const mId = _selectedOtpMerchantId;

            if (!phone) {
                showAlert('error', 'Masukkan nomor HP GoBiz terlebih dahulu.');
                return;
            }

            const btn = document.getElementById('btn-modal-send-otp');
            if (btn) { btn.disabled = true; btn.innerText = '⏳ Mengirim Kode OTP...'; }

            try {
                const res = await fetch('/api/login/request-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPass },
                    body: JSON.stringify({ phone: phone, merchant_id: mId, admin_password: adminPass })
                });
                const data = await res.json();

                if (data.success) {
                    showAlert('success', data.message);
                    const step1 = document.getElementById('modal-otp-step-1');
                    const step2 = document.getElementById('modal-otp-step-2');
                    const sentPhone = document.getElementById('modal-otp-sent-phone');
                    if (sentPhone) sentPhone.innerText = phone;
                    if (step1) step1.style.display = 'none';
                    if (step2) step2.style.display = 'block';
                    const codeInp = document.getElementById('modal-inp-otp-code');
                    if (codeInp) { codeInp.value = ''; codeInp.focus(); }
                    startModalResendTimer(data.remaining_seconds || 120);
                } else {
                    showAlert('error', data.message || 'Gagal meminta OTP');
                }
            } catch (err) {
                showAlert('error', 'Error: ' + err.message);
            } finally {
                if (btn) { btn.disabled = false; btn.innerText = '📲 Kirim Kode OTP (SMS / WA)'; }
            }
        }

        let _modalResendInterval = null;
        let _modalResendSecs = 120;

        function startModalResendTimer(initialSeconds = 120) {
            clearInterval(_modalResendInterval);
            _modalResendSecs = Math.max(1, parseInt(initialSeconds) || 120);
            const btn = document.getElementById('btn-modal-resend-otp');
            if (!btn) return;

            btn.disabled = true;
            btn.style.cursor = 'not-allowed';
            btn.style.color = '#64748b';

            const update = () => {
                const m = String(Math.floor(_modalResendSecs / 60)).padStart(2, '0');
                const s = String(_modalResendSecs % 60).padStart(2, '0');
                btn.innerHTML = '🔄 Kirim Ulang OTP (' + m + ':' + s + ')';
            };
            update();

            _modalResendInterval = setInterval(() => {
                _modalResendSecs--;
                if (_modalResendSecs <= 0) {
                    clearInterval(_modalResendInterval);
                    btn.disabled = false;
                    btn.style.cursor = 'pointer';
                    btn.style.color = '#38bdf8';
                    btn.innerHTML = '🔄 Kirim Ulang OTP';
                } else {
                    update();
                }
            }, 1000);
        }

        async function resendModalOtp() {
            const btn = document.getElementById('btn-modal-resend-otp');
            if (btn && btn.disabled) return;
            await submitModalRequestOtp();
        }

        async function submitModalVerifyOtp() {
            const codeInp = document.getElementById('modal-inp-otp-code');
            const otp = codeInp ? codeInp.value.trim() : '';
            if (!otp) {
                showAlert('error', 'Masukkan 4-6 digit kode OTP.');
                return;
            }

            const btn = document.getElementById('btn-modal-verify-otp');
            if (btn) { btn.disabled = true; btn.innerText = '⏳ Memverifikasi Sesi GoBiz...'; }

            try {
                const res = await fetch('/api/login/verify-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPass },
                    body: JSON.stringify({ otp_code: otp, merchant_id: _selectedOtpMerchantId, admin_password: adminPass })
                });
                const data = await res.json();

                if (data.success) {
                    closeLoginOtpModal();
                    showAlert('success', '🟢 Login GoBiz Berhasil! Sesi Merchant kini aktif.');
                    loadMerchantsList();
                } else {
                    showAlert('error', data.message || 'Kode OTP Salah atau Kedaluwarsa');
                }
            } catch (err) {
                showAlert('error', 'Error: ' + err.message);
            } finally {
                if (btn) { btn.disabled = false; btn.innerText = '🔓 Verifikasi & Aktifkan Sesi GoBiz'; }
            }
        }

        let _targetLogoutMerchantId = null;

        function handleMerchantLogoutClick(btn) {
            const mId = btn.getAttribute('data-id');
            if (!mId) return;
            _targetLogoutMerchantId = mId;

            const titleEl = document.getElementById('del-modal-title');
            const bodyEl = document.getElementById('del-modal-body');
            const btnExec = document.getElementById('btn-do-delete-merchant');
            const modal = document.getElementById('modal-confirm-delete');

            if (titleEl) titleEl.innerText = 'Konfirmasi Logout Sesi GoBiz';
            if (bodyEl) bodyEl.innerHTML = 'Apakah Anda yakin ingin memutuskan & menghapus sesi GoBiz untuk merchant <strong style="color:#fff;">"' + mId + '"</strong>?';
            if (btnExec) {
                btnExec.innerText = '🔌 Ya, Logout Sesi';
                btnExec.onclick = executeMerchantLogout;
            }

            if (modal) modal.style.display = 'flex';
        }

        async function executeMerchantLogout() {
            if (!_targetLogoutMerchantId) return;
            const mId = _targetLogoutMerchantId;
            closeConfirmDeleteModal();

            try {
                const res = await fetch('/api/login/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPass },
                    body: JSON.stringify({ merchant_id: mId, admin_password: adminPass })
                });
                const data = await res.json();
                if (data.success) {
                    showAlert('success', data.message);
                    loadMerchantsList();
                } else {
                    showAlert('error', data.message || 'Gagal menghapus sesi');
                }
            } catch (e) {
                showAlert('error', 'Error: ' + e.message);
            }
        }

        async function loadMerchantsList() {
            const container = document.getElementById('multi-merchant-container');
            if (!container) return;
            try {
                const resSet = await fetch('/api/settings/merchant-list', { headers: { 'x-admin-password': adminPass } }).then(r => r.json()).catch(() => ({ settings: [] }));

                const settings = resSet.settings || [];
                window._merchantSettingsCache = {};

                if (settings.length === 0) {
                    container.innerHTML = '<div style="color:var(--text-muted); font-size:13px;">Belum ada merchant tersimpan. Silakan klik tombol "➕ Tambah Merchant" di atas.</div>';
                    return;
                }

                settings.forEach(function(s) { window._merchantSettingsCache[s.merchant_id] = s; });

                let html = '<div class="table-responsive"><table class="data-table">' +
                    '<thead><tr>' +
                        '<th class="px-4 py-3.5 text-left">Merchant / Toko</th>' +
                        '<th class="px-4 py-3.5 text-left">Merchant ID</th>' +
                        '<th class="px-4 py-3.5 text-left">No. HP GoBiz</th>' +
                        '<th class="px-4 py-3.5 text-left">Provider</th>' +
                        '<th class="px-4 py-3.5 text-left">Kota</th>' +
                        '<th class="px-4 py-3.5 text-left">Status Sesi</th>' +
                        '<th class="px-4 py-3.5 text-right">Aksi</th>' +
                    '</tr></thead><tbody class="divide-y divide-slate-800/60">' +
                    settings.map(function(s) {
                        var typeTag = '<span class="tag tag-success uppercase">🟢 ' + (s.merchant_type || 'GOPAY') + '</span>';
                        var safeId = (s.merchant_id || '').replace(/"/g, '&quot;');
                        var safePhone = (s.phone_number || s.phoneNumber || '').replace(/"/g, '&quot;');

                        var isUtama = Boolean(s.isActive);
                        var activeBadge = isUtama 
                            ? '<span class="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black flex items-center gap-1">⭐ Merchant Utama</span>'
                            : '<button class="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-400 text-xs font-semibold transition-colors" data-id="' + safeId + '" onclick="handleMerchantSetActiveClick(this)">⭐ Set Utama</button>';

                        var sessionBadge = s.hasSession
                            ? '<span class="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5 w-max">🟢 Sesi Aktif</span>'
                            : '<span class="px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-1.5 w-max">🔴 Belum Login</span>';

                        var logoutBtn = s.hasSession
                            ? '<button class="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 text-xs font-semibold transition-colors" data-id="' + safeId + '" onclick="handleMerchantLogoutClick(this)" title="Putuskan Sesi GoBiz">🔌 Logout Sesi</button>'
                            : '';

                        var nameDisplay = isUtama
                            ? '<div class="flex items-center gap-2"><strong class="font-extrabold text-white text-sm">🏪 ' + (s.merchant_name || '-') + '</strong><span class="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider">⭐ UTAMA</span></div>'
                            : '<strong class="font-bold text-slate-200">🏪 ' + (s.merchant_name || '-') + '</strong>';

                        return '<tr class="hover:bg-slate-800/40 transition-colors border-b border-slate-800/60 ' + (isUtama ? 'bg-sky-950/20' : '') + '">' +
                            '<td class="px-4 py-3.5">' + nameDisplay + '</td>' +
                            '<td class="px-4 py-3.5"><code class="font-mono text-sky-400 font-bold text-xs">' + (s.merchant_id || '-') + '</code></td>' +
                            '<td class="px-4 py-3.5"><code class="font-mono text-amber-400 font-bold text-xs">' + (s.phone_number || s.phoneNumber || '-') + '</code></td>' +
                            '<td class="px-4 py-3.5">' + typeTag + '</td>' +
                            '<td class="px-4 py-3.5 text-slate-300">📍 ' + (s.city || '-') + '</td>' +
                            '<td class="px-4 py-3.5">' + sessionBadge + '</td>' +
                            '<td class="px-4 py-3.5 text-right flex items-center justify-end gap-1.5">' +
                                '<button class="px-2.5 py-1 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1" data-id="' + safeId + '" data-phone="' + safePhone + '" onclick="handleMerchantOtpClick(this)">🔑 Login OTP</button>' +
                                logoutBtn +
                                activeBadge +
                                '<button class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition-colors" data-id="' + safeId + '" onclick="handleMerchantEditClick(this)">✏️ Edit</button>' +
                                '<button class="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs transition-colors" data-id="' + safeId + '" onclick="handleMerchantDeleteClick(this)">🗑️</button>' +
                            '</td>' +
                        '</tr>';
                    }).join('') +
                    '</tbody></table></div>';

                container.innerHTML = html;

                await populateMerchantOrderDropdown(settings);
                await loadAppCredentialsSetting();
                await loadApiClientsList();
            } catch (e) {
                container.innerHTML = '<div style="color:var(--accent-red); font-size:13px;">Gagal memuat merchant: ' + e.message + '</div>';
            }
        }

        async function loadApiClientsList() {
            const container = document.getElementById('api-clients-container');
            if (!container) return;

            try {
                const res = await fetch('/api/clients', { headers: { 'x-admin-password': adminPass } }).then(r => r.json());
                const clients = res.clients || [];

                if (clients.length === 0) {
                    container.innerHTML = '<div style="text-align:center; padding:24px; color:var(--text-muted);">Belum ada akun client API terdaftar. Klik "➕ Tambah Client API Baru" untuk mendaftarkan pasangan App-ID & App-Secret.</div>';
                    return;
                }

                let html = '<div class="overflow-x-auto"><table class="w-full text-left border-collapse">' +
                    '<thead><tr class="border-b border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-950/40">' +
                        '<th class="px-4 py-3">Nama Aplikasi / Deskripsi</th>' +
                        '<th class="px-4 py-3">App-ID (Username API)</th>' +
                        '<th class="px-4 py-3">App-Secret (Password API)</th>' +
                        '<th class="px-4 py-3">Status Otorisasi</th>' +
                        '<th class="px-4 py-3 text-right">Aksi</th>' +
                    '</tr></thead><tbody class="divide-y divide-slate-800/60">';

                clients.forEach(function(c) {
                    const safeId = (c.app_id || c.appId || '').replace(/"/g, '&quot;');
                    const safeSecret = (c.app_secret || c.appSecret || '').replace(/"/g, '&quot;');
                    const safeName = (c.client_name || c.clientName || safeId).replace(/"/g, '&quot;');
                    const isAct = Boolean(c.is_active || c.isActive);

                    const statusBadge = isAct
                        ? '<span class="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">🟢 Aktif</span>'
                        : '<span class="px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold">🔴 Non-Aktif</span>';

                    html += '<tr class="hover:bg-slate-800/40 transition-colors border-b border-slate-800/60">' +
                        '<td class="px-4 py-3.5"><strong class="font-bold text-white">📱 ' + (c.client_name || c.app_id) + '</strong></td>' +
                        '<td class="px-4 py-3.5"><code class="font-mono text-sky-400 font-bold text-xs bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">' + (c.app_id) + '</code></td>' +
                        '<td class="px-4 py-3.5"><code class="font-mono text-amber-300 font-bold text-xs bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">' + (c.app_secret) + '</code></td>' +
                        '<td class="px-4 py-3.5">' + statusBadge + '</td>' +
                        '<td class="px-4 py-3.5 text-right flex items-center justify-end gap-1.5">' +
                            '<button class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition-colors" data-id="' + safeId + '" data-secret="' + safeSecret + '" data-name="' + safeName + '" data-active="' + isAct + '" onclick="handleApiClientEditClick(this)">✏️ Edit</button>' +
                            '<button class="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs transition-colors" data-id="' + safeId + '" onclick="handleApiClientDeleteClick(this)">🗑️</button>' +
                        '</td>' +
                    '</tr>';
                });

                html += '</tbody></table></div>';
                container.innerHTML = html;
            } catch (e) {
                container.innerHTML = '<div style="color:var(--accent-red); font-size:13px;">Gagal memuat akun client API: ' + e.message + '</div>';
            }
        }

        let _editingApiClientId = null;

        function openAddApiClientModal(appId = null, appSecret = null, clientName = null, isActive = true) {
            const modal = document.getElementById('modal-add-api-client');
            if (!modal) return;
            modal.style.display = 'flex';

            _editingApiClientId = appId || null;

            const titleEl = document.getElementById('modal-client-title');
            const idInp = document.getElementById('modal-client-app-id');
            const secretInp = document.getElementById('modal-client-app-secret');
            const nameInp = document.getElementById('modal-client-name');
            const statusSel = document.getElementById('modal-client-status');

            if (titleEl) {
                titleEl.innerText = appId ? ('✏️ Edit Akun API Client (' + appId + ')') : '✨ Register Akun API Client Baru';
            }

            if (idInp) { 
                idInp.value = appId || ''; 
                idInp.disabled = Boolean(appId); 
            }
            if (secretInp) secretInp.value = appSecret || '';
            if (nameInp) nameInp.value = clientName || '';
            if (statusSel) statusSel.value = isActive ? 'true' : 'false';
        }

        function closeAddApiClientModal() {
            const modal = document.getElementById('modal-add-api-client');
            if (modal) modal.style.display = 'none';
            _editingApiClientId = null;
        }

        async function submitModalSaveApiClient() {
            const idInp = document.getElementById('modal-client-app-id');
            const secretInp = document.getElementById('modal-client-app-secret');
            const nameInp = document.getElementById('modal-client-name');
            const statusSel = document.getElementById('modal-client-status');

            const appId = _editingApiClientId || idInp?.value?.trim();
            const appSecret = secretInp?.value?.trim();
            const clientName = nameInp?.value?.trim() || appId;
            const isActive = statusSel?.value === 'true';

            if (!appId) {
                showAlert('error', '⚠️ App-ID (Username API) wajib diisi.');
                return;
            }
            if (!appSecret) {
                showAlert('error', '⚠️ App-Secret (Password API) wajib diisi.');
                return;
            }

            try {
                const res = await fetch('/api/clients', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPass },
                    body: JSON.stringify({ app_id: appId, app_secret: appSecret, client_name: clientName, is_active: isActive })
                }).then(r => r.json());

                if (res.success) {
                    closeAddApiClientModal();
                    showAlert('success', '✨ Akun API Client "' + appId + '" berhasil disimpan!');
                    await loadApiClientsList();
                } else {
                    showAlert('error', res.message || 'Gagal menyimpan akun API Client');
                }
            } catch (e) {
                showAlert('error', 'Error: ' + e.message);
            }
        }

        function handleApiClientEditClick(btn) {
            const id = btn.getAttribute('data-id');
            const secret = btn.getAttribute('data-secret');
            const name = btn.getAttribute('data-name');
            const active = btn.getAttribute('data-active') === 'true';
            openAddApiClientModal(id, secret, name, active);
        }

        let _targetDeleteApiClientId = null;

        function handleApiClientDeleteClick(btn) {
            const id = btn.getAttribute('data-id');
            if (!id) return;
            _targetDeleteApiClientId = id;

            const titleEl = document.getElementById('del-modal-title');
            const bodyEl = document.getElementById('del-modal-body');
            const btnExec = document.getElementById('btn-do-delete-merchant');
            const modal = document.getElementById('modal-confirm-delete');

            if (titleEl) titleEl.innerText = 'Konfirmasi Hapus Akun API Client';
            if (bodyEl) bodyEl.innerHTML = 'Apakah Anda yakin ingin menghapus pasangan API Client ID <strong style="color:#fff;">"' + id + '"</strong> secara permanen dari database?';
            if (btnExec) {
                btnExec.innerText = '🗑️ Ya, Hapus API Client';
                btnExec.onclick = executeDeleteApiClient;
            }

            if (modal) modal.style.display = 'flex';
        }

        async function executeDeleteApiClient() {
            if (!_targetDeleteApiClientId) return;
            const id = _targetDeleteApiClientId;
            closeConfirmDeleteModal();

            try {
                const res = await fetch('/api/clients/' + encodeURIComponent(id), {
                    method: 'DELETE',
                    headers: { 'x-admin-password': adminPass }
                }).then(r => r.json());

                if (res.success) {
                    showAlert('success', '🗑️ Akun API Client "' + id + '" berhasil dihapus.');
                    await loadApiClientsList();
                } else {
                    showAlert('error', res.message || 'Gagal menghapus akun API Client');
                }
            } catch (e) {
                showAlert('error', 'Error: ' + e.message);
            }
        }

        function generateAutoAppId() {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let randomStr = '';
            for (let i = 0; i < 6; i++) {
                randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            const appIdInp = document.getElementById('modal-client-app-id');
            if (appIdInp && !appIdInp.disabled) {
                appIdInp.value = 'APP-' + randomStr;
            }
        }

        function generateAutoAppSecret() {
            const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let secret = 'sec_';
            for (let i = 0; i < 28; i++) {
                secret += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            const secretInp = document.getElementById('modal-client-app-secret');
            if (secretInp) {
                secretInp.value = secret;
            }
        }

        function copySecretToClipboard() {
            const secretInp = document.getElementById('modal-client-app-secret');
            if (secretInp && secretInp.value) {
                navigator.clipboard.writeText(secretInp.value);
                showAlert('success', '📋 App-Secret berhasil disalin ke clipboard!');
            }
        }

        async function loadAppCredentialsSetting() {
            try {
                const res = await fetch('/api/settings/credentials', { headers: { 'x-admin-password': adminPass } }).then(r => r.json());
                if (res.success) {
                    const secretInp = document.getElementById('inp-setting-app-secret');
                    const allowedInp = document.getElementById('inp-setting-allowed-app-ids');
                    if (secretInp && res.app_secret) secretInp.value = res.app_secret;
                    if (allowedInp && res.allowed_app_ids_str) allowedInp.value = res.allowed_app_ids_str;
                }
            } catch (e) {}
        }

        async function saveAppCredentialsSetting() {
            const secretInp = document.getElementById('inp-setting-app-secret');
            const allowedInp = document.getElementById('inp-setting-allowed-app-ids');
            const secret = secretInp?.value?.trim();
            const allowed = allowedInp?.value?.trim();

            if (!secret) {
                showAlert('error', '⚠️ APP_SECRET tidak boleh kosong.');
                return;
            }

            try {
                const res = await fetch('/api/settings/credentials', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPass },
                    body: JSON.stringify({ app_secret: secret, allowed_app_ids: allowed, admin_password: adminPass })
                }).then(r => r.json());

                if (res.success) {
                    showAlert('success', '✨ Kredensial API (APP_SECRET & ALLOWED_APP_IDS) berhasil tersimpan di database!');
                    await loadAppCredentialsSetting();
                } else {
                    showAlert('error', res.message || 'Gagal menyimpan kredensial API');
                }
            } catch (e) {
                showAlert('error', 'Error: ' + e.message);
            }
        }

        async function populateMerchantOrderDropdown(cachedSettings = null) {
            const selIds = ['inp-gen-merchant-id', 'modal-order-merchant'];

            try {
                let settings = cachedSettings;
                if (!settings) {
                    const resSet = await fetch('/api/settings/merchant-list', { headers: { 'x-admin-password': adminPass } }).then(r => r.json()).catch(() => ({ settings: [] }));
                    settings = resSet.settings || [];
                }

                // Filter merchants with active session ONLY
                const activeSessionMerchants = settings.filter(s => s.hasSession);

                selIds.forEach(id => {
                    const sel = document.getElementById(id);
                    if (!sel) return;

                    if (activeSessionMerchants.length === 0) {
                        sel.innerHTML = '<option value="" disabled selected>🔴 Belum Ada Merchant Sesi Aktif (Silakan Login OTP dahulu)</option>';
                        sel.disabled = true;
                    } else {
                        sel.disabled = false;
                        let optHtml = '';
                        let autoSelected = false;

                        activeSessionMerchants.forEach(function(item) {
                            const mId = item.merchant_id || item.merchantId;
                            const mName = item.merchant_name || item.outletName || 'Merchant GoPay';
                            const mCity = item.city ? (' - ' + item.city) : '';
                            const mType = (item.merchant_type || 'GOPAY').toUpperCase();

                            const isPrimary = Boolean(item.isActive);
                            const isSel = isPrimary && !autoSelected;
                            if (isSel) autoSelected = true;

                            optHtml += '<option value="' + mId + '" ' + (isSel ? 'selected' : '') + '>🏪 [' + mType + '] ' + mName + ' (' + mId + ')' + mCity + (isPrimary ? ' ⭐ Utama' : '') + '</option>';
                        });

                        // If primary merchant wasn't among active session merchants, select the first active session merchant
                        if (!autoSelected && activeSessionMerchants.length > 0) {
                            const firstId = activeSessionMerchants[0].merchant_id || activeSessionMerchants[0].merchantId;
                            optHtml = optHtml.replace('value="' + firstId + '"', 'value="' + firstId + '" selected');
                        }

                        sel.innerHTML = optHtml;
                    }
                });
            } catch (e) {}
        }

        function handleMerchantOtpClick(btn) {
            const mId = btn.getAttribute('data-id');
            const phone = btn.getAttribute('data-phone');
            triggerOtpForMerchant(mId, phone);
        }

        async function setActiveMerchant(merchantId) {
            if (!merchantId) return;
            try {
                const res = await fetch('/api/merchants/active', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-password': adminPass
                    },
                    body: JSON.stringify({ merchant_id: merchantId, admin_password: adminPass })
                });
                const data = await res.json();
                if (data.success) {
                    showAlert('success', '⭐ Merchant ' + merchantId + ' berhasil di-set sebagai Merchant Utama!');
                    await loadMerchantsList();
                    if (typeof loadDashboardOverviewStats === 'function') loadDashboardOverviewStats();
                } else {
                    showAlert('error', data.message || 'Gagal mengubah Merchant Utama');
                }
            } catch (e) {
                showAlert('error', 'Error: ' + e.message);
            }
        }

        function handleMerchantSetActiveClick(btn) {
            const mId = btn.getAttribute('data-id');
            setActiveMerchant(mId);
        }

        function handleMerchantEditClick(btn) {
            const mId = btn.getAttribute('data-id');
            openEditMerchantModal(mId);
        }

        function handleMerchantDeleteClick(btn) {
            const mId = btn.getAttribute('data-id');
            deleteMerchantSetting(mId);
        }

        let _targetDeleteMerchantId = null;

        function deleteMerchantSetting(merchantId) {
            if (!merchantId) return;
            _targetDeleteMerchantId = merchantId;
            const s = (window._merchantSettingsCache || {})[merchantId];
            const mName = (s && (s.merchant_name || s.merchantName)) || merchantId;
            
            const titleEl = document.getElementById('del-modal-title');
            const bodyEl = document.getElementById('del-modal-body');
            const btnExec = document.getElementById('btn-do-delete-merchant');
            const modal = document.getElementById('modal-confirm-delete');

            if (titleEl) titleEl.innerText = 'Konfirmasi Hapus Merchant';
            if (bodyEl) bodyEl.innerHTML = 'Apakah Anda yakin ingin menghapus merchant <strong style="color:#fff;">' + mName + '</strong> (<code style="color:var(--accent-cyan);">' + merchantId + '</code>) secara permanen dari database?';
            if (btnExec) {
                btnExec.innerText = '🗑️ Ya, Hapus Merchant';
                btnExec.onclick = executeDeleteMerchant;
            }

            if (modal) modal.style.display = 'flex';
        }

        function closeConfirmDeleteModal() {
            const modal = document.getElementById('modal-confirm-delete');
            if (modal) modal.style.display = 'none';
            _targetDeleteMerchantId = null;
        }

        async function executeDeleteMerchant() {
            if (!_targetDeleteMerchantId) return;
            const mId = _targetDeleteMerchantId;
            const btn = document.getElementById('btn-do-delete-merchant');
            if (btn) {
                btn.disabled = true;
                btn.innerText = 'Menghapus...';
            }

            try {
                const res = await fetch('/api/merchants/' + encodeURIComponent(mId) + '?api_key=' + encodeURIComponent(adminPass), {
                    method: 'DELETE',
                    headers: {
                        'x-admin-password': adminPass,
                        'x-api-key': adminPass
                    }
                });
                const data = await res.json();
                if (data.success) {
                    showAlert('success', 'Merchant ' + mId + ' berhasil dihapus.');
                    closeConfirmDeleteModal();
                    loadMerchantsList();
                } else {
                    showAlert('error', data.message || 'Gagal menghapus merchant');
                }
            } catch (e) {
                showAlert('error', 'Error: ' + e.message);
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerText = '🗑️ Ya, Hapus Merchant';
                }
            }
        }

        let _editingMerchantId = null;

        function openAddMerchantModal() {
            _editingMerchantId = null;
            const title = document.getElementById('modal-merchant-title');
            const btn = document.getElementById('btn-submit-merchant');
            const inpId = document.getElementById('inp-m-id');
            if (title) title.innerText = '➕ Tambah Merchant Baru';
            if (btn) btn.innerText = '➕ Tambah Merchant';
            if (inpId) { inpId.value = ''; inpId.readOnly = false; inpId.style.opacity = '1'; }
            
            const inpName = document.getElementById('inp-m-name');
            const inpPhone = document.getElementById('inp-m-phone');
            const inpType = document.getElementById('inp-m-type');
            const inpCity = document.getElementById('inp-m-city');
            const inpQris = document.getElementById('inp-m-qris');
            if (inpName) inpName.value = '';
            if (inpPhone) inpPhone.value = '';
            if (inpType) inpType.value = 'gopay';
            if (inpCity) inpCity.value = '';
            if (inpQris) inpQris.value = '';

            const previewBox = document.getElementById('qris-preview-container');
            if (previewBox) previewBox.style.display = 'none';
            const fileInp = document.getElementById('file-qris-image');
            if (fileInp) fileInp.value = '';

            const modal = document.getElementById('modal-merchant');
            if (modal) modal.style.display = 'flex';
        }

        function openEditMerchantModal(id) {
            const decodedId = decodeURIComponent(id);
            const s = (window._merchantSettingsCache || {})[decodedId];
            _editingMerchantId = decodedId;

            const title = document.getElementById('modal-merchant-title');
            const btn = document.getElementById('btn-submit-merchant');
            const inpId = document.getElementById('inp-m-id');
            if (title) title.innerText = '✏️ Edit Merchant: ' + _editingMerchantId;
            if (btn) btn.innerText = '💾 Simpan Perubahan';
            if (inpId) { inpId.value = _editingMerchantId; inpId.readOnly = true; inpId.style.opacity = '0.5'; }

            const inpName = document.getElementById('inp-m-name');
            const inpPhone = document.getElementById('inp-m-phone');
            const inpType = document.getElementById('inp-m-type');
            const inpCity = document.getElementById('inp-m-city');
            const inpQris = document.getElementById('inp-m-qris');

            if (inpName) inpName.value = (s && (s.merchant_name || s.merchantName)) || '';
            if (inpPhone) inpPhone.value = (s && (s.phone_number || s.phoneNumber)) || '';
            if (inpType) inpType.value = (s && (s.merchant_type || s.merchantType)) || 'gopay';
            if (inpCity) inpCity.value = (s && s.city) || '';
            if (inpQris) inpQris.value = (s && (s.static_qris || s.staticQris)) || '';

            const previewBox = document.getElementById('qris-preview-container');
            if (previewBox) previewBox.style.display = 'none';
            const fileInp = document.getElementById('file-qris-image');
            if (fileInp) fileInp.value = '';

            const modal = document.getElementById('modal-merchant');
            if (modal) modal.style.display = 'flex';
        }

        function closeMerchantModal() {
            const modal = document.getElementById('modal-merchant');
            if (modal) modal.style.display = 'none';
            _editingMerchantId = null;
        }

        async function submitMerchantModal() {
            const mId = document.getElementById('inp-m-id').value.trim();
            const mName = document.getElementById('inp-m-name').value.trim();
            const mPhone = document.getElementById('inp-m-phone').value.trim();
            const mType = document.getElementById('inp-m-type').value.trim();
            const mCity = document.getElementById('inp-m-city').value.trim();
            const mQris = document.getElementById('inp-m-qris').value.trim();

            if (!mId) { showAlert('error', 'Merchant ID wajib diisi.'); return; }

            const btn = document.getElementById('btn-submit-merchant');
            if (btn) { btn.disabled = true; btn.innerText = 'Menyimpan...'; }

            try {
                let res, data;
                if (_editingMerchantId) {
                    res = await fetch('/api/settings/merchant/' + encodeURIComponent(_editingMerchantId), {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPass },
                        body: JSON.stringify({ merchant_name: mName, phone_number: mPhone, merchant_type: mType, city: mCity, static_qris: mQris, admin_password: adminPass })
                    });
                } else {
                    res = await fetch('/api/settings/merchant', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPass },
                        body: JSON.stringify({ merchant_id: mId, merchant_name: mName, phone_number: mPhone, merchant_type: mType, city: mCity, static_qris: mQris, admin_password: adminPass })
                    });
                }
                data = await res.json();
                if (data.success) {
                    showAlert('success', data.message);
                    closeMerchantModal();
                    loadMerchantsList();
                } else {
                    showAlert('error', data.message || 'Gagal menyimpan data merchant');
                }
            } catch (e) {
                showAlert('error', 'Error: ' + e.message);
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerText = _editingMerchantId ? '💾 Simpan Perubahan' : '➕ Tambah Merchant';
                }
            }
        }

        async function setActiveMerchant(merchantId) {
            try {
                const res = await fetch('/api/merchants/active?api_key=' + encodeURIComponent(adminPass), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ merchant_id: merchantId })
                });
                const data = await res.json();
                if (data.success) {
                    showAlert('success', data.message);
                    loadMerchantsList();
                    setTimeout(function() { window.location.reload(); }, 1000);
                }
            } catch (e) {
                showAlert('error', e.message);
            }
        }

        async function loadWebhooksTable() {
            const tbody = document.getElementById('tbody-webhooks');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Memuat antrian webhook...</td></tr>';
            try {
                const res = await fetch('/api/webhooks?limit=50&api_key=' + encodeURIComponent(adminPass));
                const data = await res.json();
                if (data.success && data.data) {
                    if (data.data.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Belum ada antrian webhook.</td></tr>';
                        return;
                    }
                    tbody.innerHTML = data.data.map(function(w) {
                        var statusTag = w.status === 'SUCCESS' ? '<span class="tag tag-success">🟢 SUCCESS</span>' : (w.status === 'FAILED' ? '<span class="tag tag-failed">🔴 FAILED</span>' : '<span class="tag tag-pending">🟡 PENDING</span>');
                        var fmtDate = new Date(w.createdAt).toLocaleString('id-ID');
                        var refText = w.clientRefId ? '<small style="color:var(--text-muted);">(' + w.clientRefId + ')</small>' : '';
                        return '<tr>' +
                            '<td>#' + w.id + '</td>' +
                            '<td><strong>' + w.qrisId + '</strong> ' + refText + '</td>' +
                            '<td style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + w.webhookUrl + '</td>' +
                            '<td>' + w.attempts + '/' + w.maxAttempts + '</td>' +
                            '<td>' + statusTag + '</td>' +
                            '<td style="color:var(--accent-red); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + (w.lastError || '-') + '</td>' +
                            '<td>' + fmtDate + '</td>' +
                        '</tr>';
                    }).join('');
                }
            } catch (e) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--accent-red);">Gagal memuat webhooks: ' + e.message + '</td></tr>';
            }
        }

        async function loadTransactionsTable() {
            const tbody = document.getElementById('tbody-tx');
            if (!tbody) return;
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Memuat mutasi GoJek...</td></tr>';
            try {
                const res = await fetch('/transactions?pageSize=50&api_key=' + encodeURIComponent(adminPass));
                const data = await res.json();
                if (data.success && data.data) {
                    const totalEl = document.getElementById('val-total-tx');
                    if (totalEl) totalEl.innerText = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(data.total_amount || 0);
                    const elToday = document.getElementById('val-today-tx');
                    if (elToday) {
                        elToday.innerText = 'Hari Ini: ' + new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(data.today_amount || 0);
                    }
                    if (data.data.transactions.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Belum ada transaksi mutasi GoJek.</td></tr>';
                        return;
                    }
                    tbody.innerHTML = data.data.transactions.map(function(t) {
                        var fmtAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(t.amount);
                        var fmtDate = t.time ? new Date(t.time).toLocaleString('id-ID') : '-';
                        var linkBtn = (!t.qris_id) ? '<button class="btn-primary btn-sm" onclick="promptLinkToQris(&quot;' + t.transaction_id + '&quot;)" style="font-size:11px; padding:3px 8px; margin-left:6px;">🔗 Jodohkan</button>' : '';
                        var qrisLink = t.qris_id ? '<a href="/qr/' + t.qris_id + '" target="_blank" style="color:var(--accent-green); text-decoration:none; font-weight:600;">🟢 ' + t.qris_id + '</a>' : '<span style="color:var(--text-muted);">- (Unclaimed) ' + linkBtn + '</span>';
                        return '<tr>' +
                            '<td><small>' + (t.transaction_id || '-') + '</small></td>' +
                            '<td><small>' + (t.order_id || '-') + '</small></td>' +
                            '<td><strong>' + (t.issuer || 'GoPay / Bank') + '</strong></td>' +
                            '<td style="color:var(--accent-cyan); font-weight:700;">' + fmtAmount + '</td>' +
                            '<td><span class="tag tag-success">' + (t.status || 'success') + '</span></td>' +
                            '<td>' + fmtDate + '</td>' +
                            '<td>' + qrisLink + '</td>' +
                        '</tr>';
                    }).join('');
                }
            } catch (e) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--accent-red);">Gagal memuat mutasi: ' + e.message + '</td></tr>';
            }
        }

        async function requestOTP(targetMerchantId = null) {
            const mId = targetMerchantId || window._selectedOtpMerchantId || null;
            const phone = document.getElementById('inp-phone') ? document.getElementById('inp-phone').value.trim() : '';

            if (!phone && !mId) {
                showAlert('error', 'Silakan masukkan nomor HP GoBiz Anda atau pilih merchant terlebih dahulu.');
                return;
            }

            const btn = document.getElementById('btn-otp');
            const spin = document.getElementById('spin-1');
            const lbl = document.getElementById('lbl-1');

            if (btn) btn.disabled = true;
            if (spin) spin.style.display = 'inline-block';
            if (lbl) lbl.innerText = 'Mengirim OTP...';

            try {
                const res = await fetch('/api/login/request-otp', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'x-admin-password': adminPass 
                    },
                    body: JSON.stringify({ phone: phone, merchant_id: mId, admin_password: adminPass })
                });
                const data = await res.json();

                if (data.success) {
                    showAlert('success', data.message);
                    const s1 = document.getElementById('step-1');
                    const s2 = document.getElementById('step-2');
                    if (s1) s1.style.display = 'none';
                    if (s2) s2.style.display = 'block';
                    startResendCountdown();
                } else {
                    showAlert('error', data.message || 'Gagal mengirimkan OTP');
                }
            } catch (err) {
                showAlert('error', 'Error: ' + err.message);
            } finally {
                if (btn) btn.disabled = false;
                if (spin) spin.style.display = 'none';
                if (lbl) lbl.innerText = '📱 Kirim Kode OTP (SMS/WA)';
            }
        }

        let resendInterval = null;
        let resendSeconds = 120;

        function startResendCountdown() {
            clearInterval(resendInterval);
            resendSeconds = 120;
            const btn = document.getElementById('btn-resend-otp');
            if (!btn) return;
            
            btn.disabled = true;
            btn.style.cursor = 'not-allowed';
            btn.style.color = 'var(--text-muted)';
            btn.style.background = 'rgba(255,255,255,0.06)';
            btn.style.borderColor = 'var(--border-color)';

            const updateText = () => {
                const mins = String(Math.floor(resendSeconds / 60)).padStart(2, '0');
                const secs = String(resendSeconds % 60).padStart(2, '0');
                btn.innerHTML = '🔄 Kirim Ulang OTP (' + mins + ':' + secs + ')';
            };

            updateText();

            resendInterval = setInterval(() => {
                resendSeconds--;
                if (resendSeconds <= 0) {
                    clearInterval(resendInterval);
                    btn.disabled = false;
                    btn.style.cursor = 'pointer';
                    btn.style.color = 'var(--accent-cyan)';
                    btn.style.background = 'rgba(56, 189, 248, 0.15)';
                    btn.style.borderColor = 'rgba(56, 189, 248, 0.35)';
                    btn.innerHTML = '🔄 Kirim Ulang OTP';
                } else {
                    updateText();
                }
            }, 1000);
        }

        async function resendOTP() {
            const btn = document.getElementById('btn-resend-otp');
            if (btn && btn.disabled) return;
            await requestOTP();
        }

        async function verifyOTP() {
            const otp = document.getElementById('inp-otp').value.trim();
            if (!otp) {
                showAlert('error', 'Silakan masukkan kode OTP yang Anda terima.');
                return;
            }

            const btn = document.getElementById('btn-verify');
            const spin = document.getElementById('spin-2');
            const lbl = document.getElementById('lbl-2');

            if (btn) btn.disabled = true;
            if (spin) spin.style.display = 'inline-block';
            if (lbl) lbl.innerText = 'Memverifikasi...';

            try {
                const res = await fetch('/api/login/verify-otp', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'x-admin-password': adminPass
                    },
                    body: JSON.stringify({ otp_code: otp, merchant_id: window._selectedOtpMerchantId || null, admin_password: adminPass })
                });
                const data = await res.json();

                if (data.success) {
                    showAlert('success', data.message);
                    const sBadge = document.getElementById('session-badge');
                    if (sBadge) sBadge.className = 'status-badge status-active';
                    const sIcon = document.getElementById('status-icon');
                    if (sIcon) sIcon.innerText = '🟢';
                    const sText = document.getElementById('status-text');
                    if (sText) sText.innerText = 'Sesi GoPay Merchant Aktif & Siap Menerima Order';
                    unlockQrisSection();
                    loadMerchantsList();
                    setTimeout(() => location.reload(), 1500);
                } else {
                    showAlert('error', data.message || 'Kode OTP Salah');
                }
            } catch (err) {
                showAlert('error', 'Error: ' + err.message);
            } finally {
                if (btn) btn.disabled = false;
                if (spin) spin.style.display = 'none';
                if (lbl) lbl.innerText = '✅ Verifikasi & Aktifkan Sesi';
            }
        }

        function unlockQrisSection() {
            const card = document.getElementById('card-qris-statis');
            if (!card) return;
            card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            card.style.opacity = '1';
            card.style.pointerEvents = 'auto';
            card.style.transform = 'translateY(0)';
        }

        async function logoutSession() {
            if (!confirm('Apakah Anda yakin ingin MENGHAPUS sesi login GoBiz Merchant dari server? Perhatian: Gateway tidak dapat mengecek transaksi otomatis sampai Anda melakukan verifikasi OTP ulang.')) return;
            try {
                const res = await fetch('/api/login/logout', { 
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'x-admin-password': adminPass
                    },
                    body: JSON.stringify({ admin_password: adminPass })
                });
                const data = await res.json();
                alert(data.message);
                location.reload();
            } catch (e) {
                alert('Error: ' + e.message);
            }
        }

        function parseQrisEmvCo(qrisString) {
            if (!qrisString || typeof qrisString !== 'string') return { name: '', city: '' };
            let name = '';
            let city = '';
            let i = 0;
            const str = qrisString.trim();
            while (i < str.length - 4) {
                const id = str.substring(i, i + 2);
                const len = parseInt(str.substring(i + 2, i + 4), 10);
                if (isNaN(len) || i + 4 + len > str.length) break;
                const val = str.substring(i + 4, i + 4 + len);
                if (id === '59') name = val;
                if (id === '60') city = val;
                i += 4 + len;
            }
            return { name, city };
        }

        function previewAndAutoScanQrisImage(evt) {
            const file = evt.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const previewImg = document.getElementById('qris-preview-img');
                const previewBox = document.getElementById('qris-preview-container');
                const scanStatus = document.getElementById('qris-scan-status');

                if (previewImg && previewBox) {
                    previewImg.src = e.target.result;
                    previewBox.style.display = 'block';
                    if (scanStatus) {
                        scanStatus.style.color = 'var(--accent-cyan)';
                        scanStatus.innerText = '⏳ Memindai Kode QRIS dari gambar...';
                    }

                    const img = new Image();
                    img.onload = async () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, img.width, img.height);
                        const imageData = ctx.getImageData(0, 0, img.width, img.height);

                        let qrisText = '';
                        if (typeof jsQR !== 'undefined') {
                            const code = jsQR(imageData.data, imageData.width, imageData.height);
                            if (code && code.data) {
                                qrisText = code.data.trim();
                            }
                        }

                        if (!qrisText) {
                            try {
                                const res = await fetch('/api/settings/upload-qris', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPass },
                                    body: JSON.stringify({ image: canvas.toDataURL('image/jpeg', 0.8), admin_password: adminPass })
                                });
                                const data = await res.json();
                                if (data.success && data.qris_string) {
                                    qrisText = data.qris_string;
                                }
                            } catch (err) {}
                        }

                        if (qrisText) {
                            const qrisField = document.getElementById('inp-m-qris');
                            if (qrisField) qrisField.value = qrisText;

                            const parsed = parseQrisEmvCo(qrisText);
                            const nameField = document.getElementById('inp-m-name');
                            const cityField = document.getElementById('inp-m-city');
                            if (nameField && !nameField.value && parsed.name) nameField.value = parsed.name;
                            if (cityField && !cityField.value && parsed.city) cityField.value = parsed.city;

                            if (scanStatus) {
                                scanStatus.style.color = 'var(--accent-green)';
                                scanStatus.innerText = '🟢 Kode QRIS Berhasil Diekstrak! ' + (parsed.name ? ('[' + parsed.name + ']') : '');
                            }
                            showAlert('success', 'Kode QRIS Berhasil Diekstrak & Ditempelkan ke Form!');
                        } else {
                            if (scanStatus) {
                                scanStatus.style.color = 'var(--accent-red)';
                                scanStatus.innerText = '🔴 Gagal membaca QR Code dari gambar. Pastikan gambar tidak buram.';
                            }
                            showAlert('error', 'Gagal membaca QR Code dari gambar. Pastikan gambar poster QRIS jelas.');
                        }
                    };
                    img.src = e.target.result;
                }
            };
            reader.readAsDataURL(file);
        }

        let activeGeneratedQrisUrl = '';

        function setGenAmount(val) {
            const el = document.getElementById('inp-gen-amount');
            if (el) {
                el.value = val;
                el.focus();
            }
        }

        async function generateNewQrisOrder() {
            const amountEl = document.getElementById('inp-gen-amount');
            const refIdEl = document.getElementById('inp-gen-ref');
            const webhookEl = document.getElementById('inp-gen-webhook');
            const merchantIdEl = document.getElementById('inp-gen-merchant-id');

            const amount = amountEl?.value;
            const refId = refIdEl?.value?.trim();
            const hours = document.getElementById('inp-gen-hours')?.value || 12;
            const webhook = webhookEl?.value?.trim();
            const merchantId = merchantIdEl?.value?.trim();

            if (!amount || isNaN(amount) || parseInt(amount) < 1) {
                showAlert('error', 'Silakan masukkan Nominal Pembayaran (amount) minimal Rp 1.');
                return;
            }

            if (!merchantId) {
                showAlert('error', '⚠️ Belum ada merchant dengan Sesi GoBiz Aktif. Silakan lakukan Login OTP pada tab "Sesi & Merchant" terlebih dahulu.');
                return;
            }

            closeCreateOrderModal();
            showAlert('info', '⏳ Sedang membuat Order QRIS Dinamis...');

            if (amountEl) amountEl.value = '';
            if (refIdEl) refIdEl.value = '';
            if (webhookEl) webhookEl.value = '';

            try {
                const payload = {
                    amount: parseInt(amount),
                    app_id: 'admin',
                    admin_password: adminPass,
                    expires_in_hours: parseFloat(hours)
                };
                if (merchantId) payload.merchant_id = merchantId;
                if (refId) payload.client_ref_id = refId;
                if (webhook) payload.webhook_url = webhook;

                const res = await fetch('/api/create-qris', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-password': adminPass,
                        'x-app-id': 'admin'
                    },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if (data.success && data.qris_id) {
                    showAlert('success', '✨ Order QRIS Dinamis (' + data.qris_id + ') nominal Rp ' + new Intl.NumberFormat('id-ID').format(data.amount) + ' berhasil dibuat!');
                    await loadOrdersTable();
                } else {
                    showAlert('error', data.message || 'Gagal membuat QRIS Dinamis');
                }
            } catch (err) {
                showAlert('error', 'Error: ' + err.message);
            }
        }

        async function openCreateOrderModal() {
            const modal = document.getElementById('modal-create-order');
            if (modal) modal.style.display = 'flex';
            await populateMerchantOrderDropdown();
            setTimeout(() => {
                const inp = document.getElementById('inp-gen-amount');
                if (inp) inp.focus();
            }, 100);
        }

        function closeCreateOrderModal(refresh = false) {
            const modal = document.getElementById('modal-create-order');
            if (modal) modal.style.display = 'none';
            if (refresh) loadOrdersTable();
        }

        function closeQrisModal(refresh = false) {
            const modal = document.getElementById('modal-qris-created');
            if (modal) modal.style.display = 'none';
            if (refresh) loadOrdersTable();
        }

        function toggleMobileSidebar() {
            const drawer = document.getElementById('mobile-sidebar');
            const backdrop = document.getElementById('mobile-sidebar-backdrop');
            if (!drawer || !backdrop) return;

            const isHidden = drawer.classList.contains('-translate-x-full');
            if (isHidden) {
                backdrop.classList.remove('hidden');
                drawer.classList.remove('-translate-x-full');
            } else {
                closeMobileSidebar();
            }
        }

        function closeMobileSidebar() {
            const drawer = document.getElementById('mobile-sidebar');
            const backdrop = document.getElementById('mobile-sidebar-backdrop');
            if (drawer) drawer.classList.add('-translate-x-full');
            if (backdrop) backdrop.classList.add('hidden');
        }

        function copyQrisLink() {
            if (!activeGeneratedQrisUrl) return;
            navigator.clipboard.writeText(activeGeneratedQrisUrl).then(() => {
                showAlert('success', 'Link Halaman Checkout QRIS berhasil disalin!');
            }).catch(() => {
                alert('Link QRIS: ' + activeGeneratedQrisUrl);
            });
        }

        function openQrisCheckoutLink() {
            if (!activeGeneratedQrisUrl) return;
            window.open(activeGeneratedQrisUrl, '_blank');
        }

        async function loadDashboardOverviewStats() {
            try {
                // Fetch mutasi & revenue
                const resTx = await fetch('/transactions?pageSize=50&api_key=' + encodeURIComponent(adminPass)).then(r => r.json()).catch(() => ({ total_amount: 0, today_amount: 0 }));
                const elTotRev = document.getElementById('dash-val-total-revenue');
                const elTodayRev = document.getElementById('dash-val-today-revenue');
                if (elTotRev) elTotRev.innerText = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(resTx.total_amount || 0);
                if (elTodayRev) elTodayRev.innerText = 'Hari Ini: ' + new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(resTx.today_amount || 0);

                // Fetch orders stat
                const resOrders = await fetch('/api/orders?limit=100&api_key=' + encodeURIComponent(adminPass)).then(r => r.json()).catch(() => ({ data: [] }));
                const orders = resOrders.data || [];
                const paidCount = orders.filter(o => o.status === 'PAID').length;
                const pctPaid = orders.length > 0 ? Math.round((paidCount / orders.length) * 100) : 0;

                const elTotOrders = document.getElementById('dash-val-total-orders');
                const elPaidOrders = document.getElementById('dash-val-paid-orders');
                if (elTotOrders) elTotOrders.innerText = orders.length + ' Order';
                if (elPaidOrders) elPaidOrders.innerText = '🟢 ' + paidCount + ' Lunas (' + pctPaid + '%)';

                // Fetch merchant stats
                const resMerchants = await fetch('/api/settings/merchant-list', { headers: { 'x-admin-password': adminPass } }).then(r => r.json()).catch(() => ({ settings: [] }));
                const settings = resMerchants.settings || [];
                const activeM = settings.find(s => s.isActive) || settings[0];

                const elActMerchants = document.getElementById('dash-val-active-merchants');
                const elActMName = document.getElementById('dash-val-active-merchant-name');
                if (elActMerchants) elActMerchants.innerText = settings.length + ' Merchant';
                if (elActMName) elActMName.innerText = 'Utama: ' + ((activeM && (activeM.merchant_name || activeM.merchant_id)) || 'GoPay Default');

                // Render recent 5 orders table
                const tbodyRecent = document.getElementById('dash-tbody-recent-orders');
                if (tbodyRecent) {
                    if (orders.length === 0) {
                        tbodyRecent.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Belum ada order QRIS.</td></tr>';
                    } else {
                        const recent5 = orders.slice(0, 5);
                        tbodyRecent.innerHTML = recent5.map(function(o) {
                            var statusTag = o.status === 'PAID' ? '<span class="tag tag-paid">🟢 PAID</span>' : (o.status === 'EXPIRED' ? '<span class="tag tag-expired">🔴 EXPIRED</span>' : '<span class="tag tag-pending">🟡 PENDING</span>');
                            var whTag = o.webhookStatus === 'SUCCESS' ? '<span class="tag tag-success">🟢 SUCCESS</span>' : (o.webhookStatus === 'FAILED' ? '<span class="tag tag-failed">🔴 FAILED</span>' : '<span class="tag tag-pending">🟡 QUEUED</span>');
                            var fmtAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(o.amount);
                            var fmtDate = new Date(o.createdAt).toLocaleString('id-ID');
                            return '<tr class="hover:bg-slate-800/40 transition-colors border-b border-slate-800/60">' +
                                '<td class="px-4 py-3.5"><strong class="font-mono text-sky-400 font-bold">' + o.qrisId + '</strong></td>' +
                                '<td class="px-4 py-3.5"><span class="font-mono font-bold text-white">' + fmtAmount + '</span></td>' +
                                '<td class="px-4 py-3.5">' + statusTag + '</td>' +
                                '<td class="px-4 py-3.5">' + whTag + '</td>' +
                                '<td class="px-4 py-3.5 text-xs text-slate-400 font-mono">' + fmtDate + '</td>' +
                                '<td class="px-4 py-3.5 text-right"><a href="/qr/' + o.qrisId + '" target="_blank" class="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 text-xs font-semibold inline-flex items-center gap-1 transition-colors">🔗 Lihat QR</a></td>' +
                            '</tr>';
                        }).join('');
                    }
                }

            } catch(e) {
                console.error('[DASHBOARD STATS ERROR]:', e.message);
            }
        }

        async function quickGenerateQrisFromDash() {
            const amountInp = document.getElementById('dash-inp-amount');
            const amount = amountInp ? amountInp.value.trim() : '';
            const merchantIdEl = document.getElementById('inp-gen-merchant-id');
            const merchantId = merchantIdEl ? merchantIdEl.value.trim() : '';

            if (!amount || isNaN(amount) || parseInt(amount) < 1) {
                showAlert('error', 'Silakan masukkan Nominal Pembayaran minimal Rp 1.');
                return;
            }

            try {
                showAlert('info', '⏳ Sedang mencetak QRIS Dinamis...');
                const payload = {
                    amount: parseInt(amount),
                    app_id: 'admin',
                    admin_password: adminPass,
                    expires_in_hours: 12
                };
                if (merchantId) payload.merchant_id = merchantId;

                const res = await fetch('/api/create-qris', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-password': adminPass,
                        'x-app-id': 'admin'
                    },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if (data.success && data.qris_id) {
                    if (amountInp) amountInp.value = '';
                    showAlert('success', '✨ Order QRIS Dinamis (' + data.qris_id + ') nominal Rp ' + new Intl.NumberFormat('id-ID').format(data.amount) + ' berhasil dibuat!');
                    loadDashboardOverviewStats();
                    if (data.checkout_url) window.open(data.checkout_url, '_blank');
                } else {
                    showAlert('error', data.message || 'Gagal membuat QRIS Dinamis');
                }
            } catch (err) {
                showAlert('error', 'Error: ' + err.message);
            }
        }

        function openCreateOrderModal() {
            const modal = document.getElementById('modal-create-order');
            const amtInput = document.getElementById('modal-order-amount');
            const selMerchant = document.getElementById('modal-order-merchant');
            
            if (selMerchant && typeof _merchantSettingsCache !== 'undefined') {
                let optHtml = '<option value="">🏪 Merchant Default (GoBiz)</option>';
                const addedIds = new Set();
                Object.values(_merchantSettingsCache || {}).forEach(function(item) {
                    const mId = item.merchant_id || item.merchantId;
                    const mName = item.merchant_name || item.outletName || 'Merchant GoPay';
                    if (mId && !addedIds.has(mId)) {
                        addedIds.add(mId);
                        optHtml += '<option value="' + mId + '">🏪 ' + mName + ' (' + mId + ')</option>';
                    }
                });
                selMerchant.innerHTML = optHtml;
            }

            if (amtInput) amtInput.value = '';
            if (modal) modal.style.display = 'flex';
        }

        function closeCreateOrderModal() {
            const modal = document.getElementById('modal-create-order');
            if (modal) modal.style.display = 'none';
        }

        async function submitCreateOrderModal() {
            const amtInput = document.getElementById('modal-order-amount');
            const selMerchant = document.getElementById('modal-order-merchant');
            const refInput = document.getElementById('modal-order-ref');
            const webhookInput = document.getElementById('modal-order-webhook');

            const amount = amtInput ? parseInt(amtInput.value.trim(), 10) : 0;
            if (!amount || isNaN(amount) || amount < 1) {
                showAlert('error', 'Masukkan nominal pembayaran yang valid (minimal Rp 1).');
                return;
            }

            const merchantId = selMerchant ? selMerchant.value : '';
            const refId = refInput ? refInput.value.trim() : '';
            const webhookUrl = webhookInput ? webhookInput.value.trim() : '';

            const btnSubmit = document.getElementById('btn-submit-create-order');
            if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.innerText = '⏳ Membuat QRIS...'; }

            try {
                const pass = adminPass || localStorage.getItem('admin_pass') || 'admin123456';
                const res = await fetch('/api/create-qris', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-password': pass,
                        'x-api-key': pass,
                        'x-app-id': 'admin'
                    },
                    body: JSON.stringify({
                        amount: amount,
                        merchant_id: merchantId,
                        client_ref_id: refId,
                        webhook_url: webhookUrl,
                        app_id: 'admin'
                    })
                });

                const data = await res.json();
                if (data.success) {
                    closeCreateOrderModal();
                    showAlert('success', '✨ Order QRIS Dinamis (' + data.qris_id + ') nominal Rp ' + new Intl.NumberFormat('id-ID').format(data.amount) + ' berhasil dibuat!');
                    if (typeof loadOrdersTable === 'function') loadOrdersTable();
                    if (data.checkout_url) window.open(data.checkout_url, '_blank');
                } else {
                    showAlert('error', data.message || 'Gagal membuat QRIS Dinamis');
                }
            } catch (err) {
                showAlert('error', 'Error: ' + err.message);
            } finally {
                if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerText = '✨ Generate QRIS Dinamis'; }
            }
        }

        function lockAdminSession() {
            if (typeof lockPortalAdmin === 'function') lockPortalAdmin();
        }

        setTimeout(function() {
            try { if (typeof loadMerchantsList === 'function') loadMerchantsList(); } catch(e){}
            try { if (typeof loadDashboardOverviewStats === 'function') loadDashboardOverviewStats(); } catch(e){}
            try { loadTransactionsTable(); } catch(e){ console.error(e); }
            try { if (typeof loadOrdersTable === 'function') loadOrdersTable(); } catch(e){}
            try { if (typeof loadWebhooksTable === 'function') loadWebhooksTable(); } catch(e){}
        }, 300);
    </script>
    `;
}

module.exports = renderScripts;
