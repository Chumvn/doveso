/* ============================================
   CHUM VÉ SỐ — App Logic v3.0
   Data from xskt.com.vn (RSS + HTML fallback)
   Display styled like minhngoc.net
   ============================================ */
const App = (() => {
    'use strict';

    /* ---- Constants ---- */
    const RSS_URL = 'https://xskt.com.vn/rss-feed/mien-nam-xsmn.rss';
    const HTML_URL = date => `https://xskt.com.vn/xsmn/ngay-${date}`;
    // CORS proxies only for the HTML fallback
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

        // Try autoplay music; browsers may block until user interacts
        setupMusic();
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
    // YYYY-MM-DD → D-M-YYYY for xskt.com.vn URL
    function fmtXsktUrl(s) {
        const p = s.split('-');
        return `${parseInt(p[2])}-${parseInt(p[1])}-${p[0]}`;
    }
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

    /* Primary: RSS Feed (no CORS issue at all) */
    async function fetchFromRSS(dateStr) {
        try {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 12000);
            const resp = await fetch(RSS_URL, { signal: ctrl.signal });
            clearTimeout(t);
            if (!resp.ok) return null;
            const text = await resp.text();
            return parseRSS(text, dateStr);
        } catch (e) {
            console.warn('RSS fetch failed:', e.message);
            return null;
        }
    }

    /* Parse RSS XML and extract results for a specific date */
    function parseRSS(xmlText, targetDateStr) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'text/xml');
        const items = doc.querySelectorAll('item');
        const targetDisplay = fmtRssDate(targetDateStr); // DD/MM/YYYY
        const targetParts = targetDateStr.split('-');
        // Also match DD/M/YYYY and D/M/YYYY format
        const targetDay = parseInt(targetParts[2]);
        const targetMonth = parseInt(targetParts[1]);
        const targetYear = targetParts[0];

        for (const item of items) {
            const title = item.querySelector('title')?.textContent || '';
            const pubDate = item.querySelector('pubDate')?.textContent || '';
            const desc = item.querySelector('description')?.textContent || '';

            // Match date in title like "NGÀY 12/02" or pubDate
            const titleMatch = title.match(/NGÀY\s+(\d{1,2})\/(\d{1,2})/);
            let matched = false;
            if (titleMatch) {
                const d = parseInt(titleMatch[1]), m = parseInt(titleMatch[2]);
                if (d === targetDay && m === targetMonth) matched = true;
            }
            // Also check pubDate
            if (!matched && pubDate.includes(targetDisplay)) matched = true;
            // Check link URL for another date hint
            if (!matched) {
                const link = item.querySelector('link')?.textContent || '';
                if (link.includes(`ngay-${targetDay}-${targetMonth}-${targetYear}`)) matched = true;
            }

            if (!matched) continue;

            // Parse the description text
            return parseRSSDescription(desc, targetDateStr);
        }
        return null; // Date not found in RSS
    }

    /* Parse the description block from RSS:
       [Province Name]
       ĐB: 702266
       1: 14760
       2: 90960
       3: 63288 - 32469
       4: ...
       5: 9346
       6: 1015 - 3312 - 6260
       7: 460
       8: 50
    */
    function parseRSSDescription(desc, dateStr) {
        const results = [];
        // Split by province blocks
        const blocks = desc.split(/\[([^\]]+)\]/);
        // blocks: ['', 'Province1', '\nĐB: ...', 'Province2', '\nĐB: ...', ...]
        for (let i = 1; i < blocks.length; i += 2) {
            const provinceName = blocks[i].trim();
            const data = blocks[i + 1] || '';
            const prizes = {};
            const lines = data.trim().split('\n');

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                let key = null;
                let nums = [];

                if (/^ĐB[:：]\s*/i.test(trimmed)) {
                    key = 'db';
                    nums = trimmed.replace(/^ĐB[:：]\s*/i, '').split(/\s*-\s*/).map(n => n.trim()).filter(n => /^\d+$/.test(n));
                } else {
                    const m = trimmed.match(/^(\d)[:：]\s*(.*)/);
                    if (m) {
                        const idx = parseInt(m[1]);
                        const keyMap = { 1: 'g1', 2: 'g2', 3: 'g3', 4: 'g4', 5: 'g5', 6: 'g6', 7: 'g7', 8: 'g8' };
                        key = keyMap[idx];
                        const valPart = m[2];
                        nums = valPart.split(/\s*-\s*/).map(n => n.trim()).filter(n => /^\d+$/.test(n));

                        // Handle "7: 460" followed by "8: 50" — but also "7: 4608: 50" combined
                        // The RSS sometimes merges G7 and G8 like "7: 0118: 32"
                        if (idx === 7 && /^\d{3,4}$/.test(nums[0])) {
                            // Normal G7 value
                        }
                        // Check for merged format "7: XXX8: YY" → G7=XXX, G8=YY
                        const mergedMatch = valPart.match(/^(\d{3})(\d)[:：]\s*(\d{2})$/);
                        if (mergedMatch && idx === 7) {
                            prizes['g7'] = [mergedMatch[1]];
                            prizes['g8'] = [mergedMatch[3]];
                            continue;
                        }
                        // Another merged format "7: XXXX8: YY"
                        const mergedMatch2 = valPart.match(/^(\d{3,4})(\d)[:：]\s*(\d{2})$/);
                        if (!mergedMatch && mergedMatch2 && idx === 7) {
                            // Could be G7(3-4 digits) then "8:" then G8(2 digits)
                            const g7val = mergedMatch2[1];
                            const g8val = mergedMatch2[3];
                            prizes['g7'] = [g7val];
                            prizes['g8'] = [g8val];
                            continue;
                        }
                    }
                }

                if (key && nums.length > 0) {
                    prizes[key] = nums;
                }
            }

            if (Object.keys(prizes).length > 0) {
                results.push({ province: provinceName, date: dateStr, prizes });
            }
        }
        return results.length > 0 ? results : null;
    }

    /* Fallback: Fetch HTML page via CORS proxy */
    async function fetchFromHTML(dateStr) {
        const url = HTML_URL(fmtXsktUrl(dateStr));
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
                    const results = parseHTMLPage(text, dateStr);
                    if (results && results.length) return results;
                }
            } catch (e) { console.warn(`Proxy ${i} failed:`, e.message); }
        }
        return null;
    }

    /* Parse HTML page from xskt.com.vn */
    function parseHTMLPage(html, dateStr) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        let resultTable = null;
        const allTables = doc.querySelectorAll('table');

        for (const table of allTables) {
            const text = table.textContent || '';
            if ((text.includes('Đặc') || text.includes('ĐB') || text.includes('G.1'))
                && /\d{5,6}/.test(text)) {
                const rows = table.querySelectorAll('tr');
                if (rows.length >= 8) { resultTable = table; break; }
            }
        }
        if (!resultTable) {
            for (const table of allTables) {
                const nums = (table.textContent.match(/\d{5,6}/g) || []);
                if (nums.length >= 3) { resultTable = table; break; }
            }
        }
        if (!resultTable) return null;

        const rows = resultTable.querySelectorAll('tr');
        if (rows.length < 3) return null;

        // Extract province names
        const provinces = [];
        const hCells = rows[0].querySelectorAll('td, th');
        for (let i = 0; i < hCells.length; i++) {
            const name = hCells[i].textContent.trim().replace(/\s+/g, ' ');
            if (name && name.length > 1 && !/(giải|kq|tỉnh|^g\.|^đb$)/i.test(name) && !/^\d+$/.test(name)) {
                provinces.push({ name, prizes: {} });
            }
        }
        if (!provinces.length) return null;

        for (let r = 1; r < rows.length; r++) {
            const cells = rows[r].querySelectorAll('td, th');
            if (cells.length < 2) continue;
            const labelCell = cells[0].textContent.trim().toLowerCase().replace(/\s/g, '');
            const key = parsePrizeKey(labelCell, r - 1);
            if (!key) continue;

            for (let p = 0; p < provinces.length; p++) {
                const colIdx = p + 1;
                if (colIdx >= cells.length) continue;
                const nums = extractNums(cells[colIdx]);
                if (nums.length > 0) {
                    provinces[p].prizes[key] = (provinces[p].prizes[key] || []).concat(nums);
                }
            }
        }

        return provinces
            .filter(p => Object.keys(p.prizes).length > 0)
            .map(p => ({ province: p.name, date: dateStr, prizes: p.prizes }));
    }

    function parsePrizeKey(label, rowIdx) {
        if (/đb|đặcbiệt|đặc|db/.test(label)) return 'db';
        if (/nhất|nhat|g\.?1\b/.test(label)) return 'g1';
        if (/nhì|nhi|g\.?2\b/.test(label)) return 'g2';
        if (/ba|g\.?3\b/.test(label)) return 'g3';
        if (/tư|tu|g\.?4\b/.test(label)) return 'g4';
        if (/năm|nam|g\.?5\b/.test(label)) return 'g5';
        if (/sáu|sau|g\.?6\b/.test(label)) return 'g6';
        if (/bảy|bay|g\.?7\b/.test(label)) return 'g7';
        if (/tám|tam|g\.?8\b/.test(label)) return 'g8';
        if (rowIdx >= 0 && rowIdx < PRIZE_ORDER.length) return PRIZE_ORDER[rowIdx];
        return null;
    }

    function extractNums(cell) {
        const raw = cell.textContent.trim();
        return raw.split(/[\s,\-\|\/\n\r\t]+/).map(p => p.trim()).filter(p => /^\d{2,6}$/.test(p));
    }

    /* Combined fetch: RSS first, then HTML fallback */
    async function fetchXSMN(dateStr) {
        // Try RSS first (fast, no CORS)
        const rssResult = await fetchFromRSS(dateStr);
        if (rssResult && rssResult.length) return rssResult;

        // Fallback: HTML page via CORS proxy
        const htmlResult = await fetchFromHTML(dateStr);
        if (htmlResult && htmlResult.length) return htmlResult;

        return null;
    }

    /* ==============================
       MAIN CHECK FLOW
       ============================== */
    async function doCheck() {
        const raw = $('#userNumbers').value.replace(/[^0-9]/g, '');
        const digits = parseInt($('#checkDigits').value);
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

            // Filter by selected province
            if (selectedProvince !== 'all') {
                const filtered = results.filter(r =>
                    r.province.toLowerCase().includes(selectedProvince.toLowerCase())
                );
                if (filtered.length) results = filtered;
            }

            // Find all matches
            const allMatches = [];
            const matchedNumbersPerProvince = new Map();

            for (const num of userNums) {
                const suffix = num.slice(-digits);
                for (const r of results) {
                    for (const [key, nums] of Object.entries(r.prizes)) {
                        for (const n of nums) {
                            if (n.slice(-digits) === suffix) {
                                allMatches.push({ userNum: num, prize: key, number: n, province: r.province });
                                if (!matchedNumbersPerProvince.has(r.province))
                                    matchedNumbersPerProvince.set(r.province, new Set());
                                matchedNumbersPerProvince.get(r.province).add(n);
                            }
                        }
                    }
                }
            }

            // Render results table with highlights
            const dow = new Date(dateStr).getDay();
            let html = `<div class="results-summary">📊 <strong>${DAY_NAMES[dow]}</strong>, ${fmtDisplay(dateStr)} — ${results.length} đài — Dò ${userNums.length} số (${digits} số cuối)</div>`;

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
        matches.forEach(m => {
            detailsHtml += `<div class="match-line">
                <span class="prize-tag">${PRIZE_NAMES[m.prize] || m.prize}</span>
                <span>Số <strong>${m.userNum}</strong> → ${m.number}</span>
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
