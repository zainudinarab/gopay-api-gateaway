// Views - Admin Portal Dashboard HTML Generator (Modern Admin Panel UI)
const fs = require('fs');
const path = require('path');

function renderAdminDashboard(sessionDataOrExists, dbType = 'SQLite WAL', sessionObj = null) {
    let sessionExists = false;
    let merchantSession = null;
    
    if (typeof sessionDataOrExists === 'object' && sessionDataOrExists !== null) {
        sessionExists = true;
        merchantSession = sessionDataOrExists;
    } else {
        sessionExists = Boolean(sessionDataOrExists);
        merchantSession = sessionObj;
    }
    return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel - GoPay Merchant Gateway</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
                        mono: ['"JetBrains Mono"', 'monospace']
                    }
                }
            }
        }
    </script>
    <style>
        :root {
            --bg-body: #0b0f19;
            --bg-sidebar: #111827;
            --bg-card: #1f2937;
            --bg-card-hover: #263346;
            --bg-input: #0d131f;
            --border-color: #374151;
            --border-focus: #0284c7;
            --text-main: #f9fafb;
            --text-muted: #9ca3af;
            --text-dim: #6b7280;
            --accent-blue: #0284c7;
            --accent-cyan: #38bdf8;
            --accent-green: #22c55e;
            --accent-amber: #f59e0b;
            --accent-red: #ef4444;
            --accent-purple: #a855f7;
            --glow-cyan: rgba(56, 189, 248, 0.15);
            --shadow-card: 0 10px 30px -5px rgba(0, 0, 0, 0.5);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
        
        body {
            background-color: var(--bg-body);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            overflow-x: hidden;
        }

        /* Scrollbar Styling */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: var(--bg-body); }
        ::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #4b5563; }

        /* Lock Screen Centered Mode */
        .lock-container {
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: radial-gradient(circle at center, rgba(2, 132, 199, 0.12) 0%, transparent 70%), var(--bg-body);
            padding: 20px;
        }

        .lock-card {
            background: rgba(31, 41, 55, 0.85);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            width: 100%;
            max-width: 440px;
            padding: 40px 32px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
            text-align: center;
            animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Admin Panel Main Layout */
        .admin-layout {
            display: none;
            width: 100vw;
            min-height: 100vh;
        }

        .admin-layout.active {
            display: flex;
        }

        /* Sidebar Navigation */
        .sidebar {
            width: 280px;
            background: var(--bg-sidebar);
            border-right: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            position: fixed;
            top: 0; bottom: 0; left: 0;
            z-index: 100;
        }

        .sidebar-brand {
            padding: 24px 20px;
            display: flex;
            align-items: center;
            gap: 14px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .brand-icon {
            width: 44px; height: 44px;
            background: linear-gradient(135deg, rgba(2, 132, 199, 0.2), rgba(56, 189, 248, 0.1));
            border: 1px solid rgba(56, 189, 248, 0.3);
            border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            color: var(--accent-cyan);
            box-shadow: 0 0 15px var(--glow-cyan);
        }

        .brand-title {
            font-size: 16px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: -0.3px;
        }

        .brand-badge {
            display: inline-block;
            font-size: 10px;
            font-weight: 700;
            background: rgba(34, 197, 94, 0.15);
            color: var(--accent-green);
            padding: 2px 6px;
            border-radius: 6px;
            border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .sidebar-menu {
            padding: 20px 12px;
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 6px;
            overflow-y: auto;
        }

        .menu-label {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--text-dim);
            padding: 8px 12px;
            margin-top: 8px;
        }

        .tab-btn {
            width: 100%;
            background: transparent;
            border: 1px solid transparent;
            color: var(--text-muted);
            font-weight: 600;
            font-size: 14px;
            padding: 12px 14px;
            border-radius: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            text-align: left;
        }

        .tab-btn:hover {
            color: var(--text-main);
            background: rgba(255, 255, 255, 0.04);
        }

        .tab-btn.active {
            color: var(--accent-cyan);
            background: linear-gradient(90deg, rgba(2, 132, 199, 0.15), rgba(56, 189, 248, 0.05));
            border-color: rgba(56, 189, 248, 0.25);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .sidebar-footer {
            padding: 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            background: rgba(0, 0, 0, 0.2);
        }

        /* Main Workspace Content Area */
        .main-content {
            margin-left: 280px;
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
        }

        .top-header {
            height: 72px;
            background: rgba(17, 24, 39, 0.8);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--border-color);
            padding: 0 32px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: sticky;
            top: 0;
            z-index: 90;
        }

        .header-title h2 { font-size: 18px; font-weight: 700; color: #fff; }
        .header-title p { font-size: 12.5px; color: var(--text-muted); }

        .header-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .system-pill {
            display: flex; align-items: center; gap: 8px;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            color: var(--text-muted);
        }

        .status-dot {
            width: 8px; height: 8px;
            border-radius: 50%;
            background: var(--accent-green);
            box-shadow: 0 0 10px var(--accent-green);
        }

        .content-body {
            padding: 32px;
            flex: 1;
        }

        /* KPI Stat Cards Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 20px;
            margin-bottom: 28px;
        }

        .stat-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 20px;
            box-shadow: var(--shadow-card);
            position: relative;
            overflow: hidden;
            transition: transform 0.2s, border-color 0.2s;
        }

        .stat-card:hover {
            transform: translateY(-2px);
            border-color: rgba(56, 189, 248, 0.4);
        }

        .stat-icon {
            width: 40px; height: 40px;
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            margin-bottom: 14px;
        }

        .stat-label { font-size: 12.5px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; }
        .stat-val { font-size: 24px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }

        /* Form Components */
        .form-group { text-align: left; margin-bottom: 20px; }
        label { display: block; font-size: 13px; font-weight: 600; color: #d1d5db; margin-bottom: 8px; }
        
        input[type="text"], input[type="password"] {
            width: 100%;
            background: var(--bg-input);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 14px 16px;
            color: var(--text-main);
            font-size: 14px;
            outline: none;
            transition: all 0.2s;
        }

        input[type="text"]:focus, input[type="password"]:focus {
            border-color: var(--border-focus);
            box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.25);
        }

        /* Buttons */
        .btn-primary {
            background: linear-gradient(135deg, var(--accent-blue), #0369a1);
            color: #ffffff;
            border: none;
            font-weight: 600;
            font-size: 13.5px;
            padding: 12px 20px;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
        }

        .btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(2, 132, 199, 0.5);
        }

        .btn-danger {
            background: rgba(239, 68, 68, 0.15);
            color: var(--accent-red);
            border: 1px solid rgba(239, 68, 68, 0.3);
            box-shadow: none;
        }

        .btn-danger:hover {
            background: rgba(239, 68, 68, 0.25);
            box-shadow: 0 4px 14px rgba(239, 68, 68, 0.3);
        }

        .btn-sm {
            padding: 8px 14px;
            font-size: 12.5px;
            border-radius: 8px;
        }

        .spinner {
            width: 16px; height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: #fff;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            display: none;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* Alerts */
        .alert {
            display: none;
            font-size: 13.5px;
            padding: 14px 18px;
            border-radius: 12px;
            margin-bottom: 24px;
            text-align: left;
            animation: fadeIn 0.3s;
        }
        .alert-success { background: rgba(34, 197, 94, 0.12); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); }
        .alert-error { background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }

        /* Status Badge */
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            font-weight: 700;
            font-size: 14px;
            padding: 12px 20px;
            border-radius: 14px;
            margin-bottom: 24px;
        }
        .status-active { background: rgba(34, 197, 94, 0.12); color: var(--accent-green); border: 1px solid rgba(34, 197, 94, 0.3); }
        .status-inactive { background: rgba(239, 68, 68, 0.12); color: var(--accent-red); border: 1px solid rgba(239, 68, 68, 0.3); }

        /* Tab Contents */
        .tab-content { display: none; }
        .tab-content.active { display: block; animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }

        /* Panel Container */
        .panel-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 20px;
            padding: 28px;
            box-shadow: var(--shadow-card);
            margin-bottom: 28px;
        }

        .toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            gap: 16px;
            flex-wrap: wrap;
        }

        /* Tables */
        .table-responsive {
            overflow-x: auto;
            max-height: 520px;
            overflow-y: auto;
            border: 1px solid var(--border-color);
            border-radius: 14px;
            background: #111827;
        }

        table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
        
        th {
            background: #1f2937;
            color: var(--text-muted);
            font-weight: 700;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
            padding: 14px 16px;
            position: sticky; top: 0; z-index: 2;
            border-bottom: 1px solid var(--border-color);
        }

        td {
            padding: 14px 16px;
            border-bottom: 1px solid #1f2937;
            color: #d1d5db;
            vertical-align: middle;
        }

        tr:nth-child(even) td { background: rgba(17, 24, 39, 0.5); }
        tr:hover td { background: rgba(56, 189, 248, 0.06); }

        .tag {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 8px;
            font-weight: 700;
            font-size: 11px;
            letter-spacing: 0.3px;
        }

        .tag-paid, .tag-success { background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); }
        .tag-pending { background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); }
        .tag-failed, .tag-expired { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }

        code, pre { font-family: 'JetBrains Mono', monospace; }

        /* Responsive Breakpoints */
        @media (max-width: 992px) {
            .sidebar { width: 220px; }
            .main-content { margin-left: 220px; }
        }

        @media (max-width: 768px) {
            .admin-layout.active { flex-direction: column; }
            .sidebar { width: 100%; position: relative; height: auto; border-right: none; border-bottom: 1px solid var(--border-color); }
            .main-content { margin-left: 0; }
            .top-header { padding: 0 16px; }
            .content-body { padding: 16px; }
        }
    </style>
</head>
<body>

    <!-- Section 1: Lock Screen Password Admin (Centred Glassmorphic Screen) -->
    <div class="lock-container" id="section-admin-lock">
        <div class="lock-card">
            <div class="brand-icon" style="margin: 0 auto 20px; width: 64px; height: 64px;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <h2 style="font-size: 22px; font-weight: 800; margin-bottom: 8px;">Admin Control Portal</h2>
            <p style="font-size: 13.5px; color: var(--text-muted); margin-bottom: 28px;">Masukkan Password Admin di file <code>.env</code> untuk membuka portal kontrol gateway GoPay.</p>

            <div class="alert alert-error" id="msg-error" style="display:none;"></div>
            <div class="alert alert-success" id="msg-success" style="display:none;"></div>

            <div class="form-group">
                <label for="inp-admin-pass">🔒 Password Admin Gateway</label>
                <input type="password" id="inp-admin-pass" placeholder="Password Admin di .env..." onkeyup="if(event.key==='Enter') unlockAdmin()">
            </div>
            
            <button class="btn-primary" id="btn-unlock" onclick="unlockAdmin()" style="width: 100%; padding: 14px;">
                <span class="spinner" id="spin-lock"></span>
                <span id="lbl-lock">🔑 Masuk ke Portal Admin</span>
            </button>
        </div>
    </div>

    <!-- Section 2: Dashboard Control Panel (Sidebar + Workspace Layout) -->
    <div class="admin-layout" id="section-dashboard">
        
        <!-- Sidebar Navigation Menu -->
        <aside class="sidebar">
            <div class="sidebar-brand">
                <div class="brand-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div>
                    <div class="brand-title">GoPay Gateway</div>
                    <span class="brand-badge" style="background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan); border: 1px solid rgba(56, 189, 248, 0.3); font-weight: 700;">🐘 DB: ${dbType}</span>
                </div>
            </div>

            <nav class="sidebar-menu">
                <div class="menu-label">Menu Utama</div>
                
                <button class="tab-btn active" data-tab="orders" onclick="switchTabByName('orders', event)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    🧾 Order QRIS
                </button>
                
                <button class="tab-btn" data-tab="auth" onclick="switchTabByName('auth', event)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    🔐 Sesi GoBiz
                </button>
                
                <button class="tab-btn" data-tab="webhooks" onclick="switchTabByName('webhooks', event)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    🔔 Antrian Webhook
                </button>

                <button class="tab-btn" data-tab="tx" onclick="switchTabByName('tx', event)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                    💸 Mutasi GoJek
                </button>

                <div class="menu-label">Pengembang</div>

                <button class="tab-btn" data-tab="logs" onclick="switchTabByName('logs', event)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="1" x2="20" y2="19"></line></svg>
                    💻 Live System Logs
                </button>
                
                <button class="tab-btn" data-tab="docs" onclick="switchTabByName('docs', event)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                    📖 Dokumentasi API
                </button>
            </nav>

            <div class="sidebar-footer">
                <button class="btn-primary btn-danger" style="width: 100%; justify-content: center; font-size: 13px;" onclick="lockPortalAdmin()">
                    🚪 Logout Admin Portal
                </button>
            </div>
        </aside>

        <!-- Main Workspace Area -->
        <main class="main-content">
            <!-- Top Header Bar -->
            <header class="top-header">
                <div class="header-title">
                    <h2 id="header-page-title">Order QRIS</h2>
                    <p id="header-page-subtitle">Kelola dan pantau seluruh transaksi QRIS yang diterbitkan.</p>
                </div>
                
                <div class="header-actions">
                    <div class="system-pill" style="border-color: rgba(56, 189, 248, 0.4); background: rgba(56, 189, 248, 0.1); color: var(--accent-cyan); font-weight: 600;">
                        <span class="status-dot" style="background: var(--accent-cyan); box-shadow: 0 0 8px var(--accent-cyan);"></span>
                        <span>🛢️ Database Engine: <strong>${dbType}</strong></span>
                    </div>
                    <div class="system-pill">
                        <span class="status-dot"></span>
                        <span>Reconciler & Webhook Active</span>
                    </div>
                    <button class="btn-primary btn-sm" onclick="refreshCurrentTab()" style="background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); color: var(--text-main);">
                        🔄 Sync Data
                    </button>
                    <button class="btn-primary btn-sm btn-danger" onclick="lockPortalAdmin()" title="Keluar dan kunci halaman portal admin">
                        🚪 Logout Admin
                    </button>
                </div>
            </header>

            <!-- Main Body Workspace -->
            <div class="content-body">
                
                <!-- KPI Stat Cards Overview -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon" style="background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan);">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                        </div>
                        <div class="stat-label">Total Mutasi GoJek</div>
                        <div class="stat-val" id="val-total-tx" style="color: var(--accent-cyan);">Rp 0</div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon" style="background: rgba(34, 197, 94, 0.15); color: var(--accent-green);">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        </div>
                        <div class="stat-label">Sesi Merchant GoPay</div>
                        <div class="stat-val" style="font-size: 16px; color: ${sessionExists ? 'var(--accent-green)' : 'var(--accent-red)'};">
                            ${sessionExists ? '🟢 Sesi Aktif' : '🔴 Belum Aktivasi'}
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon" style="background: rgba(168, 85, 247, 0.15); color: var(--accent-purple);">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                        </div>
                        <div class="stat-label">Antrian Webhook Worker</div>
                        <div class="stat-val" style="font-size: 16px; color: var(--accent-purple);">5s Auto-Retry</div>
                    </div>
                </div>

                <!-- Tab 1: Sesi & Login GoBiz -->
                <div class="tab-content" id="tab-auth">
                    <div class="panel-card">
                        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 16px;">🔐 Status & Konfigurasi Sesi GoBiz Merchant</h3>
                        
                        <div class="status-badge ${sessionExists ? 'status-active' : 'status-inactive'}" id="session-badge">
                            <span id="status-icon">${sessionExists ? '🟢' : '🔴'}</span>
                            <span id="status-text">${sessionExists ? 'Sesi GoPay Merchant Aktif & Siap Menerima Order' : 'Sesi GoPay Merchant Belum Dikonfigurasi'}</span>
                        </div>

                        ${sessionExists ? `
                        <div id="logged-in-box" style="padding: 16px 0;">
                            <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px; flex-wrap: wrap; gap: 10px;">
                                    <div style="display: flex; align-items: center; gap: 12px;">
                                        <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); display: flex; align-items: center; justify-content: center; font-size: 22px;">
                                            🏪
                                        </div>
                                        <div>
                                            <h4 style="margin: 0; font-size: 16px; font-weight: 700; color: #fff;">${merchantSession && merchantSession.outlet_name ? merchantSession.outlet_name : 'Merchant GoPay Partner'}</h4>
                                            <span style="font-size: 12px; color: var(--accent-cyan); font-weight: 600;">GoBiz Partner Outlet</span>
                                        </div>
                                    </div>
                                    <span style="background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); color: var(--accent-green); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
                                        <span style="width: 7px; height: 7px; background: var(--accent-green); border-radius: 50%; display: inline-block; box-shadow: 0 0 6px var(--accent-green);"></span> Sesi Aktif 24/7
                                    </span>
                                </div>

                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 16px;">
                                    <div style="background: rgba(255,255,255,0.03); padding: 12px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
                                        <div style="font-size: 11.5px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">🆔 GoPay Merchant ID</div>
                                        <div style="font-size: 14.5px; font-weight: 700; color: var(--accent-cyan); font-family: 'JetBrains Mono', monospace;">${merchantSession && merchantSession.merchant_id ? merchantSession.merchant_id : '-'}</div>
                                    </div>
                                    
                                    <div style="background: rgba(255,255,255,0.03); padding: 12px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
                                        <div style="font-size: 11.5px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">📱 Nomor HP Terdaftar</div>
                                        <div style="font-size: 14.5px; font-weight: 700; color: #fff;">${merchantSession && merchantSession.phone_number ? merchantSession.phone_number : '-'}</div>
                                    </div>

                                    <div style="background: rgba(255,255,255,0.03); padding: 12px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
                                        <div style="font-size: 11.5px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">⏳ Sesi Berakhir (Expires)</div>
                                        <div style="font-size: 13.5px; font-weight: 600; color: #f59e0b;">${merchantSession && merchantSession.expires_at ? new Date(merchantSession.expires_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIB' : 'Auto-Refreshed'}</div>
                                    </div>

                                    <div style="background: rgba(255,255,255,0.03); padding: 12px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
                                        <div style="font-size: 11.5px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">🔑 Token Authenticated</div>
                                        <div style="font-size: 13.5px; font-weight: 600; color: var(--accent-green);">🟢 JWT Token Valid</div>
                                    </div>
                                </div>

                                <p style="font-size: 12.5px; color: var(--text-muted); margin: 0; line-height: 1.5;">
                                    💡 <strong>Fitur Auto-Keep-Alive</strong>: Worker gateway secara otomatis memperbarui token GoBiz setiap 6 jam sehingga sesi login toko Anda terus aktif 24/7 tanpa perlu input OTP ulang.
                                </p>
                            </div>

                            <button class="btn-primary btn-danger" onclick="logoutSession()" style="background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #f87171; font-weight: 600;">
                                🗑️ Putuskan / Hapus Sesi Login GoPay Merchant
                            </button>
                        </div>
                        ` : `
                        <div id="step-1" style="max-width: 480px;">
                            <p style="font-size: 13.5px; color: var(--text-muted); margin-bottom: 20px;">
                                Masukkan nomor HP yang terdaftar di aplikasi GoBiz untuk menerima Kode OTP via SMS / Whatsapp.
                            </p>
                            <div class="form-group">
                                <label for="inp-phone">Nomor HP GoBiz / GoFood Merchant</label>
                                <input type="text" id="inp-phone" placeholder="Contoh: 08123456789 atau 0851...">
                            </div>
                            <button class="btn-primary" id="btn-otp" onclick="requestOTP()">
                                <span class="spinner" id="spin-1"></span>
                                <span id="lbl-1">📱 Kirim Kode OTP (SMS/WA)</span>
                            </button>
                        </div>

                        <div id="step-2" style="display: none; max-width: 480px;">
                            <p style="font-size: 13.5px; color: var(--text-muted); margin-bottom: 20px;">
                                Masukkan 4 digit kode OTP yang diterima di HP Anda.
                            </p>
                            <div class="form-group">
                                <label for="inp-otp">Kode OTP GoBiz (4 Digit)</label>
                                <input type="text" id="inp-otp" placeholder="____" maxlength="6" style="letter-spacing: 6px; text-align: center; font-size: 24px; font-weight: 800;">
                            </div>
                            <button class="btn-primary" id="btn-verify" onclick="verifyOTP()" style="margin-bottom: 12px;">
                                <span class="spinner" id="spin-2"></span>
                                <span id="lbl-2">✅ Verifikasi & Aktifkan Sesi</span>
                            </button>

                            <button class="btn-primary" id="btn-resend-otp" onclick="resendOTP()" disabled style="background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); color: var(--text-muted); width: 100%; font-size: 13px; cursor: not-allowed; margin-top: 4px;">
                                🔄 Kirim Ulang OTP (<span id="resend-timer">02:00</span>)
                            </button>
                        </div>
                        `}
                    </div>

                    <!-- Static QRIS Configuration Card -->
                    <div class="panel-card" style="margin-top: 24px;">
                        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">📷 Konfigurasi & Upload QRIS Statis Merchant</h3>
                        <p style="font-size: 13.5px; color: var(--text-muted); margin-bottom: 16px;">
                            Pilih gambar poster/stiker QRIS resmi toko Anda (JPG/PNG). Gambar akan ditampilkan untuk Anda pratinjau, lalu klik tombol <strong>🔍 Pindai & Ekstrak Kode QRIS</strong> untuk membaca data QR code.
                        </p>

                        <!-- Upload Dropzone -->
                        <div style="border: 2px dashed rgba(56, 189, 248, 0.35); background: rgba(56, 189, 248, 0.04); border-radius: 12px; padding: 22px; text-align: center; margin-bottom: 20px; cursor: pointer; transition: all 0.2s ease;" onclick="document.getElementById('file-qris-image').click()" onmouseover="this.style.borderColor='var(--accent-cyan)'" onmouseout="this.style.borderColor='rgba(56, 189, 248, 0.35)'">
                            <div style="font-size: 36px; margin-bottom: 8px;">🖼️</div>
                            <div style="font-size: 14.5px; font-weight: 700; color: var(--accent-cyan);">Pilih / Unggah Gambar Poster QRIS Toko</div>
                            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Klik di sini untuk memilih file gambar (PNG, JPG, JPEG)</div>
                            <input type="file" id="file-qris-image" accept="image/*" style="display: none;" onchange="previewQrisImage(event)">
                        </div>

                        <!-- Image Preview Box (Hidden until image selected) -->
                        <div id="qris-preview-container" style="display: none; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 12px; padding: 18px; margin-bottom: 20px; text-align: center;">
                            <div style="font-size: 12.5px; color: var(--accent-cyan); font-weight: 600; margin-bottom: 12px;">📸 Pratinjau Gambar QRIS yang Dipilih:</div>
                            <div style="display: flex; justify-content: center; margin-bottom: 16px;">
                                <img id="qris-preview-img" style="max-height: 280px; max-width: 100%; border-radius: 10px; border: 2px solid rgba(56, 189, 248, 0.4); box-shadow: 0 8px 24px rgba(0,0,0,0.4);" alt="Preview QRIS">
                            </div>
                            <button class="btn-primary" id="btn-scan-qris" onclick="processScanSelectedImage()" style="background: linear-gradient(135deg, #10b981, #059669); font-weight: 700; font-size: 14.5px; padding: 12px 24px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3); margin: 0 auto; display: inline-flex; align-items: center; gap: 8px;">
                                🔍 Pindai & Ekstrak Kode QRIS
                            </button>
                        </div>

                        <!-- Decoded Info & Result Box (Hidden until scanned) -->
                        <div id="qris-parsed-info" style="display: none; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 10px; padding: 14px; margin-bottom: 16px;">
                            <div style="font-size: 13px; font-weight: 700; color: var(--accent-green); margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                                🟢 Kode QRIS Berhasil Dipindai & Diidentifikasi!
                            </div>
                            <div id="qris-parsed-details" style="font-size: 12.5px; color: var(--text-main); line-height: 1.6;"></div>
                        </div>

                        <div class="form-group" style="margin-bottom: 16px;">
                            <label for="inp-static-qris">String QRIS Statis Hasil Scan / Input Manual</label>
                            <textarea id="inp-static-qris" rows="4" style="width: 100%; font-family: 'JetBrains Mono', monospace; font-size: 12.5px; padding: 12px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 8px; color: var(--accent-cyan);" placeholder="00020101021126610014COM.GO-JEK.WWW..."></textarea>
                        </div>

                        <button class="btn-primary" id="btn-save-qris" onclick="saveStaticQrisConfig()" style="background: linear-gradient(135deg, #0284c7, #0369a1); font-weight: 600;">
                            💾 Simpan String QRIS ke Database PostgreSQL
                        </button>
                    </div>
                </div>

                <!-- Tab 2: Daftar Order QRIS (Active Default) -->
                <div class="tab-content active" id="tab-orders">

                    <!-- Form Generator QRIS Dinamis Baru (Tailwind Redesign) -->
                    <div class="bg-slate-900/90 backdrop-blur-xl border border-sky-500/30 rounded-2xl p-6 mb-6 shadow-xl shadow-sky-950/20">
                        <div class="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-lg font-bold shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                                    ⚡
                                </div>
                                <div>
                                    <h3 class="text-base font-bold text-white tracking-tight">Generator Order QRIS Dinamis Baru</h3>
                                    <p class="text-xs text-slate-400 mt-0.5">Buat transaksi QRIS dinamis baru dengan nominal unik otomatis (100% Siap Dipindai Pelanggan).</p>
                                </div>
                            </div>
                        </div>

                        <!-- Input Fields Grid -->
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div>
                                <label for="inp-gen-amount" class="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">Nominal Pembayaran (Rp) *</label>
                                <div class="relative">
                                    <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-emerald-400 font-bold text-sm">Rp</span>
                                    <input type="number" id="inp-gen-amount" placeholder="10.000" class="w-full pl-10 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-emerald-400 font-extrabold text-base focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600">
                                </div>
                            </div>

                            <div>
                                <label for="inp-gen-ref" class="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">Order ID / Ref ID (Opsional)</label>
                                <input type="text" id="inp-gen-ref" placeholder="Contoh: INV-20260902-001" class="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all placeholder:text-slate-600">
                            </div>

                            <div>
                                <label for="inp-gen-hours" class="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">Masa Kadaluwarsa</label>
                                <select id="inp-gen-hours" class="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all">
                                    <option value="1">1 Jam</option>
                                    <option value="6">6 Jam</option>
                                    <option value="12" selected>12 Jam (Default)</option>
                                    <option value="24">24 Jam (1 Hari)</option>
                                    <option value="48">48 Jam (2 Hari)</option>
                                </select>
                            </div>

                            <div>
                                <label for="inp-gen-webhook" class="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">Webhook Callback URL (Opsional)</label>
                                <input type="url" id="inp-gen-webhook" placeholder="https://domain.com/webhook" class="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all placeholder:text-slate-600">
                            </div>
                        </div>

                        <!-- Quick Nominal Preset Chips -->
                        <div class="flex items-center gap-2 flex-wrap mb-5">
                            <span class="text-xs font-semibold text-slate-400 mr-1">Pilihan Cepat:</span>
                            <button type="button" onclick="setGenAmount(10000)" class="px-3 py-1 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-full text-sky-400 text-xs font-bold transition-all hover:scale-105 active:scale-95">Rp 10.000</button>
                            <button type="button" onclick="setGenAmount(25000)" class="px-3 py-1 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-full text-sky-400 text-xs font-bold transition-all hover:scale-105 active:scale-95">Rp 25.000</button>
                            <button type="button" onclick="setGenAmount(50000)" class="px-3 py-1 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-full text-sky-400 text-xs font-bold transition-all hover:scale-105 active:scale-95">Rp 50.000</button>
                            <button type="button" onclick="setGenAmount(100000)" class="px-3 py-1 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-full text-sky-400 text-xs font-bold transition-all hover:scale-105 active:scale-95">Rp 100.000</button>
                            <button type="button" onclick="setGenAmount(250000)" class="px-3 py-1 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-full text-sky-400 text-xs font-bold transition-all hover:scale-105 active:scale-95">Rp 250.000</button>
                            <button type="button" onclick="setGenAmount(500000)" class="px-3 py-1 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-full text-sky-400 text-xs font-bold transition-all hover:scale-105 active:scale-95">Rp 500.000</button>
                        </div>

                        <!-- Action Button -->
                        <div class="flex justify-end pt-2 border-t border-slate-800/80">
                            <button class="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-950/40 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2" id="btn-generate-qris" onclick="generateNewQrisOrder()">
                                <span>✨</span> Generate Kode QRIS Pembayaran Baru
                            </button>
                        </div>
                    </div>

                    <div class="panel-card">
                        <div class="toolbar">
                            <div>
                                <h3 style="font-size: 18px; font-weight: 700;">🧾 Riwayat Order QRIS Dinamis</h3>
                                <p style="font-size: 13px; color: var(--text-muted);">Menampilkan order QRIS dinamis beserta kode unik & status pembayaran.</p>
                            </div>
                            <div style="display: flex; gap: 10px;">
                                <button class="btn-primary btn-sm" onclick="loadOrdersTable()">🔄 Refresh Orders</button>
                                <button class="btn-primary btn-sm btn-danger" onclick="clearAllOrders()">🗑️ Reset Database Order</button>
                            </div>
                        </div>

                        <div class="table-responsive">
                            <table>
                                <thead>
                                    <tr>
                                        <th>QRIS ID</th>
                                        <th>App ID</th>
                                        <th>Ref ID</th>
                                        <th>Nominal Akhir</th>
                                        <th>Status Order</th>
                                        <th>Status Webhook</th>
                                        <th>Dibuat Pada</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody id="tbody-orders">
                                    <tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Memuat data order...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Tab 3: Status Antrian Webhook -->
                <div class="tab-content" id="tab-webhooks">
                    <div class="panel-card">
                        <div class="toolbar">
                            <div>
                                <h3 style="font-size: 18px; font-weight: 700;">🔔 Log Antrian Webhook Delivery</h3>
                                <p style="font-size: 13px; color: var(--text-muted);">Status pengiriman notifikasi HTTP POST ke server Pihak Ketiga (Auto Retry 3x).</p>
                            </div>
                            <button class="btn-primary btn-sm" onclick="loadWebhooksTable()">🔄 Refresh Webhooks</button>
                        </div>

                        <div class="table-responsive">
                            <table>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>QRIS ID / Ref ID</th>
                                        <th>Target Webhook URL</th>
                                        <th>Percobaan</th>
                                        <th>Status Delivery</th>
                                        <th>Error Log</th>
                                        <th>Waktu</th>
                                    </tr>
                                </thead>
                                <tbody id="tbody-webhooks">
                                    <tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Memuat antrian webhook...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Tab 4: Mutasi Transaksi -->
                <div class="tab-content" id="tab-tx">
                    <div class="panel-card">
                        <div class="toolbar">
                            <div>
                                <h3 style="font-size: 18px; font-weight: 700;">💸 Mutasi Transaksi Masuk GoJek</h3>
                                <p style="font-size: 13px; color: var(--text-muted);">Mutasi saldo dan pembayaran QRIS yang terdeteksi dari API GoJek Merchant.</p>
                            </div>
                            <button class="btn-primary btn-sm" onclick="loadTransactionsTable()">🔄 Refresh Mutasi</button>
                        </div>

                        <div class="table-responsive">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Tx ID</th>
                                        <th>Order ID</th>
                                        <th>Sumber Pembayaran</th>
                                        <th>Nominal (Rp)</th>
                                        <th>Status</th>
                                        <th>Waktu Transaksi</th>
                                        <th>Connected QRIS ID</th>
                                    </tr>
                                </thead>
                                <tbody id="tbody-tx">
                                    <tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Memuat data mutasi GoJek...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Tab 5: Live System Logs -->
                <div class="tab-content" id="tab-logs">
                    <div class="panel-card">
                        <div class="toolbar">
                            <div>
                                <h3 style="font-size: 18px; font-weight: 700;">💻 Live System & Worker Logs</h3>
                                <p style="font-size: 13px; color: var(--text-muted);">Memantau log aktivitas background worker, transaksi, dan server secara real-time.</p>
                            </div>
                            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                                <select id="select-log-level" onchange="filterLogsDisplay()" style="background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-main); padding: 8px 12px; border-radius: 8px; font-size: 12.5px; outline: none;">
                                    <option value="ALL">Semua Log Level</option>
                                    <option value="SYSTEM">🟢 SYSTEM</option>
                                    <option value="INFO">🔵 INFO</option>
                                    <option value="ERROR">🔴 ERROR</option>
                                </select>
                                <button class="btn-primary btn-sm" id="btn-auto-logs" onclick="toggleAutoLogs()" style="background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.3); color: var(--accent-green);">
                                    ⚡ Auto Refresh (ON)
                                </button>
                                <button class="btn-primary btn-sm" onclick="loadLogsConsole()">🔄 Refresh</button>
                                <button class="btn-primary btn-sm btn-danger" onclick="clearLogsConsole()">🗑️ Clear Display</button>
                            </div>
                        </div>

                        <div id="terminal-logs" style="background: #060911; border: 1px solid var(--border-color); border-radius: 14px; padding: 20px; font-family: 'JetBrains Mono', monospace; font-size: 12.5px; color: #d1d5db; max-height: 520px; overflow-y: auto; line-height: 1.7; white-space: pre-wrap;">[SYSTEM] Memuat system logs...</div>
                    </div>
                </div>

                <!-- Tab 6: Dokumentasi API Integration -->
                <div class="tab-content" id="tab-docs">
                    <div class="panel-card">
                        <h3 style="font-size: 18px; font-weight: 700; color: var(--accent-cyan); margin-bottom: 12px;">
                            📖 Dokumentasi Integrasi REST API Multi-App
                        </h3>
                        <p style="font-size: 14px; color: var(--text-muted); margin-bottom: 24px; line-height: 1.6;">
                            Panduan integrasi REST API Gateway untuk toko online, bot Telegram, maupun aplikasi Pihak Ketiga. Setiap request API wajib melampirkan <code>app_id</code> dan <code>app_secret</code>.
                        </p>

                        <!-- Card 1: Auth Config -->
                        <div style="background: #111827; border: 1px solid var(--border-color); border-radius: 14px; padding: 20px; margin-bottom: 20px;">
                            <h4 style="font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 10px;">
                                🔐 1. Parameter Autentikasi API
                            </h4>
                            <ul style="font-size: 13px; color: #d1d5db; margin-left: 20px; line-height: 1.8;">
                                <li><code>app_id</code>: ID Unik aplikasi Anda (Wajib terdaftar pada <code>ALLOWED_APP_IDS</code> di <code>.env</code>).</li>
                                <li><code>app_secret</code>: Kunci rahasia global (Sesuai <code>APP_SECRET</code> di <code>.env</code>).</li>
                            </ul>
                            <div style="margin-top: 14px; background: rgba(56, 189, 248, 0.08); padding: 12px 16px; border-radius: 10px; border-left: 3px solid var(--accent-cyan); font-size: 13px; color: var(--text-muted);">
                                💡 <strong>Tips:</strong> Parameter dapat dikirim via <strong>HTTP Headers</strong> (<code>x-app-id</code> & <code>x-app-secret</code>), <strong>JSON Body</strong>, atau <strong>URL Query Parameters</strong>.
                            </div>
                        </div>

                        <!-- Card 2: Create QRIS Endpoint -->
                        <div style="background: #111827; border: 1px solid var(--border-color); border-radius: 14px; padding: 20px; margin-bottom: 20px;">
                            <h4 style="font-size: 15px; font-weight: 700; color: var(--accent-green); margin-bottom: 10px;">
                                ⚡ 2. Buat QRIS Dinamis (<code>POST /create-qris</code>)
                            </h4>
                            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">Mencetak QRIS EMVCo dinamis dengan penguncian nominal & kode unik otomatis.</p>
                            
                            <div style="font-size: 12px; font-weight: 700; color: var(--accent-cyan); margin-bottom: 4px;">🔑 HTTP Headers:</div>
                            <pre style="background: #0b0f19; border: 1px solid var(--border-color); padding: 10px 14px; border-radius: 8px; color: #38bdf8; font-size: 12px; margin-bottom: 12px;">Content-Type: application/json
x-app-id: App1
x-app-secret: secret123</pre>

                            <div style="font-size: 12px; font-weight: 700; color: var(--accent-cyan); margin-bottom: 4px;">📥 Request Body (JSON):</div>
                            <pre style="background: #0b0f19; border: 1px solid var(--border-color); padding: 10px 14px; border-radius: 8px; color: #a5f3fc; font-size: 12px; margin-bottom: 12px;">{
  "app_id": "App1",
  "app_secret": "secret123",
  "amount": 10000,
  "ref_id": "INV-20260828-0001",
  "webhook_url": "https://website-anda.com/api/callback",
  "expires_in_hours": 12
}</pre>

                            <div style="font-size: 12px; font-weight: 700; color: var(--accent-green); margin-bottom: 4px;">📤 Response Success (200 OK):</div>
                            <pre style="background: #0b0f19; border: 1px solid var(--border-color); padding: 10px 14px; border-radius: 8px; color: #4ade80; font-size: 12px; margin-bottom: 12px;">{
  "success": true,
  "data": {
    "qris_id": "QR-9C6TS3RC",
    "trx_id": "TRX-4UR9CRCC",
    "app_id": "App1",
    "client_ref_id": "INV-20260828-0001",
    "base_amount": 10000,
    "unique_code": 14,
    "amount": 10014,
    "qris_string": "000201010212...",
    "qris_image_url": "http://localhost:3000/qr/QR-9C6TS3RC.png",
    "qris_image_base64": "data:image/png;base64,iVBORw0KG...",
    "checkout_url": "http://localhost:3000/qr/QR-9C6TS3RC",
    "webhook_url": "https://website-anda.com/api/callback",
    "expires_at": "2026-08-28T22:00:00.000Z"
  }
}</pre>

                            <div style="font-size: 12px; font-weight: 700; color: var(--accent-red); margin-bottom: 4px;">❌ Response Error (400 Bad Request / 401 Unauthorized):</div>
                            <pre style="background: #0b0f19; border: 1px solid var(--border-color); padding: 10px 14px; border-radius: 8px; color: #f87171; font-size: 12px;">{
  "success": false,
  "message": "app_id wajib diisi & terdaftar di ALLOWED_APP_IDS"
}</pre>
                        </div>

                        <!-- Card 3: Check Status Endpoint -->
                        <div style="background: #111827; border: 1px solid var(--border-color); border-radius: 14px; padding: 20px; margin-bottom: 20px;">
                            <h4 style="font-size: 15px; font-weight: 700; color: var(--accent-cyan); margin-bottom: 10px;">
                                🔍 3. Public Polling Status Frontend (<code>GET /api/qr-status/:qris_id</code>)
                            </h4>
                            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">Endpoint publik ringan untuk polling halaman frontend checkout tanpa butuh secret key.</p>
                            
                            <div style="font-size: 12px; font-weight: 700; color: var(--accent-cyan); margin-bottom: 4px;">📥 URL Path Parameter:</div>
                            <pre style="background: #0b0f19; border: 1px solid var(--border-color); padding: 10px 14px; border-radius: 8px; color: #38bdf8; font-size: 12px; margin-bottom: 12px;">GET http://localhost:3000/api/qr-status/QR-9C6TS3RC</pre>

                            <div style="font-size: 12px; font-weight: 700; color: var(--accent-green); margin-bottom: 4px;">📤 Response Status LUNAS (PAID):</div>
                            <pre style="background: #0b0f19; border: 1px solid var(--border-color); padding: 10px 14px; border-radius: 8px; color: #4ade80; font-size: 12px;">{
  "success": true,
  "paid": true,
  "status": "PAID",
  "transaction": {
    "transaction_id": "01a03c85-...",
    "amount": 10014,
    "payer_issuer": "AirPay Shopee / BCA / GoPay",
    "payment_type": "QRIS",
    "transaction_time": "2026-08-28T10:15:00+07:00"
  }
}</pre>
                        </div>

                        <!-- Card 4: Webhook Payload -->
                        <div style="background: #111827; border: 1px solid var(--border-color); border-radius: 14px; padding: 20px; margin-bottom: 20px;">
                            <h4 style="font-size: 15px; font-weight: 700; color: #a855f7; margin-bottom: 10px;">
                                🔔 4. Skema Webhook Callback HTTP POST (<code>webhook_url</code>)
                            </h4>
                            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">Dikirim otomatis dari Gateway ke server Pihak Ketiga saat status pembayaran LUNAS.</p>
                            
                            <div style="font-size: 12px; font-weight: 700; color: #a855f7; margin-bottom: 4px;">🔑 HTTP Headers Callback:</div>
                            <pre style="background: #0b0f19; border: 1px solid var(--border-color); padding: 10px 14px; border-radius: 8px; color: #c084fc; font-size: 12px; margin-bottom: 12px;">Content-Type: application/json
User-Agent: GoPay-Gateway-Webhook-Worker/1.0</pre>

                            <div style="font-size: 12px; font-weight: 700; color: #a855f7; margin-bottom: 4px;">📥 Payload JSON Dikirimkan:</div>
                            <pre style="background: #0b0f19; border: 1px solid var(--border-color); padding: 10px 14px; border-radius: 8px; color: #e9d5ff; font-size: 12px;">{
  "event": "payment.success",
  "qris_id": "QR-9C6TS3RC",
  "trx_id": "TRX-4UR9CRCC",
  "client_ref_id": "INV-20260828-0001",
  "status": "PAID",
  "amount": 10014,
  "base_amount": 10000,
  "unique_code": 14,
  "transaction": {
    "transaction_id": "01a03c85-...",
    "amount": 10014,
    "payer_issuer": "AirPay Shopee / BCA",
    "transaction_time": "2026-08-28T10:15:00+07:00"
  }
}</pre>
                        </div>

                        <!-- Card 5: Check Payment Backend -->
                        <div style="background: #111827; border: 1px solid var(--border-color); border-radius: 14px; padding: 20px; margin-bottom: 20px;">
                            <h4 style="font-size: 15px; font-weight: 700; color: #f59e0b; margin-bottom: 10px;">
                                🔍 5. Cek Status Pembayaran Backend (<code>POST /api/check-payment</code>)
                            </h4>
                            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">Memeriksa status pembayaran dari server/backend Anda menggunakan API Secret.</p>
                            
                            <div style="font-size: 12px; font-weight: 700; color: #f59e0b; margin-bottom: 4px;">📥 Request Body (JSON):</div>
                            <pre style="background: #0b0f19; border: 1px solid var(--border-color); padding: 10px 14px; border-radius: 8px; color: #fde68a; font-size: 12px; margin-bottom: 12px;">{
  "app_id": "App1",
  "app_secret": "secret123",
  "qris_id": "QR-9C6TS3RC"
}</pre>

                            <div style="font-size: 12px; font-weight: 700; color: var(--accent-green); margin-bottom: 4px;">📤 Response JSON:</div>
                            <pre style="background: #0b0f19; border: 1px solid var(--border-color); padding: 10px 14px; border-radius: 8px; color: #4ade80; font-size: 12px;">{
  "success": true,
  "paid": true,
  "status": "PAID",
  "amount": 10014,
  "client_ref_id": "INV-20260828-0001",
  "paid_at": "2026-08-28T10:15:00+07:00"
}</pre>
                        </div>

                        <!-- Card 6: Get Orders & Transactions -->
                        <div style="background: #111827; border: 1px solid var(--border-color); border-radius: 14px; padding: 20px; margin-bottom: 20px;">
                            <h4 style="font-size: 15px; font-weight: 700; color: #38bdf8; margin-bottom: 10px;">
                                📊 6. Endpoint Data Transaksi & Order
                            </h4>
                            <ul style="font-size: 13px; color: #d1d5db; margin-left: 20px; line-height: 1.8;">
                                <li><code>GET /api/orders?limit=50&api_key=secret123</code> — Daftar seluruh order QRIS.</li>
                                <li><code>GET /transactions?pageSize=50&api_key=admin123456</code> — Mutasi terdeteksi dari GoJek API.</li>
                                <li><code>GET /api/webhooks?limit=50&api_key=secret123</code> — Log antrian webhook delivery.</li>
                                <li><code>GET /api/logs?api_key=admin123456</code> — Real-time system log monitoring console.</li>
                                <li><code>POST /api/orders/clear</code> (Header: <code>x-api-key: admin123456</code>) — Reset seluruh data order.</li>
                            </ul>
                        </div>
                    </div>
                </div>

            </div>
        </main>
    </div>

    <!-- Modal Jodohkan Transaksi -->
    <div id="modal-jodohkan" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); backdrop-filter:blur(8px); z-index:9999; align-items:center; justify-content:center;">
        <div style="background: var(--bg-card); border:1px solid var(--border-color); border-radius:20px; width:90%; max-width:440px; padding:28px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);">
            <h3 style="font-size:18px; font-weight:700; margin-bottom:8px; color:#fff;">🔗 Jodohkan Transaksi Manual</h3>
            <p style="font-size:13px; color:var(--text-muted); margin-bottom:20px;" id="modal-tx-info">Transaction ID GoJek: -</p>
            
            <div class="form-group">
                <label for="modal-inp-qris">Masukkan Target QRIS ID (Order ID)</label>
                <input type="text" id="modal-inp-qris" placeholder="Contoh: 1df8tasv atau QR-ODHFMJIW...">
            </div>

            <div style="display:flex; gap:12px; justify-content:flex-end; margin-top:24px;">
                <button class="btn-primary btn-sm" style="background:#374151; box-shadow:none;" onclick="closeJodohkanModal()">Batal</button>
                <button class="btn-primary btn-sm" id="btn-modal-submit" onclick="submitJodohkanModal()">💾 Simpan & Jodohkan</button>
            </div>
        </div>
    </div>

    <!-- Modal Popup QRIS Created Result -->
    <div id="modal-qris-created" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); backdrop-filter:blur(8px); z-index:9999; align-items:center; justify-content:center;">
        <div style="background: var(--bg-card); border:1px solid rgba(56, 189, 248, 0.4); border-radius:20px; width:90%; max-width:440px; padding:28px; text-align:center; box-shadow:0 25px 50px -12px rgba(0,0,0,0.7); position:relative;">
            <button onclick="closeQrisModal()" style="position:absolute; top:16px; right:16px; background:none; border:none; color:var(--text-muted); font-size:22px; cursor:pointer;">✕</button>
            
            <div style="font-size: 13px; font-weight: 700; color: var(--accent-green); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">🎉 Order QRIS Berhasil Dibuat!</div>
            <h3 id="modal-qris-amount" style="font-size: 26px; font-weight: 800; color: #fff; margin: 0 0 16px 0;">Rp 0</h3>

            <div style="background: #fff; padding: 16px; border-radius: 14px; display: inline-block; margin-bottom: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);">
                <img id="modal-qris-qrimg" style="width: 220px; height: 220px; display: block;" alt="QRIS Code">
            </div>

            <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px; text-align: left; font-size: 12.5px; margin-bottom: 20px; line-height: 1.7;">
                <div>🆔 <strong>QRIS ID</strong>: <span id="modal-qris-id" style="font-family: 'JetBrains Mono', monospace; color: var(--accent-cyan); font-weight: 700;"></span></div>
                <div>🔢 <strong>Nominal Unik Akhir</strong>: <span id="modal-qris-unique" style="color: #f59e0b; font-weight: 800;"></span></div>
                <div>🏷️ <strong>Ref ID</strong>: <span id="modal-qris-ref" style="color: var(--text-muted);"></span></div>
                <div>🔗 <strong>Halaman Checkout</strong>: <a id="modal-qris-link" href="#" target="_blank" style="color: var(--accent-cyan); word-break: break-all; font-size: 11.5px;"></a></div>
            </div>

            <div style="display: flex; gap: 12px;">
                <button class="btn-primary" onclick="copyQrisLink()" style="flex: 1; background: rgba(56, 189, 248, 0.15); border: 1px solid var(--accent-cyan); color: var(--accent-cyan); font-weight: 600;">📋 Copy Link</button>
                <button class="btn-primary" onclick="openQrisCheckoutLink()" style="flex: 1; background: linear-gradient(135deg, #0284c7, #0369a1); font-weight: 600;">🔗 Buka Checkout</button>
            </div>
        </div>
    </div>

    <script>
        let adminPass = localStorage.getItem('admin_pass') || sessionStorage.getItem('admin_pass') || '';
        let autoLogsTimer = null;
        let isAutoLogsOn = true;
        let cachedLogsData = [];

        function showAlert(type, text) {
            const errBox = document.getElementById('msg-error');
            const succBox = document.getElementById('msg-success');
            errBox.style.display = 'none';
            succBox.style.display = 'none';

            if (type === 'error') {
                errBox.innerText = text;
                errBox.style.display = 'block';
            } else {
                succBox.innerText = text;
                succBox.style.display = 'block';
            }
        }

        const pageMeta = {
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
                document.getElementById('header-page-title').innerText = pageMeta[tabName].title;
                document.getElementById('header-page-subtitle').innerText = pageMeta[tabName].subtitle;
            }

            if (tabName !== 'logs' && autoLogsTimer) {
                clearInterval(autoLogsTimer);
                autoLogsTimer = null;
            }

            if (tabName === 'orders') loadOrdersTable();
            if (tabName === 'webhooks') loadWebhooksTable();
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
            location.reload();
        }

        async function unlockAdmin() {
            const pass = document.getElementById('inp-admin-pass').value.trim();
            if (!pass) {
                showAlert('error', 'Masukkan Password Admin terlebih dahulu.');
                return;
            }

            const btn = document.getElementById('btn-unlock');
            const spin = document.getElementById('spin-lock');
            const lbl = document.getElementById('lbl-lock');

            btn.disabled = true;
            spin.style.display = 'inline-block';
            lbl.innerText = 'Memverifikasi...';

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
                    document.getElementById('section-admin-lock').style.display = 'none';
                    document.getElementById('section-dashboard').classList.add('active');
                    
                    switchTabByName('orders');
                } else {
                    localStorage.removeItem('admin_pass');
                    sessionStorage.removeItem('admin_pass');
                    adminPass = '';
                    showAlert('error', data.message || 'Password Admin Salah');
                }
            } catch (err) {
                showAlert('error', 'Error: ' + err.message);
            } finally {
                btn.disabled = false;
                spin.style.display = 'none';
                lbl.innerText = '🔑 Masuk ke Portal Admin';
            }
        }

        if (adminPass) {
            document.getElementById('inp-admin-pass').value = adminPass;
            unlockAdmin();
        }

        async function loadLogsConsole() {
            const container = document.getElementById('terminal-logs');
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
            const selectedLevel = document.getElementById('select-log-level').value;
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
                btn.style.background = 'rgba(34,197,94,0.15)';
                btn.style.borderColor = 'rgba(34,197,94,0.3)';
                btn.style.color = 'var(--accent-green)';
                btn.innerText = '⚡ Auto Refresh (ON)';
                loadLogsConsole();
                if (!autoLogsTimer) autoLogsTimer = setInterval(loadLogsConsole, 3000);
            } else {
                btn.style.background = 'rgba(100,116,139,0.15)';
                btn.style.borderColor = 'rgba(100,116,139,0.3)';
                btn.style.color = 'var(--text-muted)';
                btn.innerText = '⏸️ Auto Refresh (OFF)';
                if (autoLogsTimer) {
                    clearInterval(autoLogsTimer);
                    autoLogsTimer = null;
                }
            }
        }

        function clearLogsConsole() {
            document.getElementById('terminal-logs').innerText = '(Tampilan log di-cleared)';
        }

        function escapeHtml(text) {
            return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        async function loadOrdersTable() {
            const tbody = document.getElementById('tbody-orders');
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Memuat data order...</td></tr>';
            try {
                const res = await fetch('/api/orders?limit=50&api_key=' + encodeURIComponent(adminPass));
                const data = await res.json();
                if (data.success && data.data) {
                    if (data.data.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Belum ada data order QRIS.</td></tr>';
                        return;
                    }
                    tbody.innerHTML = data.data.map(function(o) {
                        var statusTag = o.status === 'PAID' ? '<span class="tag tag-paid">🟢 PAID</span>' : (o.status === 'EXPIRED' ? '<span class="tag tag-expired">🔴 EXPIRED</span>' : '<span class="tag tag-pending">🟡 PENDING</span>');
                        var whTag = o.webhookStatus === 'SUCCESS' ? '<span class="tag tag-success">🟢 SUCCESS</span>' : (o.webhookStatus === 'FAILED' ? '<span class="tag tag-failed">🔴 FAILED</span>' : (o.webhookStatus === 'QUEUED' || o.webhookStatus === 'PENDING' ? '<span class="tag tag-pending">🟡 QUEUED</span>' : '<span style="color:#64748b;">-</span>'));
                        var fmtAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(o.amount);
                        var fmtDate = new Date(o.createdAt).toLocaleString('id-ID');
                        var claimBtn = (o.status !== 'PAID') 
                            ? '<button class="btn-primary btn-sm" onclick="manualClaimOrder(\\\'' + o.qrisId + '\\\')" style="background:#16a34a; font-size:11px; padding:4px 8px; margin-left:6px;">✅ Validasi Manual</button>' 
                            : '';
                        return '<tr>' +
                            '<td><strong>' + o.qrisId + '</strong></td>' +
                            '<td><span class="tag" style="background:rgba(56,189,248,0.15); color:var(--accent-cyan); border:1px solid rgba(56,189,248,0.3);">' + (o.appId || 'default') + '</span></td>' +
                            '<td>' + (o.clientRefId || '-') + '</td>' +
                            '<td>' + fmtAmount + ' <small style="color:var(--text-muted);">(Unik: +' + o.uniqueCode + ')</small></td>' +
                            '<td>' + statusTag + '</td>' +
                            '<td>' + whTag + '</td>' +
                            '<td>' + fmtDate + '</td>' +
                            '<td><a href="/qr/' + o.qrisId + '" target="_blank" style="color:var(--accent-cyan); text-decoration:none; font-weight:600;">🔗 Lihat QR</a> ' + claimBtn + '</td>' +
                        '</tr>';
                    }).join('');
                }
            } catch (e) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--accent-red);">Gagal memuat order: ' + e.message + '</td></tr>';
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

        let currentJodohkanTxId = '';

        function promptLinkToQris(txId) {
            currentJodohkanTxId = txId;
            document.getElementById('modal-tx-info').innerText = 'Transaction ID GoJek: ' + txId;
            document.getElementById('modal-inp-qris').value = '';
            document.getElementById('modal-jodohkan').style.display = 'flex';
        }

        function closeJodohkanModal() {
            document.getElementById('modal-jodohkan').style.display = 'none';
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

        async function loadWebhooksTable() {
            const tbody = document.getElementById('tbody-webhooks');
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
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Memuat mutasi GoJek...</td></tr>';
            try {
                const res = await fetch('/transactions?pageSize=50&api_key=' + encodeURIComponent(adminPass));
                const data = await res.json();
                if (data.success && data.data) {
                    document.getElementById('val-total-tx').innerText = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(data.total_amount || 0);
                    if (data.data.transactions.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Belum ada transaksi mutasi GoJek.</td></tr>';
                        return;
                    }
                    tbody.innerHTML = data.data.transactions.map(function(t) {
                        var fmtAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(t.amount);
                        var fmtDate = t.time ? new Date(t.time).toLocaleString('id-ID') : '-';
                        var linkBtn = (!t.qris_id) ? '<button class="btn-primary btn-sm" onclick="promptLinkToQris(\\\'' + t.transaction_id + '\\\')" style="font-size:11px; padding:3px 8px; margin-left:6px;">🔗 Jodohkan</button>' : '';
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

        async function requestOTP() {
            const phone = document.getElementById('inp-phone').value.trim();
            if (!phone) {
                showAlert('error', 'Silakan masukkan nomor HP GoBiz Anda terlebih dahulu.');
                return;
            }

            const btn = document.getElementById('btn-otp');
            const spin = document.getElementById('spin-1');
            const lbl = document.getElementById('lbl-1');

            btn.disabled = true;
            spin.style.display = 'inline-block';
            lbl.innerText = 'Mengirim OTP...';

            try {
                const res = await fetch('/api/login/request-otp', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'x-admin-password': adminPass 
                    },
                    body: JSON.stringify({ phone: phone, admin_password: adminPass })
                });
                const data = await res.json();

                if (data.success) {
                    showAlert('success', data.message);
                    document.getElementById('step-1').style.display = 'none';
                    document.getElementById('step-2').style.display = 'block';
                    startResendCountdown();
                } else {
                    showAlert('error', data.message || 'Gagal mengirimkan OTP');
                }
            } catch (err) {
                showAlert('error', 'Error: ' + err.message);
            } finally {
                btn.disabled = false;
                spin.style.display = 'none';
                lbl.innerText = '📱 Kirim Kode OTP (SMS/WA)';
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

            btn.disabled = true;
            spin.style.display = 'inline-block';
            lbl.innerText = 'Memverifikasi...';

            try {
                const res = await fetch('/api/login/verify-otp', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'x-admin-password': adminPass
                    },
                    body: JSON.stringify({ otp_code: otp, admin_password: adminPass })
                });
                const data = await res.json();

                if (data.success) {
                    showAlert('success', data.message);
                    document.getElementById('session-badge').className = 'status-badge status-active';
                    document.getElementById('status-icon').innerText = '🟢';
                    document.getElementById('status-text').innerText = 'Sesi GoPay Merchant Aktif & Siap Menerima Order';
                    setTimeout(() => location.reload(), 1500);
                } else {
                    showAlert('error', data.message || 'Kode OTP Salah');
                }
            } catch (err) {
                showAlert('error', 'Error: ' + err.message);
            } finally {
                btn.disabled = false;
                spin.style.display = 'none';
                lbl.innerText = '✅ Verifikasi & Aktifkan Sesi';
            }
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

        async function loadStaticQrisConfig() {
            try {
                const res = await fetch('/api/settings/qris');
                const data = await res.json();
                if (data.success && data.qris_string) {
                    const el = document.getElementById('inp-static-qris');
                    if (el) el.value = data.qris_string;
                }
            } catch (e) {}
        }

        async function saveStaticQrisConfig() {
            const qrisStr = (document.getElementById('inp-static-qris')?.value || '').trim();
            if (!qrisStr) {
                showAlert('error', 'Silakan masukkan String Kode QRIS Statis Merchant.');
                return;
            }

            const btn = document.getElementById('btn-save-qris');
            if (btn) {
                btn.disabled = true;
                btn.innerText = 'Menyimpan ke Database PostgreSQL...';
            }

            try {
                const res = await fetch('/api/settings/qris', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-password': adminPass
                    },
                    body: JSON.stringify({ qris_string: qrisStr, admin_password: adminPass })
                });
                const data = await res.json();
                if (data.success) {
                    showAlert('success', data.message);
                } else {
                    showAlert('error', data.message || 'Gagal menyimpan QRIS ke Database');
                }
            } catch (err) {
                showAlert('error', 'Error: ' + err.message);
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerText = '💾 Simpan String QRIS ke Database PostgreSQL';
                }
            }
        }

        let selectedQrisImgElement = null;

        function previewQrisImage(evt) {
            const file = evt.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const previewImg = document.getElementById('qris-preview-img');
                const previewContainer = document.getElementById('qris-preview-container');
                const parsedBox = document.getElementById('qris-parsed-info');
                
                if (previewImg && previewContainer) {
                    previewImg.src = e.target.result;
                    previewContainer.style.display = 'block';
                    if (parsedBox) parsedBox.style.display = 'none';
                    selectedQrisImgElement = previewImg;
                    showAlert('info', 'Gambar QRIS berhasil dipilih! Klik tombol "🔍 Pindai & Ekstrak Kode QRIS" untuk memproses.');
                }
            };
            reader.readAsDataURL(file);
        }

        async function processScanSelectedImage() {
            if (!selectedQrisImgElement || !selectedQrisImgElement.src) {
                showAlert('error', 'Silakan pilih gambar poster QRIS terlebih dahulu.');
                return;
            }

            const btn = document.getElementById('btn-scan-qris');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '⏳ Memindai Kode QR...';
            }

            try {
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
                        const el = document.getElementById('inp-static-qris');
                        if (el) el.value = qrisText;
                        
                        const parsedBox = document.getElementById('qris-parsed-info');
                        const parsedDetails = document.getElementById('qris-parsed-details');
                        if (parsedBox && parsedDetails) {
                            parsedBox.style.display = 'block';
                            parsedDetails.innerHTML = '<div>📱 <strong>String QRIS (EMVCo)</strong>: <code style="color: var(--accent-cyan); font-size: 11.5px; font-family: monospace;">' + qrisText.slice(0, 45) + '...' + qrisText.slice(-20) + '</code></div>';
                        }

                        showAlert('success', 'Kode QRIS Berhasil Dipindai! Menyimpan string ke Database PostgreSQL...');
                        await saveStaticQrisConfig();
                    } else {
                        showAlert('error', 'Gagal membaca QR Code dari gambar. Pastikan gambar jelas & tidak buram.');
                    }

                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = '🔍 Pindai & Ekstrak Kode QRIS';
                    }
                };
                img.src = selectedQrisImgElement.src;
            } catch (err) {
                showAlert('error', 'Error: ' + err.message);
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '🔍 Pindai & Ekstrak Kode QRIS';
                }
            }
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
            const amount = document.getElementById('inp-gen-amount')?.value;
            const refId = document.getElementById('inp-gen-ref')?.value?.trim();
            const hours = document.getElementById('inp-gen-hours')?.value || 12;
            const webhook = document.getElementById('inp-gen-webhook')?.value?.trim();

            if (!amount || isNaN(amount) || parseInt(amount) < 1) {
                showAlert('error', 'Silakan masukkan Nominal Pembayaran (amount) minimal Rp 1.');
                return;
            }

            const btn = document.getElementById('btn-generate-qris');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '⏳ Menghasilkan QRIS Dinamis...';
            }

            try {
                const payload = {
                    amount: parseInt(amount),
                    app_id: 'admin',
                    admin_password: adminPass,
                    expires_in_hours: parseFloat(hours)
                };
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
                    showAlert('success', 'Order QRIS Dinamis berhasil dibuat!');
                    
                    const checkoutUrl = data.checkout_url || (location.origin + '/qr-checkout/' + data.qris_id);
                    activeGeneratedQrisUrl = checkoutUrl;

                    const formattedAmt = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(data.amount);
                    document.getElementById('modal-qris-amount').innerText = formattedAmt;
                    document.getElementById('modal-qris-qrimg').src = data.qr_image_url || ('/qr-checkout/' + data.qris_id + '.png');
                    document.getElementById('modal-qris-id').innerText = data.qris_id;
                    document.getElementById('modal-qris-unique').innerText = 'Rp ' + new Intl.NumberFormat('id-ID').format(data.amount) + ' (Kode Unik: ' + (data.unique_code || '-') + ')';
                    document.getElementById('modal-qris-ref').innerText = data.client_ref_id || '-';
                    
                    const linkEl = document.getElementById('modal-qris-link');
                    if (linkEl) {
                        linkEl.href = checkoutUrl;
                        linkEl.innerText = checkoutUrl;
                    }

                    document.getElementById('modal-qris-created').style.display = 'flex';

                    document.getElementById('inp-gen-amount').value = '';
                    document.getElementById('inp-gen-ref').value = '';
                    loadOrdersTable();
                } else {
                    showAlert('error', data.message || 'Gagal membuat QRIS Dinamis');
                }
            } catch (err) {
                showAlert('error', 'Error: ' + err.message);
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '✨ Generate Kode QRIS Pembayaran Baru';
                }
            }
        }

        function closeQrisModal() {
            document.getElementById('modal-qris-created').style.display = 'none';
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

        setTimeout(loadStaticQrisConfig, 500);
    </script>
</body>
</html>`;
}

module.exports = {
    renderAdminDashboard
};
