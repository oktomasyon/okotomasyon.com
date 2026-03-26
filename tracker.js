/* ═══════════════════════════════════════════
   OK OTOMASYON — Gelişmiş Ziyaretçi Takip Sistemi v2
   Gerçek zamanlı çevrimiçi + toplam ziyaret + günlük/haftalık istatistik
   ═══════════════════════════════════════════ */

(function () {
    const STORAGE_KEY = 'okVisitors';
    const DAILY_KEY = 'okDailyStats';
    const MAX_RECORDS = 1000;
    const HEARTBEAT_INTERVAL = 30000; // 30 saniye
    const ONLINE_TIMEOUT = 60000; // 60 saniye — bu süre geçince offline say

    // ─── Cihaz / Tarayıcı Bilgileri ───
    function getDeviceType() {
        const ua = navigator.userAgent;
        if (/Mobi|Android.*Mobile|iPhone|iPod/i.test(ua)) return 'Mobil';
        if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) return 'Tablet';
        return 'Masaüstü';
    }

    function getBrowser() {
        const ua = navigator.userAgent;
        if (ua.includes('Firefox/')) return 'Firefox';
        if (ua.includes('Edg/')) return 'Edge';
        if (ua.includes('OPR/') || ua.includes('Opera/')) return 'Opera';
        if (ua.includes('YaBrowser/')) return 'Yandex';
        if (ua.includes('SamsungBrowser/')) return 'Samsung';
        if (ua.includes('Chrome/') && ua.includes('Safari/')) return 'Chrome';
        if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
        return 'Diğer';
    }

    function getOS() {
        const ua = navigator.userAgent;
        if (ua.includes('Windows')) return 'Windows';
        if (ua.includes('Mac OS')) return 'macOS';
        if (ua.includes('Android')) return 'Android';
        if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
        if (ua.includes('Linux')) return 'Linux';
        return 'Diğer';
    }

    function getReferrerSource() {
        const ref = document.referrer;
        if (!ref) return 'Doğrudan';
        try {
            const host = new URL(ref).hostname.toLowerCase();
            if (host.includes('google')) return 'Google';
            if (host.includes('yandex')) return 'Yandex';
            if (host.includes('bing')) return 'Bing';
            if (host.includes('facebook') || host.includes('fb.com')) return 'Facebook';
            if (host.includes('instagram')) return 'Instagram';
            if (host.includes('twitter') || host.includes('x.com')) return 'X/Twitter';
            if (host.includes('linkedin')) return 'LinkedIn';
            if (host.includes('youtube')) return 'YouTube';
            if (host.includes('whatsapp')) return 'WhatsApp';
            if (host.includes('telegram')) return 'Telegram';
            if (host.includes('tiktok')) return 'TikTok';
            return host;
        } catch { return 'Diğer'; }
    }

    // ─── Benzersiz Ziyaretçi ID ───
    function getVisitorId() {
        let id = localStorage.getItem('okVisitorId');
        if (!id) {
            id = 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('okVisitorId', id);
        }
        return id;
    }

    // ─── Tarih Yardımcıları ───
    function getTodayKey() {
        return new Date().toISOString().split('T')[0]; // "2026-03-26"
    }

    function getWeekStart() {
        const d = new Date();
        d.setDate(d.getDate() - d.getDay() + 1); // Pazartesi
        return d.toISOString().split('T')[0];
    }

    // ─── Günlük İstatistik Yönetimi ───
    function getDailyStats() {
        try {
            return JSON.parse(localStorage.getItem(DAILY_KEY) || '{}');
        } catch { return {}; }
    }

    function saveDailyStats(stats) {
        localStorage.setItem(DAILY_KEY, JSON.stringify(stats));
    }

    function incrementDailyVisit() {
        const stats = getDailyStats();
        const today = getTodayKey();
        if (!stats[today]) stats[today] = { visits: 0, uniqueVisitors: [] };
        stats[today].visits++;
        const vid = getVisitorId();
        if (!stats[today].uniqueVisitors.includes(vid)) {
            stats[today].uniqueVisitors.push(vid);
        }
        // Son 30 günü tut, eskilerini sil
        const keys = Object.keys(stats).sort();
        while (keys.length > 30) {
            delete stats[keys.shift()];
        }
        saveDailyStats(stats);
        return stats;
    }

    // ─── Çevrimiçi Ziyaretçi Takibi (BroadcastChannel + localStorage) ───
    const ONLINE_KEY = 'okOnlineUsers';
    const visitorId = getVisitorId();

    function getOnlineUsers() {
        try {
            const data = JSON.parse(localStorage.getItem(ONLINE_KEY) || '{}');
            // Timeout geçen kullanıcıları temizle
            const now = Date.now();
            const active = {};
            for (const [id, ts] of Object.entries(data)) {
                if (now - ts < ONLINE_TIMEOUT) {
                    active[id] = ts;
                }
            }
            return active;
        } catch { return {}; }
    }

    function heartbeat() {
        const users = getOnlineUsers();
        users[visitorId] = Date.now();
        localStorage.setItem(ONLINE_KEY, JSON.stringify(users));
    }

    function removeOnlineUser() {
        const users = getOnlineUsers();
        delete users[visitorId];
        localStorage.setItem(ONLINE_KEY, JSON.stringify(users));
    }

    // ─── Global Sayaç (Birden Fazla API ile Yedekli) ───
    async function getGlobalCount() {
        // API 1: CountAPI.xyz
        try {
            const res = await fetch('https://api.countapi.xyz/hit/okotomasyon.com/visits');
            if (res.ok) {
                const data = await res.json();
                if (data.value) return data.value;
            }
        } catch {}

        // API 2: CounterAPI.dev (yedek)
        try {
            const res = await fetch('https://api.counterapi.dev/v1/okotomasyon_com/visits/up');
            if (res.ok) {
                const data = await res.json();
                if (data.count) return data.count;
            }
        } catch {}

        // Fallback: localStorage
        const visits = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        return visits.length;
    }

    // ─── Ziyaret Kaydet ───
    async function recordVisit() {
        const visit = {
            ts: Date.now(),
            date: new Date().toLocaleString('tr-TR'),
            page: location.pathname + location.hash,
            device: getDeviceType(),
            browser: getBrowser(),
            os: getOS(),
            source: getReferrerSource(),
            referrer: document.referrer || '',
            screen: screen.width + 'x' + screen.height,
            lang: navigator.language || '',
            siteLang: localStorage.getItem('okLang') || 'tr',
            visitorId: visitorId,
            ip: '',
            country: '',
            city: '',
            isp: ''
        };

        // IP bilgisi (sessizce dene)
        try {
            const res = await fetch('https://ipapi.co/json/');
            if (res.ok) {
                const data = await res.json();
                visit.ip = data.ip || '';
                visit.country = data.country_name || '';
                visit.city = data.city || '';
                visit.isp = data.org || '';
            }
        } catch {}

        // localStorage'a kaydet
        let visits = [];
        try { visits = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { visits = []; }
        visits.push(visit);
        if (visits.length > MAX_RECORDS) {
            visits = visits.slice(visits.length - MAX_RECORDS);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));

        // Günlük istatistik güncelle
        incrementDailyVisit();

        // Global sayaç
        window.globalVisitCount = await getGlobalCount();
    }

    // ─── Badge Güncelle ───
    function updateVisitorBadge() {
        const onlineUsers = getOnlineUsers();
        const onlineCount = Object.keys(onlineUsers).length;

        const totalEl = document.getElementById('totalVisits');
        const liveEl = document.getElementById('liveCount');
        const dailyEl = document.getElementById('dailyVisits');
        const weeklyEl = document.getElementById('weeklyVisits');

        // Toplam ziyaret (sadece sayıyı güncelle, etiket HTML'de zaten var)
        if (totalEl) {
            const total = window.globalVisitCount || JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').length;
            totalEl.textContent = total.toLocaleString('tr-TR');
        }

        // Çevrimiçi (sadece sayıyı güncelle)
        if (liveEl) {
            liveEl.textContent = onlineCount;
        }

        // Günlük ziyaret
        if (dailyEl) {
            const stats = getDailyStats();
            const today = getTodayKey();
            const todayVisits = stats[today] ? stats[today].visits : 0;
            dailyEl.textContent = '📅 ' + todayVisits + ' Bugün';
        }

        // Haftalık ziyaret
        if (weeklyEl) {
            const stats = getDailyStats();
            const weekStart = getWeekStart();
            let weeklyTotal = 0;
            for (const [date, data] of Object.entries(stats)) {
                if (date >= weekStart) weeklyTotal += data.visits;
            }
            weeklyEl.textContent = '📊 ' + weeklyTotal + ' Bu Hafta';
        }
    }

    // ─── Çalıştır ───
    if (!location.pathname.includes('admin')) {
        // İlk heartbeat
        heartbeat();

        // Ziyaret kaydet ve badge güncelle
        recordVisit().then(() => {
            updateVisitorBadge();
        });

        // Düzenli heartbeat (30 saniyede bir)
        setInterval(() => {
            heartbeat();
            updateVisitorBadge();
        }, HEARTBEAT_INTERVAL);

        // Sayfa kapandığında çevrimiçi listesinden çıkar
        window.addEventListener('beforeunload', removeOnlineUser);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Sekme arka plana geçti — hala çevrimiçi say ama heartbeat yavaşlat
            } else {
                heartbeat();
                updateVisitorBadge();
            }
        });
    }

    // Admin panel için global erişim
    window.okTracker = {
        getVisits: () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'),
        getDailyStats: getDailyStats,
        getOnlineCount: () => Object.keys(getOnlineUsers()).length,
        clearData: () => {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(DAILY_KEY);
            localStorage.removeItem(ONLINE_KEY);
        }
    };
})();
