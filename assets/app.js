/* ============================================
   CHUM VÉ SỐ — App Logic
   ============================================ */
const App = (() => {
    'use strict';

    /* ---- Constants ---- */
    const CORS_PROXIES = [
        url => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];
    const XSKT_BASE = 'https://xskt.com.vn';
    const STORAGE = { theme: 'chum-veso-theme', history: 'chum-veso-history' };
    const PRIZE_NAMES = {
        db: 'Đặc Biệt', g1: 'Giải Nhất', g2: 'Giải Nhì', g3: 'Giải Ba',
        g4: 'Giải Tư', g5: 'Giải Năm', g6: 'Giải Sáu', g7: 'Giải Bảy', g8: 'Giải Tám'
    };
    const PRIZE_ORDER = ['g8', 'g7', 'g6', 'g5', 'g4', 'g3', 'g2', 'g1', 'db'];
    const PRIZE_DISPLAY = ['db', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8'];
    const DAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

    /* ---- State ---- */
    let currentResults = null;
    let history = [];

    /* ---- DOM Helpers ---- */
    const $ = s => document.querySelector(s);
    const $$ = s => document.querySelectorAll(s);

    /* ==============================
       INITIALIZATION
       ============================== */
    function init() {
        loadTheme();
        loadHistory();
        setupDatePickers();
        setupEvents();
        renderHistory();
        loadResults();
    }

    function setupEvents() {
        // Tabs
        $$('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
        // Theme
        $('#themeToggle').addEventListener('click', toggleTheme);
        // Load results
        $('#loadResultsBtn').addEventListener('click', loadResults);
        // Quick dates
        $$('.chip[data-offset]').forEach(chip => {
            chip.addEventListener('click', () => quickDate(parseInt(chip.dataset.offset)));
        });
        // Check tickets
        $('#checkTicketsBtn').addEventListener('click', checkTickets);
        // Clear history
        $('#clearHistoryBtn').addEventListener('click', clearHistory);
    }

    /* ==============================
       THEME
       ============================== */
    function loadTheme() {
        applyTheme(localStorage.getItem(STORAGE.theme) || 'dark');
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const icon = $('#themeIcon');
        if (icon) icon.textContent = theme === 'dark' ? '🌙' : '☀️';
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = theme === 'dark' ? '#1a1a2e' : '#e4e9f0';
        localStorage.setItem(STORAGE.theme, theme);
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        applyTheme(current === 'dark' ? 'light' : 'dark');
    }

    /* ==============================
       TAB NAVIGATION
       ============================== */
    function switchTab(name) {
        $$('.tab-btn').forEach(b => {
            const active = b.dataset.tab === name;
            b.classList.toggle('active', active);
            b.setAttribute('aria-selected', active);
        });
        $$('.tab-content').forEach(c => c.classList.toggle('active', c.id === `content-${name}`));
    }

    /* ==============================
       DATE HELPERS
       ============================== */
    function setupDatePickers() {
        const today = fmtInput(new Date());
        ['#resultDate', '#checkDate'].forEach(sel => {
            const el = $(sel);
            if (el) { el.value = today; el.max = today; }
        });
    }

    function fmtInput(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function fmtDisplay(s) { const p = s.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; }
    function fmtUrl(s) { const p = s.split('-'); return `${p[2]}-${p[1]}-${p[0]}`; }

    function quickDate(offset) {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        $('#resultDate').value = fmtInput(d);
        loadResults();
    }

    /* ==============================
       DATA FETCHING
       ============================== */
    async function fetchWithProxy(url) {
        for (let i = 0; i < CORS_PROXIES.length; i++) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 15000);
                const resp = await fetch(CORS_PROXIES[i](url), { signal: controller.signal });
                clearTimeout(timeout);
                if (!resp.ok) continue;
                let text;
                try {
                    const json = await resp.json();
                    text = json.contents || JSON.stringify(json);
                } catch {
                    text = await resp.text();
                }
                if (text && text.length > 200) return text;
            } catch (e) {
                console.warn(`Proxy ${i} failed:`, e.message);
            }
        }
        throw new Error('Không thể kết nối nguồn dữ liệu');
    }

    async function fetchXSMN(dateStr) {
        const url = `${XSKT_BASE}/ket-qua/mien-nam-xsmn-${fmtUrl(dateStr)}.html`;
        const html = await fetchWithProxy(url);
        return parseXSMN(html, dateStr);
    }

    /* ==============================
       PARSING
       ============================== */
    function parseXSMN(html, dateStr) {
        const doc = new DOMParser().parseFromString(html, 'text/html');

        /* Find the main results table */
        let table = null;
        for (const t of doc.querySelectorAll('table')) {
            const txt = t.textContent;
            if ((txt.includes('ĐB') || txt.includes('G.1') || txt.includes('Đặc')) && txt.match(/\d{5,6}/)) {
                table = t;
                break;
            }
        }
        if (!table) table = doc.querySelector('.table-result, .ta_border, .kqsx-mt, .div_kqsx table');
        if (!table) return extractFallback(html, dateStr);

        const rows = table.querySelectorAll('tr');
        if (rows.length < 3) return extractFallback(html, dateStr);

        /* Province names from first row */
        const hCells = rows[0].querySelectorAll('td, th');
        const provinces = [];
        for (let i = 1; i < hCells.length; i++) {
            const name = hCells[i].textContent.trim().replace(/\s+/g, ' ');
            if (name) provinces.push({ name, prizes: {} });
        }
        if (!provinces.length) return extractFallback(html, dateStr);

        /* Parse prize rows */
        for (let r = 1; r < rows.length; r++) {
            const cells = rows[r].querySelectorAll('td, th');
            if (cells.length < 2) continue;
            const label = cells[0].textContent.trim().toLowerCase().replace(/\s/g, '');
            const key = parsePrizeKey(label, r - 1);
            if (!key) continue;
            for (let c = 1; c < cells.length && c - 1 < provinces.length; c++) {
                const nums = extractNums(cells[c]);
                if (nums.length) provinces[c - 1].prizes[key] = nums;
            }
        }

        const results = provinces
            .filter(p => Object.keys(p.prizes).length > 0)
            .map(p => ({ province: p.name, date: dateStr, prizes: p.prizes }));
        return results.length ? results : extractFallback(html, dateStr);
    }

    function parsePrizeKey(label, rowIdx) {
        if (/đb|đặcbiệt|db/.test(label)) return 'db';
        for (let i = 1; i <= 8; i++) {
            if (label.includes(`g.${i}`) || label.includes(`g${i}`) || label === `giải${i}`) return `g${i}`;
        }
        if (rowIdx < PRIZE_ORDER.length) return PRIZE_ORDER[rowIdx];
        return null;
    }

    function extractNums(cell) {
        return cell.textContent.trim().split(/[\s,\-\|\/]+/).filter(p => /^\d{2,6}$/.test(p.trim())).map(p => p.trim());
    }

    function extractFallback(html, dateStr) {
        /* Last-resort: regex-extract numbers from HTML */
        const six = [...new Set((html.match(/\b\d{6}\b/g) || []))];
        const five = [...new Set((html.match(/\b\d{5}\b/g) || []))];
        if (six.length === 0 && five.length === 0) return [];

        const prizes = {};
        if (six.length) prizes.db = six.slice(0, 4);
        if (five.length > 0) prizes.g1 = five.slice(0, 1);
        if (five.length > 1) prizes.g2 = five.slice(1, 2);
        if (five.length > 3) prizes.g3 = five.slice(2, 4);
        if (five.length > 10) prizes.g4 = five.slice(4, 11);

        const day = new Date(dateStr).getDay();
        const sched = {
            1: ['TP.HCM', 'Đồng Tháp', 'Cà Mau'], 2: ['Bến Tre', 'Vũng Tàu', 'Bạc Liêu'],
            3: ['Đồng Nai', 'Cần Thơ', 'Sóc Trăng'], 4: ['Tây Ninh', 'An Giang', 'Bình Thuận'],
            5: ['Vĩnh Long', 'Bình Dương', 'Trà Vinh'],
            6: ['TP.HCM', 'Long An', 'Bình Phước', 'Hậu Giang'],
            0: ['Tiền Giang', 'Kiên Giang', 'Đà Lạt']
        };
        const label = (sched[day] || ['XSMN']).join(' - ');
        return [{ province: label, date: dateStr, prizes }];
    }

    /* ==============================
       RESULTS DISPLAY
       ============================== */
    async function loadResults() {
        const dateStr = $('#resultDate').value;
        if (!dateStr) { showStatus('Vui lòng chọn ngày', 'error'); return; }

        const loading = $('#resultsLoading');
        const container = $('#resultsContainer');
        const status = $('#resultsStatus');
        loading.style.display = 'flex';
        container.innerHTML = '';
        status.style.display = 'none';

        try {
            const results = await fetchXSMN(dateStr);
            currentResults = results;
            loading.style.display = 'none';

            if (!results || !results.length) {
                showStatus(`Không tìm thấy kết quả cho ngày ${fmtDisplay(dateStr)}. Có thể chưa có hoặc không phải ngày xổ.`, 'info');
                return;
            }

            const dow = new Date(dateStr).getDay();
            let html = `<div class="results-summary">📊 <strong>${DAY_NAMES[dow]}</strong>, ${fmtDisplay(dateStr)} — ${results.length} đài</div>`;
            results.forEach(r => { html += renderProvince(r); });
            container.innerHTML = html;
        } catch (err) {
            loading.style.display = 'none';
            showStatus(`Không thể tải kết quả. ${err.message}`, 'error');
        }
    }

    function renderProvince(result, matched) {
        let rows = '';
        for (const key of PRIZE_DISPLAY) {
            const nums = result.prizes[key];
            if (!nums || !nums.length) continue;
            const special = key === 'db';
            const label = key === 'db' ? 'ĐB' : key.toUpperCase().replace('G', 'G.');
            const numsHtml = nums.map(n => {
                if (matched && matched.has(n)) return `<span class="matched">${n}</span>`;
                return n;
            }).join('&ensp;');
            rows += `<tr><td class="prize-label${special ? ' special' : ''}">${label}</td><td class="prize-numbers${special ? ' special' : ''}">${numsHtml}</td></tr>`;
        }
        return `<div class="province-card">
            <div class="province-header"><span class="province-name">🏛️ ${result.province}</span><span class="province-date">${fmtDisplay(result.date)}</span></div>
            <table class="results-table">${rows}</table></div>`;
    }

    function showStatus(msg, type) {
        const s = $('#resultsStatus');
        const icons = { error: '⚠️', success: '✅', info: 'ℹ️' };
        s.className = `status-message ${type}`;
        s.innerHTML = `${icons[type] || ''} ${msg}`;
        s.style.display = 'flex';
    }

    /* ==============================
       NUMBER CHECKING
       ============================== */
    async function checkTickets() {
        const raw = $('#userNumbers').value.trim();
        const digits = parseInt($('#checkDigits').value);
        const dateStr = $('#checkDate').value;

        if (!raw) { showCheckMsg('Vui lòng nhập số vé cần dò', 'error'); return; }
        if (!dateStr) { showCheckMsg('Vui lòng chọn ngày xổ', 'error'); return; }

        const userNums = raw.split(/[\n,;\s]+/).map(n => n.trim()).filter(n => /^\d{2,}$/.test(n));
        if (!userNums.length) { showCheckMsg('Số vé không hợp lệ.', 'error'); return; }

        const loadEl = $('#checkLoading');
        const resEl = $('#checkResults');
        loadEl.style.display = 'flex';
        resEl.innerHTML = '';

        try {
            let results = currentResults;
            if (!results || !results.length || results[0].date !== dateStr) {
                results = await fetchXSMN(dateStr);
            }
            loadEl.style.display = 'none';

            if (!results || !results.length) {
                showCheckMsg(`Không tìm thấy kết quả cho ngày ${fmtDisplay(dateStr)}`, 'info');
                return;
            }

            let html = '';
            let anyMatch = false;
            const entry = { date: dateStr, checkedAt: new Date().toISOString(), numbers: userNums, digits, matches: [] };

            for (const num of userNums) {
                const matches = findMatches(num, results, digits);
                if (matches.length) anyMatch = true;
                entry.matches.push({ number: num, matched: matches });

                html += `<div class="check-result-card"><div class="match-header">
                    <span class="match-number">${num}</span>
                    <span class="match-badge ${matches.length ? 'win' : 'lose'}">${matches.length ? `🎉 Trúng ${matches.length} giải` : '❌ Không trúng'}</span>
                    </div>`;
                if (matches.length) {
                    html += '<div class="match-details">';
                    matches.forEach(m => {
                        html += `<div class="match-detail-item"><span class="prize-tag">${PRIZE_NAMES[m.prize] || m.prize}</span><span>${m.number}</span><span class="province-tag">${m.province}</span></div>`;
                    });
                    html += '</div>';
                }
                html += '</div>';
            }
            resEl.innerHTML = html;
            saveToHistory(entry);
        } catch (err) {
            loadEl.style.display = 'none';
            showCheckMsg(`Lỗi khi dò số: ${err.message}`, 'error');
        }
    }

    function findMatches(userNum, results, digits) {
        const suffix = userNum.slice(-digits);
        const matches = [];
        for (const r of results) {
            for (const [key, nums] of Object.entries(r.prizes)) {
                for (const n of nums) {
                    if (n.slice(-digits) === suffix) {
                        matches.push({ prize: key, number: n, province: r.province });
                    }
                }
            }
        }
        return matches;
    }

    function showCheckMsg(msg, type) {
        const el = $('#checkResults');
        const icons = { error: '⚠️', info: 'ℹ️' };
        el.innerHTML = `<div class="status-message ${type}">${icons[type] || ''} ${msg}</div>`;
    }

    /* ==============================
       HISTORY
       ============================== */
    function loadHistory() {
        try { history = JSON.parse(localStorage.getItem(STORAGE.history) || '[]'); } catch { history = []; }
    }

    function saveHistory() {
        localStorage.setItem(STORAGE.history, JSON.stringify(history.slice(0, 50)));
    }

    function saveToHistory(entry) {
        history.unshift(entry);
        saveHistory();
        renderHistory();
    }

    function renderHistory() {
        const container = $('#historyContainer');
        const emptyEl = $('#historyEmpty');
        const clearBtn = $('#clearHistoryBtn');

        if (!history.length) {
            container.innerHTML = '';
            emptyEl.style.display = 'block';
            clearBtn.style.display = 'none';
            return;
        }

        emptyEl.style.display = 'none';
        clearBtn.style.display = 'block';

        let html = '';
        history.forEach((entry, idx) => {
            const totalMatches = entry.matches.reduce((sum, m) => sum + m.matched.length, 0);
            const hasMatch = totalMatches > 0;
            const checkedDate = new Date(entry.checkedAt);
            const timeStr = `${checkedDate.toLocaleDateString('vi-VN')} ${checkedDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;

            html += `<div class="history-item">
                <div class="history-meta">
                    <span class="history-date">🕐 ${timeStr} • Ngày xổ: ${fmtDisplay(entry.date)}</span>
                    <button class="history-delete" data-idx="${idx}" aria-label="Xóa" title="Xóa mục này">✕</button>
                </div>
                <div class="history-numbers">🎫 ${entry.numbers.join(', ')} (${entry.digits} số cuối)</div>
                <span class="history-status ${hasMatch ? 'has-match' : 'no-match'}">${hasMatch ? `🎉 Trúng ${totalMatches} giải` : '❌ Không trúng'}</span>`;

            if (hasMatch) {
                html += '<div class="history-matches">';
                entry.matches.forEach(m => {
                    m.matched.forEach(mt => {
                        html += `${m.number} → ${PRIZE_NAMES[mt.prize] || mt.prize} (${mt.province})<br>`;
                    });
                });
                html += '</div>';
            }
            html += '</div>';
        });

        container.innerHTML = html;

        /* Delete buttons */
        container.querySelectorAll('.history-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                history.splice(parseInt(btn.dataset.idx), 1);
                saveHistory();
                renderHistory();
            });
        });
    }

    function clearHistory() {
        if (!confirm('Xóa toàn bộ lịch sử dò số?')) return;
        history = [];
        saveHistory();
        renderHistory();
    }

    /* ==============================
       PUBLIC API
       ============================== */
    document.addEventListener('DOMContentLoaded', init);

    return { loadResults, checkTickets, quickDate, clearHistory, toggleTheme };
})();
