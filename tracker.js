/* ═══════════════════════════════════════════
   OK OTOMASYON — Ziyaretçi Takip Sistemi
   ═══════════════════════════════════════════ */

(function () {
    const STORAGE_KEY = 'okVisitors';
    const MAX_RECORDS = 500;

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

    function getScreenSize() {
        return screen.width + 'x' + screen.height;
    }

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
            screen: getScreenSize(),
            lang: navigator.language || '',
            siteLang: localStorage.getItem('okLang') || 'tr',
            ip: '',
            country: '',
            city: '',
            isp: ''
        };

        // IP ve konum bilgisi al (HTTPS destekli API)
        try {
            const res = await fetch('https://ipapi.co/json/');
            if (res.ok) {
                const data = await res.json();
                visit.ip = data.ip || '';
                visit.country = data.country_name || '';
                visit.city = data.city || '';
                visit.isp = data.org || '';
            }
        } catch { /* sessizce devam et */ }

        // GERÇEK GLOBAL TRAFİK SAYACI (CounterAPI)
        try {
            const countRes = await fetch('https://api.counterapi.dev/v1/okotomasyon_com/visits/up');
            if (countRes.ok) {
                const countData = await countRes.json();
                window.globalVisitCount = countData.count;
            }
        } catch { /* API hatası, sessizce geç */ }

        // localStorage'a kaydet (admin panel için cihazdaki geçmişi tutar)
        let visits = [];
        try { visits = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { visits = []; }
        visits.push(visit);
        if (visits.length > MAX_RECORDS) {
            visits = visits.slice(visits.length - MAX_RECORDS);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
    }

    // Sayfa yüklendiğinde kaydet
    if (!location.pathname.includes('admin')) {
        recordVisit().then(() => {
            updateVisitorBadge();
        });
    }

    async function updateVisitorBadge() {
        const visits = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const totalEl = document.getElementById('totalVisits');
        const liveEl = document.getElementById('liveCount');

        if (totalEl) {
            totalEl.innerHTML = `<span style="color:#6b7280; font-size:1.1rem; vertical-align:middle; margin-right:4px;">&#128065;</span><span style="color:#4b5563; font-weight:500;">${window.globalVisitCount || visits.length} Toplam Ziyaret</span>`;
        }

        if (liveEl) {
            // Gerçek zamanlı trafik sayacı için 1 saatlik (veya günlük) pencere mantığını API ile çekiyoruz
            // Bu yöntem statik sitelerde API tabanlı geçici canlılık sağlar.
            let activeGlobal = 1;
            try {
                // Her gün için benzersiz bir canlı anahtar oluştur (Örn: okotomasyon_live_20231024)
                const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
                const liveKey = `okotomasyon_live_${today}`;

                // Ziyaret edeni anlık sayaca ekle
                await fetch(`https://api.counterapi.dev/v1/${liveKey}/active/up`);

                // Anlık sayaç değerini oku
                const liveRes = await fetch(`https://api.counterapi.dev/v1/${liveKey}/active`);
                if (liveRes.ok) {
                    const liveData = await liveRes.json();
                    activeGlobal = liveData.count || 1;
                }
            } catch (e) {
                // Hata durumunda yerel fallback
                const fiveMin = Date.now() - 300000;
                activeGlobal = Math.max(1, visits.filter(v => v.ts > fiveMin).length);
            }

            liveEl.innerHTML = `<span style="color:#10b981; font-weight:600;">${activeGlobal} Çevrimiçi</span>`;
        }
    }
})();
