/* ============================================
   CHUM VÉ SỐ — App Logic v2
   Single-page lottery checker with effects
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
    const STORAGE = { theme: 'chum-veso-theme' };
    const PRIZE_NAMES = {
        db: 'Đặc Biệt', g1: 'Giải Nhất', g2: 'Giải Nhì', g3: 'Giải Ba',
        g4: 'Giải Tư', g5: 'Giải Năm', g6: 'Giải Sáu', g7: 'Giải Bảy', g8: 'Giải Tám'
    };
    const PRIZE_ORDER = ['g8', 'g7', 'g6', 'g5', 'g4', 'g3', 'g2', 'g1', 'db'];
    const PRIZE_DISPLAY = ['db', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8'];
    const DAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const XSMN_SCHEDULE = {
        0: ['Tiền Giang', 'Kiên Giang', 'Đà Lạt'],
        1: ['TP.HCM', 'Đồng Tháp', 'Cà Mau'],
        2: ['Bến Tre', 'Vũng Tàu', 'Bạc Liêu'],
        3: ['Đồng Nai', 'Cần Thơ', 'Sóc Trăng'],
        4: ['Tây Ninh', 'An Giang', 'Bình Thuận'],
        5: ['Vĩnh Long', 'Bình Dương', 'Trà Vinh'],
        6: ['TP.HCM', 'Long An', 'Bình Phước', 'Hậu Giang']
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
        // Date change updates province list
        $('#resultDate').addEventListener('change', populateProvinces);
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
    function fmtUrl(s) { const p = s.split('-'); return `${p[2]}-${p[1]}-${p[0]}`; }

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

        // Click handlers
        container.querySelectorAll('.province-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                container.querySelectorAll('.province-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                selectedProvince = chip.dataset.province;
            });
        });
    }

    /* ==============================
       FETCH
       ============================== */
    async function fetchWithProxy(url) {
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
                if (text && text.length > 200) return text;
            } catch (e) { console.warn(`Proxy ${i} failed:`, e.message); }
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
        let table = null;
        for (const t of doc.querySelectorAll('table')) {
            const txt = t.textContent;
            if ((txt.includes('ĐB') || txt.includes('G.1') || txt.includes('Đặc')) && txt.match(/\d{5,6}/)) {
                table = t; break;
            }
        }
        if (!table) table = doc.querySelector('.table-result,.ta_border,.kqsx-mt,.div_kqsx table');
        if (!table) return extractFallback(html, dateStr);

        const rows = table.querySelectorAll('tr');
        if (rows.length < 3) return extractFallback(html, dateStr);

        const hCells = rows[0].querySelectorAll('td,th');
        const provinces = [];
        for (let i = 1; i < hCells.length; i++) {
            const name = hCells[i].textContent.trim().replace(/\s+/g, ' ');
            if (name) provinces.push({ name, prizes: {} });
        }
        if (!provinces.length) return extractFallback(html, dateStr);

        for (let r = 1; r < rows.length; r++) {
            const cells = rows[r].querySelectorAll('td,th');
            if (cells.length < 2) continue;
            const label = cells[0].textContent.trim().toLowerCase().replace(/\s/g, '');
            const key = parsePrizeKey(label, r - 1);
            if (!key) continue;
            for (let c = 1; c < cells.length && c - 1 < provinces.length; c++) {
                const nums = extractNums(cells[c]);
                if (nums.length) provinces[c - 1].prizes[key] = nums;
            }
        }
        const results = provinces.filter(p => Object.keys(p.prizes).length > 0)
            .map(p => ({ province: p.name, date: dateStr, prizes: p.prizes }));
        return results.length ? results : extractFallback(html, dateStr);
    }

    function parsePrizeKey(label, rowIdx) {
        if (/đb|đặcbiệt|db/.test(label)) return 'db';
        for (let i = 1; i <= 8; i++) {
            if (label.includes(`g.${i}`) || label.includes(`g${i}`)) return `g${i}`;
        }
        if (rowIdx < PRIZE_ORDER.length) return PRIZE_ORDER[rowIdx];
        return null;
    }

    function extractNums(cell) {
        return cell.textContent.trim().split(/[\s,\-\|\/]+/).filter(p => /^\d{2,6}$/.test(p.trim())).map(p => p.trim());
    }

    function extractFallback(html, dateStr) {
        const six = [...new Set((html.match(/\b\d{6}\b/g) || []))];
        const five = [...new Set((html.match(/\b\d{5}\b/g) || []))];
        if (!six.length && !five.length) return [];
        const prizes = {};
        if (six.length) prizes.db = six.slice(0, 4);
        if (five.length > 0) prizes.g1 = five.slice(0, 1);
        if (five.length > 1) prizes.g2 = five.slice(1, 2);
        if (five.length > 3) prizes.g3 = five.slice(2, 4);
        if (five.length > 10) prizes.g4 = five.slice(4, 11);
        const dow = new Date(dateStr).getDay();
        const label = (XSMN_SCHEDULE[dow] || ['XSMN']).join(' - ');
        return [{ province: label, date: dateStr, prizes }];
    }

    /* ==============================
       MAIN CHECK FLOW
       ============================== */
    async function doCheck() {
        const raw = $('#userNumbers').value.trim();
        const digits = parseInt($('#checkDigits').value);
        const dateStr = $('#resultDate').value;

        if (!raw) { showStatus('Vui lòng nhập số vé cần dò', 'error'); return; }
        if (!dateStr) { showStatus('Vui lòng chọn ngày xổ', 'error'); return; }

        const userNums = raw.split(/[\n,;\s]+/).map(n => n.trim()).filter(n => /^\d{2,}$/.test(n));
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
                showStatus(`Không tìm thấy kết quả cho ngày ${fmtDisplay(dateStr)}. Có thể chưa có hoặc không phải ngày xổ.`, 'info');
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
            const matchedNumbersPerProvince = new Map(); // province -> Set of matched prize numbers

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

            // Render results with highlights
            const dow = new Date(dateStr).getDay();
            let html = `<div class="results-summary">📊 <strong>${DAY_NAMES[dow]}</strong>, ${fmtDisplay(dateStr)} — ${results.length} đài — Dò ${userNums.length} số (${digits} số cuối)</div>`;

            results.forEach((r, i) => {
                const matched = matchedNumbersPerProvince.get(r.province) || new Set();
                html += renderProvince(r, matched, i);
            });

            resContainer.innerHTML = html;

            // Show result
            if (allMatches.length > 0) {
                showWin(allMatches);
            } else {
                showLose();
            }
        } catch (err) {
            loading.style.display = 'none';
            showStatus(`Không thể tải kết quả. ${err.message}`, 'error');
        }
    }

    function renderProvince(result, matchedSet, index) {
        let rows = '';
        for (const key of PRIZE_DISPLAY) {
            const nums = result.prizes[key];
            if (!nums || !nums.length) continue;
            const special = key === 'db';
            const label = key === 'db' ? 'ĐB' : key.toUpperCase().replace('G', 'G.');
            const numsHtml = nums.map(n => {
                if (matchedSet.has(n)) return `<span class="matched">${n}</span>`;
                return n;
            }).join('&ensp;');
            rows += `<tr><td class="prize-label${special ? ' special' : ''}">${label}</td><td class="prize-numbers${special ? ' special' : ''}">${numsHtml}</td></tr>`;
        }
        return `<div class="province-card" style="animation-delay:${index * 0.08}s">
            <div class="province-header"><span class="province-name">🏛️ ${result.province}</span><span class="province-date">${fmtDisplay(result.date)}</span></div>
            <table class="results-table">${rows}</table></div>`;
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
        // Banner
        const banner = $('#resultBanner');
        banner.className = 'result-banner win';
        banner.innerHTML = `🎉 CHÚC MỪNG! Bạn trúng <strong>${matches.length}</strong> giải! 🎉`;
        banner.style.display = 'block';

        // Celebration modal details
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

        // Show effects
        launchFireworks();
        launchHoaMai();

        // Show modal after short delay
        setTimeout(() => {
            $('#celebrationModal').style.display = 'flex';
        }, 800);
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

        setTimeout(() => {
            $('#consolationModal').style.display = 'flex';
        }, 600);
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
                    x, y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1,
                    decay: 0.008 + Math.random() * 0.012,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    size: 2 + Math.random() * 3,
                    trail: []
                });
            }
        }

        // Launch multiple bursts
        function scheduleBursts() {
            for (let i = 0; i < 6; i++) {
                setTimeout(() => {
                    if (!fwAnimId) return;
                    createBurst(
                        canvas.width * (0.15 + Math.random() * 0.7),
                        canvas.height * (0.1 + Math.random() * 0.5)
                    );
                }, i * 500 + Math.random() * 300);
            }
        }

        scheduleBursts();
        // Additional waves
        setTimeout(() => { if (fwAnimId) scheduleBursts(); }, 3500);

        function animate() {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'lighter';

            for (let i = fwParticles.length - 1; i >= 0; i--) {
                const p = fwParticles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.04; // gravity
                p.vx *= 0.99;
                p.life -= p.decay;

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

        // Auto-stop after 8s
        setTimeout(stopFireworks, 8000);
    }

    function stopFireworks() {
        if (fwAnimId) {
            cancelAnimationFrame(fwAnimId);
            fwAnimId = null;
        }
        const canvas = $('#fireworksCanvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        fwParticles = [];
    }

    /* ==============================
       HOA MAI (Apricot Blossoms)
       ============================== */
    let hoaMaiInterval = null;

    function launchHoaMai() {
        const overlay = $('#hoaMaiOverlay');
        const petals = ['🌸', '🏵️', '💮', '✿', '❀', '🌼'];

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

        // Initial burst
        for (let i = 0; i < 20; i++) {
            setTimeout(createPetal, i * 100);
        }

        // Continuous petals
        hoaMaiInterval = setInterval(() => {
            for (let i = 0; i < 3; i++) createPetal();
        }, 400);

        // Auto-stop after 7s
        setTimeout(clearHoaMai, 7000);
    }

    function clearHoaMai() {
        if (hoaMaiInterval) {
            clearInterval(hoaMaiInterval);
            hoaMaiInterval = null;
        }
        // Let existing petals finish their animation naturally
    }

    /* ==============================
       PUBLIC
       ============================== */
    document.addEventListener('DOMContentLoaded', init);
    return { doCheck, toggleTheme };
})();
