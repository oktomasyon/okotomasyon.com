/* ═══════════════════════════════════════════
   OK OTOMASYON — Gerçek Zamanlı Ziyaretçi Takip v3
   Firebase Realtime Database ile
   - Anlık bağlı ziyaretçi (gerçek zamanlı)
   - Sayfa yenilemede artmaz
   - Günlük / Haftalık / Aylık / Yıllık toplam
   ═══════════════════════════════════════════ */

(function () {
    // Firebase SDK zaten index.html'de yükleniyor
    const FIREBASE_CONFIG = {
        apiKey: "AIzaSyAPc6IV1tzCPLO7Jj5ZcRNuJNsjQdMiK6k",
        authDomain: "okotomasyon-tracker.firebaseapp.com",
        databaseURL: "https://okotomasyon-tracker-default-rtdb.firebaseio.com",
        projectId: "okotomasyon-tracker",
        storageBucket: "okotomasyon-tracker.firebasestorage.app",
        messagingSenderId: "917865787896",
        appId: "1:917865787896:web:d62475c8cf39f53ad8260d",
        measurementId: "G-6K5PEXJY7G"
    };

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
    function getTodayKey() { return new Date().toISOString().split('T')[0]; }
    function getWeekKey() {
        const d = new Date();
        const onejan = new Date(d.getFullYear(), 0, 1);
        const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
        return d.getFullYear() + '-W' + String(week).padStart(2, '0');
    }
    function getMonthKey() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
    function getYearKey() { return String(new Date().getFullYear()); }

    // ─── Cihaz Bilgileri ───
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
        if (ua.includes('OPR/')) return 'Opera';
        if (ua.includes('YaBrowser/')) return 'Yandex';
        if (ua.includes('Chrome/') && ua.includes('Safari/')) return 'Chrome';
        if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
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
            if (host.includes('whatsapp')) return 'WhatsApp';
            return host;
        } catch { return 'Diğer'; }
    }

    const visitorId = getVisitorId();
    let db = null;
    let onlineCount = 1;

    // ─── Firebase Başlat ───
    function initFirebase() {
        try {
            // Firebase zaten yüklü mü kontrol et
            if (typeof firebase === 'undefined') {
                console.warn('⚠️ Firebase SDK yüklenmemiş, yerel mod kullanılıyor');
                fallbackMode();
                return;
            }

            // Firebase'i başlat (zaten başlatılmışsa tekrar başlatma)
            if (!firebase.apps.length) {
                firebase.initializeApp(FIREBASE_CONFIG);
            }
            db = firebase.database();

            // Anonim giriş yap
            firebase.auth().signInAnonymously().then(() => {
                setupPresence();
                recordVisit();
                listenToStats();
            }).catch(err => {
                console.warn('Firebase auth hatası:', err.message);
                fallbackMode();
            });
        } catch (e) {
            console.warn('Firebase başlatma hatası:', e.message);
            fallbackMode();
        }
    }

    // ─── PRESENCE (Anlık Çevrimiçi) ───
    function setupPresence() {
        const presenceRef = db.ref('presence/' + visitorId);
        const connectedRef = db.ref('.info/connected');

        connectedRef.on('value', (snap) => {
            if (snap.val() === true) {
                // Bağlıyız
                presenceRef.set({
                    online: true,
                    lastSeen: firebase.database.ServerValue.TIMESTAMP,
                    device: getDeviceType(),
                    browser: getBrowser(),
                    page: location.pathname
                });

                // Bağlantı koptuğunda otomatik sil
                presenceRef.onDisconnect().remove();
            }
        });

        // Anlık çevrimiçi sayısını dinle
        db.ref('presence').on('value', (snap) => {
            const data = snap.val();
            onlineCount = data ? Object.keys(data).length : 0;
            updateBadge();
        });
    }

    // ─── ZİYARET KAYDET (Tekrar sayma korumalı) ───
    function recordVisit() {
        // Session kontrolü: Bu oturumda zaten sayıldı mı?
        if (sessionStorage.getItem('okVisitCounted')) {
            return; // Sayfa yenilemede tekrar saymaz!
        }
        sessionStorage.setItem('okVisitCounted', 'true');

        const today = getTodayKey();
        const week = getWeekKey();
        const month = getMonthKey();
        const year = getYearKey();

        // Toplam ziyareti artır (transaction ile güvenli)
        db.ref('stats/total').transaction(val => (val || 0) + 1);

        // Günlük
        db.ref('stats/daily/' + today).transaction(val => (val || 0) + 1);

        // Haftalık
        db.ref('stats/weekly/' + week).transaction(val => (val || 0) + 1);

        // Aylık
        db.ref('stats/monthly/' + month).transaction(val => (val || 0) + 1);

        // Yıllık
        db.ref('stats/yearly/' + year).transaction(val => (val || 0) + 1);

        // Detaylı kayıt (son 100 ziyaret)
        db.ref('visits').push({
            visitorId: visitorId,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            page: location.pathname,
            device: getDeviceType(),
            browser: getBrowser(),
            source: getReferrerSource(),
            screen: screen.width + 'x' + screen.height
        });
    }

    // ─── İSTATİSTİKLERİ DİNLE ───
    function listenToStats() {
        const today = getTodayKey();
        const week = getWeekKey();
        const month = getMonthKey();
        const year = getYearKey();

        // Toplam
        db.ref('stats/total').on('value', snap => {
            window.okStats = window.okStats || {};
            window.okStats.total = snap.val() || 0;
            updateBadge();
        });

        // Günlük
        db.ref('stats/daily/' + today).on('value', snap => {
            window.okStats = window.okStats || {};
            window.okStats.daily = snap.val() || 0;
            updateBadge();
        });

        // Haftalık
        db.ref('stats/weekly/' + week).on('value', snap => {
            window.okStats = window.okStats || {};
            window.okStats.weekly = snap.val() || 0;
            updateBadge();
        });

        // Aylık
        db.ref('stats/monthly/' + month).on('value', snap => {
            window.okStats = window.okStats || {};
            window.okStats.monthly = snap.val() || 0;
            updateBadge();
        });

        // Yıllık
        db.ref('stats/yearly/' + year).on('value', snap => {
            window.okStats = window.okStats || {};
            window.okStats.yearly = snap.val() || 0;
            updateBadge();
        });
    }

    // ─── BADGE GÜNCELLE ───
    function updateBadge() {
        const stats = window.okStats || {};

        const liveEl = document.getElementById('liveCount');
        const dailyEl = document.getElementById('dailyVisits');
        const weeklyEl = document.getElementById('weeklyVisits');
        const totalEl = document.getElementById('totalVisits');

        if (liveEl) liveEl.textContent = onlineCount;
        if (dailyEl) dailyEl.textContent = '📅 ' + (stats.daily || 0) + ' Bugün';
        if (weeklyEl) weeklyEl.textContent = '📊 ' + (stats.weekly || 0) + ' Bu Hafta';
        if (totalEl) totalEl.textContent = (stats.total || 0).toLocaleString('tr-TR');
    }

    // ─── FALLBACK (Firebase yoksa) ───
    function fallbackMode() {
        // sessionStorage ile yenileme koruması
        if (!sessionStorage.getItem('okVisitCounted')) {
            sessionStorage.setItem('okVisitCounted', 'true');

            // Yerel sayaç
            let total = parseInt(localStorage.getItem('okTotalVisits') || '0');
            total++;
            localStorage.setItem('okTotalVisits', String(total));

            // Günlük sayaç
            const today = getTodayKey();
            let dailyData = {};
            try { dailyData = JSON.parse(localStorage.getItem('okDailyStats') || '{}'); } catch {}
            if (!dailyData[today]) dailyData[today] = 0;
            dailyData[today]++;
            localStorage.setItem('okDailyStats', JSON.stringify(dailyData));
        }

        // Badge güncelle
        const total = parseInt(localStorage.getItem('okTotalVisits') || '0');
        const dailyData = JSON.parse(localStorage.getItem('okDailyStats') || '{}');
        const today = getTodayKey();
        const weekStart = getWeekKey();

        const liveEl = document.getElementById('liveCount');
        const dailyEl = document.getElementById('dailyVisits');
        const weeklyEl = document.getElementById('weeklyVisits');
        const totalEl = document.getElementById('totalVisits');

        if (liveEl) liveEl.textContent = '1';
        if (dailyEl) dailyEl.textContent = '📅 ' + (dailyData[today] || 0) + ' Bugün';
        if (totalEl) totalEl.textContent = total.toLocaleString('tr-TR');

        // Haftalık hesapla
        if (weeklyEl) {
            let weeklyTotal = 0;
            const now = new Date();
            for (let i = 0; i < 7; i++) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                const key = d.toISOString().split('T')[0];
                weeklyTotal += (dailyData[key] || 0);
            }
            weeklyEl.textContent = '📊 ' + weeklyTotal + ' Bu Hafta';
        }
    }

    // ─── BAŞLAT ───
    if (!location.pathname.includes('admin')) {
        // Firebase SDK'yı bekle
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(initFirebase, 500));
        } else {
            setTimeout(initFirebase, 500);
        }
    }
})();
