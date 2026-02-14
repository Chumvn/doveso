/* ============================================
   CHUM VÉ SỐ — App Logic v4.0
   Data from minhngoc.net (primary) + xskt.com.vn RSS (fallback)
   Display styled like minhngoc.net
   ============================================ */
const App = (() => {
    'use strict';

    /* ---- Constants ---- */
    const MINHNGOC_URL = dateStr => {
        const p = dateStr.split('-');
        return `https://www.minhngoc.net/ket-qua-xo-so/mien-nam/${p[2]}-${p[1]}-${p[0]}.html`;
    };
    const RSS_URL = 'https://xskt.com.vn/rss-feed/mien-nam-xsmn.rss';
    // CORS proxies — needed for cross-origin fetches
    const CORS_PROXIES = [
        url => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];
    const STORAGE = { theme: 'chum-veso-theme' };
    const PRIZE_NAMES = {
        db: 'Đặc Biệt', g1: 'Giải Nhất', g2: 'Giải Nhì', g3: 'Giải Ba',
        g4: 'Giải Tư', g5: 'Giải Năm', g6: 'Giải Sáu', g7: 'Giải Bảy', g8: 'Giải Tám'
    };
    const PRIZE_ORDER = ['g8', 'g7', 'g6', 'g5', 'g4', 'g3', 'g2', 'g1', 'db'];
    const DISPLAY_ORDER = ['g8', 'g7', 'g6', 'g5', 'g4', 'g3', 'g2', 'g1', 'db'];
    const DISPLAY_LABELS = {
        g8: 'Giải tám', g7: 'Giải bảy', g6: 'Giải sáu', g5: 'Giải năm',
        g4: 'Giải tư', g3: 'Giải ba', g2: 'Giải nhì', g1: 'Giải nhất', db: 'Giải Đặc Biệt'
    };
    const DAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const XSMN_SCHEDULE = {
        0: ['Tiền Giang', 'Kiên Giang', 'Đà Lạt'],
        1: ['TP. HCM', 'Đồng Tháp', 'Cà Mau'],
        2: ['Bến Tre', 'Vũng Tàu', 'Bạc Liêu'],
        3: ['Đồng Nai', 'Cần Thơ', 'Sóc Trăng'],
        4: ['Tây Ninh', 'An Giang', 'Bình Thuận'],
        5: ['Vĩnh Long', 'Bình Dương', 'Trà Vinh'],
        6: ['TP. HCM', 'Long An', 'Bình Phước', 'Hậu Giang']
    };
    const PROVINCE_CODES = {
        'Tây Ninh': 'XSTN', 'An Giang': 'XSAG', 'Bình Thuận': 'XSBTH',
        'TP. HCM': 'XSHCM', 'Hồ Chí Minh': 'XSHCM', 'Đồng Tháp': 'XSDT', 'Cà Mau': 'XSCM',
        'Bến Tre': 'XSBT', 'Vũng Tàu': 'XSVT', 'Bạc Liêu': 'XSBL',
        'Đồng Nai': 'XSDN', 'Cần Thơ': 'XSCT', 'Sóc Trăng': 'XSST',
        'Tiền Giang': 'XSTG', 'Kiên Giang': 'XSKG', 'Đà Lạt': 'XSDL', 'Lâm Đồng': 'XSDL',
        'Vĩnh Long': 'XSVL', 'Bình Dương': 'XSBD', 'Trà Vinh': 'XSTV',
        'Long An': 'XSLA', 'Bình Phước': 'XSBP', 'Hậu Giang': 'XSHG'
    };

    /* ---- State ---- */
    let selectedProvince = 'all';

    /* ---- DOM ---- */
    const $ = s => document.querySelector(s);
    const $$ = s => document.querySelectorAll(s);

    /* ==============================
       INIT
       ============================== */
    function init() {
        loadTheme();
        setupDatePicker();
        populateProvinces();
        setupEvents();
    }

    function setupEvents() {
        $('#themeToggle').addEventListener('click', toggleTheme);
        $('#checkBtn').addEventListener('click', doCheck);
        $('#celebrationClose').addEventListener('click', closeCelebration);
        $('#celebrationOk').addEventListener('click', closeCelebration);
        $('#consolationClose').addEventListener('click', closeConsolation);
        $('#consolationOk').addEventListener('click', closeConsolation);
        $('#resultDate').addEventListener('change', populateProvinces);

        // Double-click anywhere on screen to toggle music
        document.addEventListener('dblclick', (e) => {
            // Don't toggle when double-clicking on input fields or buttons
            if (e.target.closest('textarea, input, select, button, .province-chip')) return;
            toggleMusic();
        });

        // Only allow digits + auto-space every 6 digits in the number input
        const numInput = $('#userNumbers');
        numInput.addEventListener('input', () => {
            const cursorPos = numInput.selectionStart;
            const rawBefore = numInput.value;
            const digitsOnly = rawBefore.replace(/[^0-9]/g, '');
            // Insert space every 6 digits
            let formatted = '';
            for (let i = 0; i < digitsOnly.length; i++) {
                if (i > 0 && i % 6 === 0) formatted += ' ';
                formatted += digitsOnly[i];
            }
            if (numInput.value !== formatted) {
                numInput.value = formatted;
                // Adjust cursor position
                const digitsBefore = rawBefore.slice(0, cursorPos).replace(/[^0-9]/g, '').length;
                let newPos = 0, count = 0;
                for (let i = 0; i < formatted.length && count < digitsBefore; i++) {
                    newPos = i + 1;
                    if (formatted[i] !== ' ') count++;
                }
                numInput.setSelectionRange(newPos, newPos);
            }
        });

        // Click sparkle effects
        document.addEventListener('click', spawnSparkles);

        // Try autoplay music; browsers may block until user interacts
        setupMusic();
    }

    /* ==============================
       SPARKLE CLICK EFFECTS
       ============================== */
    const SPARKLE_EMOJIS = ['✨', '💰', '🎫', '🎰', '🎲', '💎', '🌟', '⭐', '💫', '🪙'];
    function spawnSparkles(e) {
        const overlay = $('#sparkleOverlay');
        if (!overlay) return;
        const count = 4 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
            const el = document.createElement('span');
            el.className = 'sparkle';
            el.textContent = SPARKLE_EMOJIS[Math.floor(Math.random() * SPARKLE_EMOJIS.length)];
            el.style.left = e.clientX + 'px';
            el.style.top = e.clientY + 'px';
            el.style.fontSize = (0.7 + Math.random() * 0.8) + 'rem';
            const angle = Math.random() * Math.PI * 2;
            const dist = 30 + Math.random() * 60;
            el.style.setProperty('--sx', Math.cos(angle) * dist + 'px');
            el.style.setProperty('--sy', Math.sin(angle) * dist + 'px');
            el.style.setProperty('--sr', (Math.random() * 360 - 180) + 'deg');
            overlay.appendChild(el);
            setTimeout(() => el.remove(), 900);
        }
    }

    /* ==============================
       MUSIC — double-click to toggle
       ============================== */
    let musicPlaying = true;

    function setupMusic() {
        const audio = $('#bgMusic');
        if (!audio) return;
        audio.volume = 0.4;
        const playPromise = audio.play();
        if (playPromise) {
            playPromise.catch(() => {
                // Autoplay blocked — start on first user interaction
                musicPlaying = false;
                document.addEventListener('click', function resumeMusic() {
                    const audio = $('#bgMusic');
                    audio.play().then(() => {
                        musicPlaying = true;
                    }).catch(() => { });
                    document.removeEventListener('click', resumeMusic);
                }, { once: true });
            });
        }
    }

    function toggleMusic() {
        const audio = $('#bgMusic');
        if (!audio) return;
        if (musicPlaying) {
            audio.pause();
            musicPlaying = false;
        } else {
            audio.play().catch(() => { });
            musicPlaying = true;
        }
    }

    /* ==============================
       THEME
       ============================== */
    function loadTheme() {
        applyTheme(localStorage.getItem(STORAGE.theme) || 'dark');
    }
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        $('#themeIcon').textContent = theme === 'dark' ? '🌙' : '☀️';
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = theme === 'dark' ? '#1a1a2e' : '#e4e9f0';
        localStorage.setItem(STORAGE.theme, theme);
    }
    function toggleTheme() {
        applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    }

    /* ==============================
       DATE
       ============================== */
    function setupDatePicker() {
        const today = fmtInput(new Date());
        const el = $('#resultDate');
        el.value = today;
        el.max = today;
    }
    function fmtInput(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    function fmtDisplay(s) { const p = s.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; }
    // YYYY-MM-DD → DD/MM/YYYY for RSS matching
    function fmtRssDate(s) {
        const p = s.split('-');
        return `${p[2]}/${p[1]}/${p[0]}`;
    }

    /* ==============================
       PROVINCE SELECTOR
       ============================== */
    function populateProvinces() {
        const dateStr = $('#resultDate').value;
        const dow = dateStr ? new Date(dateStr).getDay() : new Date().getDay();
        const provinces = XSMN_SCHEDULE[dow] || [];
        const container = $('#provinceSelector');

        let html = `<button class="province-chip active" data-province="all">Tất cả đài</button>`;
        provinces.forEach(p => {
            html += `<button class="province-chip" data-province="${p}">${p}</button>`;
        });
        container.innerHTML = html;
        selectedProvince = 'all';

        container.querySelectorAll('.province-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                container.querySelectorAll('.province-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                selectedProvince = chip.dataset.province;
            });
        });
    }

    /* ==============================
       DATA FETCHING
       ============================== */

    /* Primary: Fetch from minhngoc.net — try direct (no proxy needed from same origin) */
    async function fetchFromMinhngoc(dateStr) {
        const url = MINHNGOC_URL(dateStr);
        // Try direct fetch first (works if no CORS restriction)
        try {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 10000);
            const resp = await fetch(url, { signal: ctrl.signal });
            clearTimeout(t);
            if (resp.ok) {
                const text = await resp.text();
                if (text && text.length > 500) {
                    const results = parseMinhngoc(text, dateStr);
                    if (results && results.length) return results;
                }
            }
        } catch (e) { console.warn('Minhngoc direct failed:', e.message); }
        // Try via CORS proxies
        for (let i = 0; i < CORS_PROXIES.length; i++) {
            try {
                const ctrl = new AbortController();
                const t = setTimeout(() => ctrl.abort(), 15000);
                const resp = await fetch(CORS_PROXIES[i](url), { signal: ctrl.signal });
                clearTimeout(t);
                if (!resp.ok) continue;
                let text;
                try { const j = await resp.json(); text = j.contents || JSON.stringify(j); }
                catch { text = await resp.text(); }
                if (text && text.length > 500) {
                    const results = parseMinhngoc(text, dateStr);
                    if (results && results.length) return results;
                }
            } catch (e) { console.warn(`Minhngoc proxy ${i} failed:`, e.message); }
        }
        return null;
    }

    /* Parse minhngoc.net HTML — structure uses CSS classes:
       table.rightcl per province, td.tinh for name,
       td.giai8/giai7/.../giaidb > div for prize numbers */
    function parseMinhngoc(html, dateStr) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        // Only parse the first box_kqxs (target date), page may have multiple days
        const firstBox = doc.querySelector('.box_kqxs');
        const container = firstBox || doc;
        const provinceTables = container.querySelectorAll('table.rightcl');
        if (!provinceTables.length) return null;

        const results = [];
        const PRIZE_MAP = {
            'giai8': 'g8', 'giai7': 'g7', 'giai6': 'g6', 'giai5': 'g5',
            'giai4': 'g4', 'giai3': 'g3', 'giai2': 'g2', 'giai1': 'g1', 'giaidb': 'db'
        };

        for (const table of provinceTables) {
            // Province name from td.tinh
            const tinhCell = table.querySelector('td.tinh');
            if (!tinhCell) continue;
            const province = tinhCell.textContent.trim();
            if (!province) continue;

            const prizes = {};
            for (const [cls, key] of Object.entries(PRIZE_MAP)) {
                const td = table.querySelector(`td.${cls}`);
                if (!td) continue;
                const divs = td.querySelectorAll('div');
                const nums = [];
                divs.forEach(d => {
                    const n = d.textContent.trim();
                    if (/^\d{2,6}$/.test(n)) nums.push(n);
                });
                if (nums.length > 0) prizes[key] = nums;
            }

            if (Object.keys(prizes).length > 0) {
                results.push({ province, date: dateStr, prizes });
            }
        }
        return results.length > 0 ? results : null;
    }

    /* Fallback 1: RSS from xskt.com.vn via CORS proxy */
    async function fetchFromRSS(dateStr) {
        for (let i = 0; i < CORS_PROXIES.length; i++) {
            try {
                const ctrl = new AbortController();
                const t = setTimeout(() => ctrl.abort(), 12000);
                const resp = await fetch(CORS_PROXIES[i](RSS_URL), { signal: ctrl.signal });
                clearTimeout(t);
                if (!resp.ok) continue;
                let text;
                try { const j = await resp.json(); text = j.contents || JSON.stringify(j); }
                catch { text = await resp.text(); }
                if (text && text.length > 200) {
                    const result = parseRSS(text, dateStr);
                    if (result && result.length) return result;
                }
            } catch (e) { console.warn(`RSS proxy ${i} failed:`, e.message); }
        }
        return null;
    }

    /* Fallback 2: HTML page from xskt.com.vn via CORS proxy */
    async function fetchFromXsktHTML(dateStr) {
        const p = dateStr.split('-');
        const url = `https://xskt.com.vn/xsmn/ngay-${parseInt(p[2])}-${parseInt(p[1])}-${p[0]}`;
        for (let i = 0; i < CORS_PROXIES.length; i++) {
            try {
                const ctrl = new AbortController();
                const t = setTimeout(() => ctrl.abort(), 15000);
                const resp = await fetch(CORS_PROXIES[i](url), { signal: ctrl.signal });
                clearTimeout(t);
                if (!resp.ok) continue;
                let text;
                try { const j = await resp.json(); text = j.contents || JSON.stringify(j); }
                catch { text = await resp.text(); }
                if (text && text.length > 500) {
                    // Parse using minhngoc parser (xskt uses similar structure)
                    // or use simple regex extraction
                    const results = parseXsktHTML(text, dateStr);
                    if (results && results.length) return results;
                }
            } catch (e) { console.warn(`XSKT proxy ${i} failed:`, e.message); }
        }
        return null;
    }

    /* Parse xskt.com.vn HTML page using regex (avoids DOMParser issues) */
    function parseXsktHTML(html, dateStr) {
        // xskt.com.vn uses a table with province headers and prize rows
        // Try parsing with DOMParser (text/html is safe)
        const doc = new DOMParser().parseFromString(html, 'text/html');
        // Look for the results table — contains 5,6-digit numbers
        let resultTable = null;
        for (const table of doc.querySelectorAll('table')) {
            const text = table.textContent || '';
            if (/\d{5,6}/.test(text)) {
                const rows = table.querySelectorAll('tr');
                if (rows.length >= 8) { resultTable = table; break; }
            }
        }
        if (!resultTable) return null;

        const rows = resultTable.querySelectorAll('tr');
        if (rows.length < 3) return null;

        const provinces = [];
        const hCells = rows[0].querySelectorAll('td, th');
        for (const cell of hCells) {
            const name = cell.textContent.trim().replace(/\s+/g, ' ');
            if (name && name.length > 1 && !/^(giải|kq|tỉnh|g\.|đb|\d+)$/i.test(name)) {
                provinces.push({ name: normalizeProvince(name), prizes: {} });
            }
        }
        if (!provinces.length) return null;

        for (let r = 1; r < rows.length; r++) {
            const cells = rows[r].querySelectorAll('td, th');
            if (cells.length < 2) continue;
            const label = cells[0].textContent.trim().toLowerCase().replace(/\s/g, '');
            let key = null;
            if (/đặcbiệt|đb|db/.test(label)) key = 'db';
            else if (/nhất|g\.?1/.test(label)) key = 'g1';
            else if (/nhì|g\.?2/.test(label)) key = 'g2';
            else if (/ba|g\.?3/.test(label)) key = 'g3';
            else if (/tư|g\.?4/.test(label)) key = 'g4';
            else if (/năm|g\.?5/.test(label)) key = 'g5';
            else if (/sáu|g\.?6/.test(label)) key = 'g6';
            else if (/bảy|g\.?7/.test(label)) key = 'g7';
            else if (/tám|g\.?8/.test(label)) key = 'g8';
            else if (r - 1 < PRIZE_ORDER.length) key = PRIZE_ORDER[r - 1];
            if (!key) continue;

            for (let p = 0; p < provinces.length; p++) {
                const colIdx = p + 1;
                if (colIdx >= cells.length) continue;
                const raw = cells[colIdx].textContent.trim();
                const nums = raw.split(/[\s,\-\|\/\n\r\t]+/).map(s => s.trim()).filter(s => /^\d{2,6}$/.test(s));
                if (nums.length > 0) {
                    provinces[p].prizes[key] = (provinces[p].prizes[key] || []).concat(nums);
                }
            }
        }

        return provinces
            .filter(p => Object.keys(p.prizes).length > 0)
            .map(p => ({ province: p.name, date: dateStr, prizes: p.prizes }));
    }

    /* Province name normalization */
    const PROVINCE_NORMALIZE = {
        'Hồ Chí Minh': 'TP. HCM', 'Ho Chi Minh': 'TP. HCM',
        'HCM': 'TP. HCM', 'Lâm Đồng': 'Đà Lạt'
    };
    function normalizeProvince(name) {
        return PROVINCE_NORMALIZE[name] || name;
    }

    /* Parse RSS from xskt.com.vn using regex */
    function parseRSS(rawXml, targetDateStr) {
        const targetParts = targetDateStr.split('-');
        const targetDay = parseInt(targetParts[2]);
        const targetMonth = parseInt(targetParts[1]);
        const targetYear = targetParts[0];
        const targetDisplay = fmtRssDate(targetDateStr);

        const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
        let itemMatch;
        while ((itemMatch = itemRegex.exec(rawXml)) !== null) {
            const itemXml = itemMatch[1];
            const title = (itemXml.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '';
            const pubDate = (itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1] || '';
            const link = (itemXml.match(/<link>([\s\S]*?)<\/link>/i) || [])[1] || '';
            const desc = (itemXml.match(/<description>([\s\S]*?)<\/description>/i) || [])[1] || '';

            const titleMatch = title.match(/NGÀY\s+(\d{1,2})\/(\d{1,2})/);
            let matched = false;
            if (titleMatch) {
                const d = parseInt(titleMatch[1]), m = parseInt(titleMatch[2]);
                if (d === targetDay && m === targetMonth) matched = true;
            }
            if (!matched && pubDate.includes(targetDisplay)) matched = true;
            if (!matched && link.includes(`ngay-${targetDay}-${targetMonth}-${targetYear}`)) matched = true;
            if (!matched) continue;

            return parseRSSDescription(desc, targetDateStr);
        }
        return null;
    }

    function parseRSSDescription(desc, dateStr) {
        const results = [];
        const blocks = desc.split(/\[([^\]]+)\]/);
        for (let i = 1; i < blocks.length; i += 2) {
            const rawProvince = blocks[i].trim();
            const provinceName = normalizeProvince(rawProvince);
            const data = blocks[i + 1] || '';
            const prizes = {};
            const lines = data.trim().split(/[\r\n]+/);
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                let key = null, nums = [];
                if (/^ĐB[:：]\s*/i.test(trimmed)) {
                    key = 'db';
                    nums = trimmed.replace(/^ĐB[:：]\s*/i, '').split(/\s*-\s*/).map(n => n.trim()).filter(n => /^\d+$/.test(n));
                } else {
                    const m = trimmed.match(/^(\d)[:：]\s*(.*)/);
                    if (m) {
                        const idx = parseInt(m[1]);
                        const keyMap = { 1: 'g1', 2: 'g2', 3: 'g3', 4: 'g4', 5: 'g5', 6: 'g6', 7: 'g7', 8: 'g8' };
                        key = keyMap[idx];
                        const valPart = m[2].trim();
                        if (idx === 7) {
                            const merged = valPart.match(/^(\d{2,4})(\d)[:：]\s*(\d{2})$/);
                            if (merged && parseInt(merged[2]) === 8) {
                                prizes['g7'] = [merged[1]];
                                prizes['g8'] = [merged[3]];
                                continue;
                            }
                        }
                        nums = valPart.split(/\s*-\s*/).map(n => n.trim()).filter(n => /^\d+$/.test(n));
                    }
                }
                if (key && nums.length > 0) prizes[key] = nums;
            }
            if (Object.keys(prizes).length > 0) {
                results.push({ province: provinceName, date: dateStr, prizes });
            }
        }
        return results.length > 0 ? results : null;
    }

    /* Combined fetch: minhngoc direct → RSS → xskt HTML */
    async function fetchXSMN(dateStr) {
        // 1. minhngoc.net (direct + proxy attempts)
        const minhngocResult = await fetchFromMinhngoc(dateStr);
        if (minhngocResult && minhngocResult.length) return minhngocResult;

        // 2. xskt.com.vn RSS via proxy
        const rssResult = await fetchFromRSS(dateStr);
        if (rssResult && rssResult.length) return rssResult;

        // 3. xskt.com.vn HTML via proxy
        const xsktResult = await fetchFromXsktHTML(dateStr);
        if (xsktResult && xsktResult.length) return xsktResult;

        return null;
    }

    /* ==============================
       MAIN CHECK FLOW
       ============================== */
    // Digits to match per prize level (trailing digits)
    const PRIZE_DIGITS = {
        db: 6, g1: 5, g2: 5, g3: 5, g4: 5,
        g5: 4, g6: 4, g7: 3, g8: 2
    };
    // Prize amounts in VND
    const PRIZE_AMOUNTS = {
        db: '2 tỷ', phu_db: '50 triệu', kk: '6 triệu',
        g1: '30 triệu', g2: '15 triệu', g3: '10 triệu',
        g4: '3 triệu', g5: '1 triệu', g6: '400K',
        g7: '200K', g8: '100K'
    };
    const PRIZE_FULL_NAMES = {
        db: '🏆 Đặc Biệt', phu_db: '⭐ Phụ ĐB', kk: '🎗 Khuyến Khích',
        g1: '🥇 Giải Nhất', g2: '🥈 Giải Nhì', g3: '🥉 Giải Ba',
        g4: '🎖 Giải Tư', g5: '🎯 Giải Năm', g6: '🎫 Giải Sáu',
        g7: '🎟 Giải Bảy', g8: '🎁 Giải Tám'
    };

    async function doCheck() {
        const raw = $('#userNumbers').value.replace(/[^0-9]/g, '');
        const dateStr = $('#resultDate').value;

        if (!raw) { showStatus('Vui lòng nhập số vé cần dò', 'error'); return; }
        if (!dateStr) { showStatus('Vui lòng chọn ngày xổ', 'error'); return; }

        // Auto-split continuous digits into 6-digit ticket numbers
        const userNums = [];
        for (let i = 0; i < raw.length; i += 6) {
            const chunk = raw.slice(i, i + 6);
            if (chunk.length >= 2) userNums.push(chunk);
        }
        if (!userNums.length) { showStatus('Số vé không hợp lệ. Nhập số có ít nhất 2 chữ số.', 'error'); return; }

        const loading = $('#loadingEl');
        const resContainer = $('#resultsContainer');
        const banner = $('#resultBanner');
        const status = $('#statusMsg');
        loading.style.display = 'flex';
        resContainer.innerHTML = '';
        banner.style.display = 'none';
        status.style.display = 'none';

        try {
            let results = await fetchXSMN(dateStr);
            loading.style.display = 'none';

            if (!results || !results.length) {
                showStatus(`Không tìm thấy kết quả cho ngày ${fmtDisplay(dateStr)}. Có thể chưa có kết quả hoặc không phải ngày xổ.`, 'info');
                return;
            }

            // Sort results to match official XSMN schedule order
            const dow = new Date(dateStr).getDay();
            const scheduleOrder = XSMN_SCHEDULE[dow] || [];
            results.sort((a, b) => {
                const idxA = scheduleOrder.findIndex(s =>
                    a.province.toLowerCase().includes(s.toLowerCase()) ||
                    s.toLowerCase().includes(a.province.toLowerCase())
                );
                const idxB = scheduleOrder.findIndex(s =>
                    b.province.toLowerCase().includes(s.toLowerCase()) ||
                    s.toLowerCase().includes(b.province.toLowerCase())
                );
                return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
            });

            // Filter by selected province
            if (selectedProvince !== 'all') {
                const filtered = results.filter(r =>
                    r.province.toLowerCase().includes(selectedProvince.toLowerCase())
                );
                if (filtered.length) results = filtered;
            }

            // ===== OFFICIAL XSMN MATCHING =====
            // A ticket can win MULTIPLE prizes simultaneously
            const allMatches = [];
            const matchedNumbersPerProvince = new Map();

            for (const num of userNums) {
                for (const r of results) {
                    // Check EVERY prize level independently
                    for (const [key, nums] of Object.entries(r.prizes)) {
                        const digits = PRIZE_DIGITS[key];
                        if (!digits || num.length < digits) continue;
                        const suffix = num.slice(-digits);
                        for (const n of nums) {
                            if (n.slice(-digits) === suffix) {
                                allMatches.push({
                                    userNum: num, prize: key, number: n,
                                    province: r.province, amount: PRIZE_AMOUNTS[key]
                                });
                                if (!matchedNumbersPerProvince.has(r.province))
                                    matchedNumbersPerProvince.set(r.province, new Set());
                                matchedNumbersPerProvince.get(r.province).add(n);
                            }
                        }
                    }
                    // Special: Giải Phụ ĐB — last 5 of ĐB match, first digit wrong
                    const dbNums = r.prizes.db || [];
                    if (num.length >= 6) {
                        for (const dbN of dbNums) {
                            if (dbN.length >= 6 && dbN.slice(-5) === num.slice(-5) && dbN[0] !== num[0]) {
                                allMatches.push({ userNum: num, prize: 'phu_db', number: dbN, province: r.province, amount: PRIZE_AMOUNTS.phu_db });
                            }
                        }
                        // Special: Giải Khuyến Khích — 5/6 digits of ĐB match (differ exactly 1)
                        for (const dbN of dbNums) {
                            if (dbN.length >= 6) {
                                let diff = 0;
                                for (let i = 0; i < 6; i++) { if (dbN[i] !== num.slice(-6)[i]) diff++; }
                                if (diff === 1 && !(dbN.slice(-5) === num.slice(-5) && dbN[0] !== num[0])) {
                                    allMatches.push({ userNum: num, prize: 'kk', number: dbN, province: r.province, amount: PRIZE_AMOUNTS.kk });
                                }
                            }
                        }
                    }
                }
            }

            // Render results table with highlights
            let html = `<div class="results-summary">📊 <strong>${DAY_NAMES[dow]}</strong>, ${fmtDisplay(dateStr)} — ${results.length} đài — Dò ${userNums.length} vé</div>`;

            html += renderKQXSTable(results, dateStr, matchedNumbersPerProvince);
            resContainer.innerHTML = html;

            // Show win only (no notification if losing)
            if (allMatches.length > 0) {
                showWin(allMatches);
            }
        } catch (err) {
            loading.style.display = 'none';
            showStatus(`Không thể tải kết quả. ${err.message}`, 'error');
        }
    }

    /* ==============================
       RENDER — Unified KQXS table (minhngoc.net style)
       ============================== */
    function renderKQXSTable(results, dateStr, matchedMap) {
        if (!results || !results.length) return '';
        const dow = new Date(dateStr).getDay();

        let html = `<div class="kqxs-card"><div class="kqxs-title-bar">KẾT QUẢ XỔ SỐ MIỀN NAM — ${fmtDisplay(dateStr)}</div><div class="kqxs-scroll"><table class="kqxs-table">`;

        // Header row 1: Day + Province names
        html += `<thead><tr>`;
        html += `<th class="kqxs-day-cell" rowspan="2">${DAY_NAMES[dow]}<br>${fmtDisplay(dateStr)}</th>`;
        results.forEach(r => { html += `<th>${r.province}</th>`; });
        html += `</tr>`;

        // Header row 2: Province codes
        html += `<tr class="kqxs-code-row">`;
        results.forEach(r => { html += `<th>${PROVINCE_CODES[r.province] || r.province}</th>`; });
        html += `</tr></thead>`;

        // Body
        html += `<tbody>`;
        for (const key of DISPLAY_ORDER) {
            html += `<tr class="kqxs-${key}">`;
            html += `<td class="kqxs-prize-name">${DISPLAY_LABELS[key]}</td>`;
            for (const r of results) {
                const matched = matchedMap.get(r.province) || new Set();
                const nums = r.prizes[key] || [];
                html += `<td class="kqxs-num">`;
                if (nums.length === 0) {
                    html += '—';
                } else if (nums.length === 1) {
                    html += renderNum(nums[0], matched);
                } else {
                    html += nums.map(n => `<span class="num-line">${renderNum(n, matched)}</span>`).join('');
                }
                html += `</td>`;
            }
            html += `</tr>`;
        }
        html += `</tbody></table></div></div>`;
        return html;
    }

    function renderNum(n, matchedSet) {
        if (matchedSet.has(n)) return `<span class="matched">${n}</span>`;
        return n;
    }

    function showStatus(msg, type) {
        const s = $('#statusMsg');
        const icons = { error: '⚠️', success: '✅', info: 'ℹ️' };
        s.className = `status-message ${type}`;
        s.innerHTML = `${icons[type] || ''} ${msg}`;
        s.style.display = 'flex';
    }

    /* ==============================
       WIN — Fireworks + Hoa Mai + Modal
       ============================== */
    function showWin(matches) {
        const banner = $('#resultBanner');
        banner.className = 'result-banner win';
        banner.innerHTML = `🎉 CHÚC MỪNG! Bạn trúng <strong>${matches.length}</strong> giải! 🎉`;
        banner.style.display = 'block';

        let detailsHtml = '';
        let totalValue = 0;
        matches.forEach(m => {
            const name = PRIZE_FULL_NAMES[m.prize] || PRIZE_NAMES[m.prize] || m.prize;
            detailsHtml += `<div class="match-line">
                <span class="prize-tag">${name}</span>
                <span>Số <strong>${m.userNum}</strong> → ${m.number}</span>
                <span class="amount-tag">${m.amount || ''}</span>
                <span class="province-tag">${m.province}</span>
            </div>`;
        });
        $('#celebrationText').textContent = `Bạn đã trúng ${matches.length} giải thưởng!`;
        $('#celebrationDetails').innerHTML = detailsHtml;

        launchFireworks();
        launchHoaMai();
        setTimeout(() => { $('#celebrationModal').style.display = 'flex'; }, 800);
    }

    function closeCelebration() {
        $('#celebrationModal').style.display = 'none';
        stopFireworks();
        clearHoaMai();
    }

    /* ==============================
       LOSE — Consolation
       ============================== */
    function showLose() {
        const banner = $('#resultBanner');
        banner.className = 'result-banner lose';
        banner.innerHTML = `💪 Chưa trúng lần này — Chúc bạn may mắn lần sau! 🍀`;
        banner.style.display = 'block';
        setTimeout(() => { $('#consolationModal').style.display = 'flex'; }, 600);
    }

    function closeConsolation() {
        $('#consolationModal').style.display = 'none';
    }

    /* ==============================
       FIREWORKS (Canvas)
       ============================== */
    let fwAnimId = null;
    let fwParticles = [];

    function launchFireworks() {
        const canvas = $('#fireworksCanvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        fwParticles = [];
        const colors = ['#ffd369', '#ff6b6b', '#48bb78', '#63b3ed', '#f6ad55', '#fc8181', '#f687b3', '#b794f4'];

        function createBurst(x, y) {
            const count = 60 + Math.random() * 40;
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
                const speed = 2 + Math.random() * 5;
                fwParticles.push({
                    x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                    life: 1, decay: 0.008 + Math.random() * 0.012,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    size: 2 + Math.random() * 3
                });
            }
        }

        function scheduleBursts() {
            for (let i = 0; i < 6; i++) {
                setTimeout(() => {
                    if (!fwAnimId) return;
                    createBurst(canvas.width * (0.15 + Math.random() * 0.7), canvas.height * (0.1 + Math.random() * 0.5));
                }, i * 500 + Math.random() * 300);
            }
        }

        scheduleBursts();
        setTimeout(() => { if (fwAnimId) scheduleBursts(); }, 3500);

        function animate() {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'lighter';
            for (let i = fwParticles.length - 1; i >= 0; i--) {
                const p = fwParticles[i];
                p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.vx *= 0.99; p.life -= p.decay;
                if (p.life <= 0) { fwParticles.splice(i, 1); continue; }
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life;
                ctx.fill();
                ctx.globalAlpha = 1;
            }
            fwAnimId = requestAnimationFrame(animate);
        }
        fwAnimId = requestAnimationFrame(animate);
        setTimeout(stopFireworks, 8000);
    }

    function stopFireworks() {
        if (fwAnimId) { cancelAnimationFrame(fwAnimId); fwAnimId = null; }
        const canvas = $('#fireworksCanvas');
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        fwParticles = [];
    }

    /* ==============================
       HOA MAI (Apricot Blossoms)
       ============================== */
    let hoaMaiInterval = null;

    function launchHoaMai() {
        const overlay = $('#hoaMaiOverlay');
        const petals = ['🌸', '🏵️', '💮', '✿', '🌼'];
        function createPetal() {
            const el = document.createElement('div');
            el.className = 'hoa-mai-petal';
            el.textContent = petals[Math.floor(Math.random() * petals.length)];
            el.style.left = Math.random() * 100 + '%';
            el.style.fontSize = (1.2 + Math.random() * 1.5) + 'rem';
            el.style.animationDuration = (4 + Math.random() * 4) + 's';
            el.style.animationDelay = Math.random() * 0.5 + 's';
            overlay.appendChild(el);
            setTimeout(() => el.remove(), 9000);
        }
        for (let i = 0; i < 20; i++) setTimeout(createPetal, i * 100);
        hoaMaiInterval = setInterval(() => { for (let i = 0; i < 3; i++) createPetal(); }, 400);
        setTimeout(clearHoaMai, 7000);
    }

    function clearHoaMai() {
        if (hoaMaiInterval) { clearInterval(hoaMaiInterval); hoaMaiInterval = null; }
    }

    /* ==============================
       PUBLIC
       ============================== */
    document.addEventListener('DOMContentLoaded', init);
    return { doCheck, toggleTheme };
})();
