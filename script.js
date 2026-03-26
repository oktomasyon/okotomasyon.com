/* ═══════════════════════════════════════════
   OK OTOMASYON — Render Motoru & İnteraktifler
   ═══════════════════════════════════════════ */

// ─── TCMB DÖVİZ KURU SİSTEMİ ───
let tcmbKur = null; // Güncel USD/TRY efektif satış kuru
const KDV_ORAN = 1.20; // %20 KDV

function formatTL(amount) {
    return '₺' + Math.round(amount).toLocaleString('tr-TR');
}

function getPrice(item) {
    if (item.priceUSD && tcmbKur) {
        return formatTL(item.priceUSD * tcmbKur * KDV_ORAN);
    }
    return item.price || '';
}

async function fetchTCMBKur() {
    // Cache kontrolü — 30 dakika geçerli
    const cached = localStorage.getItem('tcmbKurData');
    if (cached) {
        try {
            const data = JSON.parse(cached);
            if (Date.now() - data.timestamp < 30 * 60 * 1000) {
                tcmbKur = data.kur;
                console.log('📌 TCMB kuru (cache):', tcmbKur, 'TL/USD');
                updateAllPrices();
                return;
            }
        } catch (e) { /* cache hatalı, yeniden çek */ }
    }

    try {
        const res = await fetch('https://hasanadiguzel.com.tr/api/kurgetir');
        const json = await res.json();
        const usd = json.TCMB_AnlikKurBilgileri.find(c => c.CurrencyName === 'US DOLLAR');
        if (usd && usd.BanknoteSelling) {
            tcmbKur = parseFloat(usd.BanknoteSelling);
            localStorage.setItem('tcmbKurData', JSON.stringify({ kur: tcmbKur, timestamp: Date.now() }));
            console.log('✅ TCMB efektif satış kuru:', tcmbKur, 'TL/USD');
            updateAllPrices();
        }
    } catch (err) {
        console.warn('⚠️ TCMB kuru alınamadı, statik fiyatlar kullanılıyor:', err.message);
    }
}

function updateAllPrices() {
    if (!tcmbKur) return;
    // Products (KDV dahil)
    SITE.products.forEach(p => { if (p.priceUSD) p.price = formatTL(p.priceUSD * tcmbKur * KDV_ORAN); });
    // Climate (KDV dahil)
    SITE.climate.forEach(c => { if (c.priceUSD) c.price = formatTL(c.priceUSD * tcmbKur * KDV_ORAN); });
    // Sensors (KDV dahil)
    SITE.sensors.forEach(s => { if (s.priceUSD) s.price = formatTL(s.priceUSD * tcmbKur * KDV_ORAN); });
    // Sayfayı yeniden render et
    renderPage(currentLang);
}

// URL parametresinden dil algılama (SEO hreflang uyumu)
const urlLang = new URLSearchParams(window.location.search).get('lang');
let currentLang = urlLang && ['tr', 'en', 'ru', 'ar'].includes(urlLang) ? urlLang : (localStorage.getItem('okLang') || 'tr');
const langLabels = { tr: '🇹🇷 TR', en: '🇬🇧 EN', ru: '🇷🇺 RU', ar: '🇸🇦 AR' };

// ─── DİL SİSTEMİ ───
function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('okLang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.getElementById('langBtn').textContent = langLabels[lang];
    document.getElementById('langDropdown').classList.remove('active');
    renderPage(lang);
}

// ─── ANA RENDER FONKSİYONU ───
function renderPage(lang) {
    const L = lang || currentLang;
    renderNav(L);
    renderHero(L);
    renderStats(L);
    renderAbout(L);
    renderProducts(L);
    renderAgriNexus(L);
    renderClimate(L);
    renderSensors(L);
    renderEngineering(L);
    renderContact(L);
    renderFooter(L);
    initScrollAnimations();
}

// ─── NAVİGASYON ───
function renderNav(L) {
    const n = SITE.nav[L];
    document.getElementById('navLinks').innerHTML = `
        <li><a href="#hakkimizda">${n.about}</a></li>
        <li class="nav-dropdown-parent">
            <a href="#urunler" class="nav-dropdown-trigger">${n.products} ▾</a>
            <div class="nav-dropdown-menu">
                <a href="#urunler">${n.products}</a>
                <a href="#sensorler">${n.sensors}</a>
            </div>
        </li>
        <li><a href="#agrinexus">${n.agrinexus}</a></li>
        <li><a href="#iklimlendirme">${n.climate}</a></li>
        <li><a href="#iletisim">${n.contact}</a></li>`;
    document.getElementById('navCta').textContent = n.cta;
    document.getElementById('mobileMenu').innerHTML = `
        <a href="#hakkimizda">${n.about}</a>
        <a href="#urunler">${n.products}</a>
        <a href="#sensorler">${n.sensors}</a>
        <a href="#agrinexus">${n.agrinexus}</a>
        <a href="#iklimlendirme">${n.climate}</a>
        <a href="#iletisim">${n.contact}</a>`;
}

// ─── HERO ───
function renderHero(L) {
    const h = SITE.hero[L];
    document.getElementById('heroContent').innerHTML = `
        <p class="hero-eyebrow">${h.eyebrow}</p>
        <h1>${h.h1}</h1>
        <p class="hero-desc">${h.desc}</p>
        <div class="hero-buttons">
            <a href="#urunler" class="btn-primary">${h.btn1}</a>
            <a href="#iletisim" class="btn-outline">${h.btn2}</a>
        </div>`;
}

// ─── STATS ───
function renderStats(L) {
    const s = SITE.stats[L];
    document.getElementById('statsInner').innerHTML = s.map((st, i) =>
        `<div class="stat-item reveal-up ${i > 0 ? 'delay-' + i : ''}">
            <div class="stat-number" data-count="${st.val}" data-suffix="${st.suffix}">0</div>
            <div class="stat-label">${st.label}</div>
        </div>`
    ).join('');
}

// ─── HAKKIMIZDA ───
function renderAbout(L) {
    const a = SITE.about[L];
    document.getElementById('aboutContent').innerHTML = `
        <p class="section-eyebrow">${a.eyebrow}</p>
        <h2>${a.h2}</h2>
        <p>${a.p1}</p>
        <p>${a.p2}</p>
        <div class="about-features">
            ${a.features.map(f => `
                <div class="about-feature">
                    <div class="feature-icon">${f.icon}</div>
                    <div><h4>${f.title}</h4><p>${f.desc}</p></div>
                </div>`).join('')}
        </div>`;
}

// ─── ÜRÜNLER ───
function renderProducts(L) {
    const ps = SITE.productsSection[L];
    document.getElementById('productsHeader').innerHTML = `
        <p class="section-eyebrow">${ps.eyebrow}</p>
        <h2>${ps.h2}</h2>
        <p class="section-desc">${ps.desc}</p>`;

    const prods = getProductsList();
    document.getElementById('productsGrid').innerHTML = prods.map((p, i) => {
        const badgeClass = p.id === 'promix' ? 'badge-popular' : p.id === 'promax' ? 'badge-pro' : p.id === 'alp2017' ? 'badge-flagship' : '';
        const wideClass = p.wide ? 'product-card-wide' : '';
        const delays = ['', '', 'delay-2', 'delay-3'];
        const specKeys = p.specLabels;
        return `<div class="product-card ${wideClass} reveal-up ${delays[i] || ''}">
            <div class="product-img-wrap">
                <img src="${p.image}" alt="${p.name}">
                <span class="product-badge ${badgeClass}">${p.badge[L]}</span>
            </div>
            <div class="product-body">
                <h3>${p.name}</h3>
                <p class="product-tagline">${p.tagline[L]}</p>
                <ul class="product-specs">
                    ${p.specs[L].map((s, j) => `<li><strong>${ps[specKeys[j]] || ''}:</strong> ${s}</li>`).join('')}
                </ul>
                <div class="product-footer">
                    <div class="product-price">${p.price} <span>${ps.exVat}</span></div>
                    <button class="add-to-cart-btn" onclick="addToCart('${p.name.replace(/'/g, "\\'")}','${p.price}')">${ps.addCart}</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ─── AGRINEXUS ───
function renderAgriNexus(L) {
    const a = SITE.agrinexus[L];
    document.getElementById('agrinexusContent').innerHTML = `
        <p class="section-eyebrow eyebrow-light">${a.eyebrow}</p>
        <h2>${a.h2}</h2>
        <p class="agrinexus-desc">${a.desc}</p>
        <div class="anx-features-grid">
            ${a.features.map(f => `
                <div class="anx-feature">
                    <div class="anx-icon">${f.icon}</div>
                    <div><h4>${f.title}</h4><p>${f.desc}</p></div>
                </div>`).join('')}
        </div>`;
}

// ─── İKLİMLENDİRME ───
function renderClimate(L) {
    const cs = SITE.climateSection[L];
    document.getElementById('climateHeader').innerHTML = `
        <p class="section-eyebrow">${cs.eyebrow}</p>
        <h2>${cs.h2}</h2>
        <p class="section-desc">${cs.desc}</p>`;

    const items = getClimateList();
    document.getElementById('climateGrid').innerHTML = items.map((c, i) => {
        const featured = c.featured ? 'climate-card-featured' : '';
        const flagship = c.flagship ? 'climate-card-flagship' : '';
        const delays = ['', 'delay-1', 'delay-2', '', 'delay-1', 'delay-2'];
        const badgeClass = c.featured ? 'badge-popular' : c.flagship ? 'badge-flagship' : c.sectors >= 4 ? 'badge-pro' : '';
        const popLabel = c.popularLabel ? `<div class="climate-popular">${c.popularLabel[L]}</div>` : '';
        return `<div class="climate-product-card ${featured} ${flagship} reveal-up ${delays[i]}">
            ${popLabel}
            <div class="climate-product-img">
                <img src="${c.image}" alt="${c.name[L]}">
                <span class="climate-badge ${badgeClass}">${c.badge[L]}</span>
            </div>
            <div class="climate-product-body">
                <h3>${c.name[L]}</h3>
                <p class="climate-product-desc">${c.desc[L]}</p>
                <ul class="climate-specs">
                    ${c.specs[L].map(s => `<li>${s}</li>`).join('')}
                </ul>
                <div class="climate-product-footer">
                    <div class="climate-price">${c.price} <span>${cs.exVat}</span></div>
                    <button class="add-to-cart-btn" onclick="addToCart('${c.name[L].replace(/'/g, "\\'")}','${c.price}')">${cs.addCart}</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ─── SENSÖR & ÖLÇÜM ───
let activeSensorFilter = 'all';
function renderSensors(L) {
    const ss = SITE.sensorsSection[L];
    document.getElementById('sensorsHeader').innerHTML = `
        <p class="section-eyebrow">${ss.eyebrow}</p>
        <h2>${ss.h2.replace('\n', '<br>')}</h2>
        <p class="section-desc">${ss.desc}</p>`;

    // Kategori filtreleri
    const categories = [
        { key: 'all', tr: 'Tümü', en: 'All', ru: 'Все', ar: 'الكل' },
        { key: 'machine', tr: 'Makine', en: 'Machine', ru: 'Машина', ar: 'آلة' },
        { key: 'transmitter', tr: 'Transmitter', en: 'Transmitter', ru: 'Трансмиттер', ar: 'محول' },
        { key: 'metre', tr: 'Ölçüm Cihazı', en: 'Meter', ru: 'Измеритель', ar: 'جهاز قياس' },
        { key: 'probe', tr: 'Prob & Sensör', en: 'Probe & Sensor', ru: 'Датчик', ar: 'مسبار' },
        { key: 'valve', tr: 'Vana', en: 'Valve', ru: 'Клапан', ar: 'صمام' },
    ];

    document.getElementById('sensorsFilter').innerHTML = categories.map(c =>
        `<button class="sensor-filter-btn ${activeSensorFilter === c.key ? 'active' : ''}" onclick="filterSensors('${c.key}')">${c[L]}</button>`
    ).join('');

    const items = getSensorsList().filter(s => activeSensorFilter === 'all' || s.category === activeSensorFilter);

    document.getElementById('sensorsGrid').innerHTML = items.map((s, i) => {
        const name = typeof s.name === 'string' ? s.name : (s.name[L] || s.name.tr || '');
        const tagline = (s.tagline && s.tagline[L]) || '';
        const badge = (s.badge && s.badge[L]) || '';
        const specs = (s.specs && s.specs[L]) || [];
        const delays = ['', 'delay-1', 'delay-2', '', 'delay-1', 'delay-2', '', 'delay-1', 'delay-2', '', '', ''];
        return `<div class="sensor-card reveal-up ${delays[i] || ''}">
            <div class="sensor-card-img">
                <img src="${s.image}" alt="${name}" loading="lazy">
                <span class="sensor-badge">${badge}</span>
            </div>
            <div class="sensor-card-header">
                <span class="sensor-partner">${ss.partner}</span>
            </div>
            <div class="sensor-card-body">
                <h3>${name}</h3>
                <p class="sensor-tagline">${tagline}</p>
                <ul class="sensor-specs">
                    ${specs.map(sp => `<li>✓ ${sp}</li>`).join('')}
                </ul>
                ${s.price ? `<p class="sensor-price">${s.price} <span style="font-size:0.7em;font-weight:400;opacity:0.7">KDV Dahil</span></p>` : ''}
            </div>
            <div class="sensor-card-footer">
                <a href="https://wa.me/905066800525?text=${encodeURIComponent(name + ' hakkında bilgi almak istiyorum')}" class="sensor-inquiry-btn" target="_blank">${ss.inquiryBtn}</a>
            </div>
        </div>`;
    }).join('');
}

function filterSensors(cat) {
    activeSensorFilter = cat;
    renderSensors(currentLang);
    // Yeni oluşturulan kartlara visible class'ı ekle (IntersectionObserver yeniden observe etmez)
    document.querySelectorAll('#sensorsGrid .sensor-card').forEach(el => {
        el.classList.add('visible');
    });
}

// ─── MÜHENDİSLİK ───
function renderEngineering(L) {
    const e = SITE.engineering[L];
    document.getElementById('engineeringHeader').innerHTML = `
        <p class="section-eyebrow">${e.eyebrow}</p>
        <h2>${e.h2}</h2>`;
    document.getElementById('engineeringGrid').innerHTML = e.items.map(f => `
        <div class="about-feature reveal-up">
            <div class="feature-icon">${f.icon}</div>
            <div><h4>${f.title}</h4><p>${f.desc}</p></div>
        </div>`).join('');
}

// ─── İLETİŞİM ───
function renderContact(L) {
    const c = SITE.contact[L];
    const ppl = SITE.people;
    document.getElementById('contactHeader').innerHTML = `
        <p class="section-eyebrow">${c.eyebrow}</p>
        <h2>${c.h2}</h2>
        <p class="section-desc">${c.desc}</p>`;

    document.getElementById('contactGrid').innerHTML = `
        <div class="contact-info reveal-up">
            <div class="contact-detail">
                <div class="contact-icon">🏢</div>
                <div><strong>${c.officeTitle}</strong><p>${c.officeDesc}</p></div>
            </div>
            <div class="contact-detail">
                <div class="contact-icon">📍</div>
                <div><strong>${L === 'tr' ? 'Adres' : 'Address'}</strong><p>${c.address}</p></div>
            </div>
            ${ppl.map(p => `<div class="contact-detail">
                <div class="contact-icon">👤</div>
                <div><strong>${p.name}</strong><p>📧 ${p.email}<br>📞 ${p.phone}</p></div>
            </div>`).join('')}
        </div>
        <form class="contact-form reveal-up delay-1" name="iletisim" method="POST" data-netlify="true" id="contactForm">
            <input type="hidden" name="form-name" value="iletisim">
            <div class="form-group"><label>${c.formName}</label><input type="text" name="isim" required></div>
            <div class="form-group"><label>${c.formEmail}</label><input type="email" name="email" required></div>
            <div class="form-group">
                <label>${c.formArea}</label>
                <select name="alan">
                    <option value="">${c.formSelect}</option>
                    <option value="sulama">${c.formOpt1}</option>
                    <option value="iklim">${c.formOpt2}</option>
                    <option value="agrinexus">${c.formOpt3}</option>
                    <option value="proje">${c.formOpt4}</option>
                    <option value="diger">${c.formOpt5}</option>
                </select>
            </div>
            <div class="form-group"><label>${c.formMsg}</label><textarea name="mesaj" placeholder="${c.formMsg.toLowerCase()}..."></textarea></div>
            <button type="submit" class="form-submit">${c.formBtn}</button>
            <div class="form-success" id="formSuccess">${c.formSuccess}</div>
        </form>`;
}

// ─── FOOTER ───
function renderFooter(L) {
    const f = SITE.footer[L];
    const n = SITE.nav[L];
    const ppl = SITE.people;
    const c = SITE.contact[L];
    document.getElementById('footerSection').innerHTML = `
        <div class="footer-inner">
            <div class="footer-brand">
                <div class="nav-logo"><img src="ok-icon.png" alt="OK Otomasyon - Sera Sulama ve Gübreleme Makineleri" class="nav-logo-img" width="40" height="40" loading="lazy"><span class="logo-k">K</span><span class="logo-divider"></span><span class="logo-accent">OTOMASYON</span></div>
                <p>${f.desc}</p>
            </div>
            <div class="footer-links">
                <h4>${f.quickLinks}</h4>
                <a href="#">${f.home}</a>
                <a href="#hakkimizda">${n.about}</a>
                <a href="#urunler">${n.products}</a>
                <a href="#agrinexus">${n.agrinexus}</a>
                <a href="#iletisim">${n.contact}</a>
            </div>
            <div class="footer-links">
                <h4>${n.products}</h4>
                <a href="#urunler">MİNİMİX</a>
                <a href="#urunler">PROMİX</a>
                <a href="#urunler">PROMAX</a>
                <a href="#urunler">ALP 2017</a>
                <a href="#iklimlendirme">${n.climate}</a>
            </div>
            <div class="footer-contact">
                <h4>${n.contact}</h4>
                <p>${c.address}</p>
                ${ppl.map(p => `<p>📧 ${p.email}</p><p>📞 ${p.phone}</p>`).join('')}
            </div>
        </div>
        <div class="visitor-bar">
            <span class="visitor-live"><span class="pulse-dot"></span> <span id="liveCount">1</span> ${SITE.visitorBar ? SITE.visitorBar[L]?.online || 'Çevrimiçi' : 'Çevrimiçi'}</span>
            <span class="visitor-sep">|</span>
            <span class="visitor-total">👁 <span id="totalVisits">0</span> ${SITE.visitorBar ? SITE.visitorBar[L]?.total || 'Toplam Ziyaret' : 'Toplam Ziyaret'}</span>
        </div>
        <div class="footer-bottom">${f.copyright}</div>`;
}

// ─── ÜRÜN LİSTELERİ (localStorage öncelikli — admin değişikliklerini yansıtır) ───
function getProductsList() {
    const saved = localStorage.getItem('okProducts');
    return saved ? JSON.parse(saved) : SITE.products;
}
function getClimateList() {
    const saved = localStorage.getItem('okClimate');
    return saved ? JSON.parse(saved) : SITE.climate;
}
function getSensorsList() {
    const saved = localStorage.getItem('okSensors');
    return saved ? JSON.parse(saved) : SITE.sensors;
}

// ═══════════════════════════════════════════
// SCROLL ANİMASYONLAR & ETKİLEŞİMLER
// ═══════════════════════════════════════════

function initScrollAnimations() {
    // Reveal on scroll
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal-up').forEach(el => obs.observe(el));

    // Counter animation
    document.querySelectorAll('.stat-number').forEach(el => {
        const countObs = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    const target = +el.dataset.count;
                    const suffix = el.dataset.suffix || '';
                    let current = 0;
                    const step = Math.ceil(target / 60);
                    const timer = setInterval(() => {
                        current += step;
                        if (current >= target) { current = target; clearInterval(timer); }
                        el.textContent = current + suffix;
                    }, 25);
                    countObs.unobserve(el);
                }
            });
        }, { threshold: 0.5 });
        countObs.observe(el);
    });
}

// ─── NAV ETKİLERİ ───
window.addEventListener('scroll', () => {
    const nav = document.getElementById('mainNav');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
});

// ─── HAMBURGER MENU ───
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            mobileMenu.classList.toggle('active');
        });
        mobileMenu.addEventListener('click', e => {
            if (e.target.tagName === 'A') {
                hamburger.classList.remove('active');
                mobileMenu.classList.remove('active');
            }
        });
    }

    // Dil seçici dropdown
    const langBtn = document.getElementById('langBtn');
    const langDropdown = document.getElementById('langDropdown');
    if (langBtn && langDropdown) {
        langBtn.addEventListener('click', e => { e.stopPropagation(); langDropdown.classList.toggle('active'); });
        document.addEventListener('click', () => langDropdown.classList.remove('active'));
    }

    // İletişim formu
    document.addEventListener('submit', function (e) {
        if (e.target.id === 'contactForm') {
            e.preventDefault();
            const fd = new FormData(e.target);
            fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fd).toString() })
                .then(() => { document.getElementById('formSuccess').classList.add('show'); e.target.reset(); setTimeout(() => document.getElementById('formSuccess').classList.remove('show'), 5000); })
                .catch(() => { window.open('mailto:kursatsunar@gmail.com?subject=İletişim&body=' + encodeURIComponent('İsim: ' + fd.get('isim') + '\nMesaj: ' + fd.get('mesaj'))); });
        }
    });

    // İlk render
    renderPage(currentLang);

    // TCMB döviz kurunu çek ve fiyatları güncelle
    fetchTCMBKur();
});

// ═══════════════════════════════════════════
// SEPET SİSTEMİ
// ═══════════════════════════════════════════

let cart = JSON.parse(localStorage.getItem('okCart') || '[]');
let captchaA = 0, captchaB = 0;

function addToCart(name, price) {
    cart.push({ name, price });
    localStorage.setItem('okCart', JSON.stringify(cart));
    renderCartUI();
    const icon = document.getElementById('cartIcon');
    icon.style.transform = 'scale(1.3)';
    setTimeout(() => icon.style.transform = 'scale(1)', 200);
    toggleCart(true);
}

function removeFromCart(idx) {
    cart.splice(idx, 1);
    localStorage.setItem('okCart', JSON.stringify(cart));
    renderCartUI();
}

function toggleCart(forceOpen) {
    const overlay = document.getElementById('cartOverlay');
    const panel = document.getElementById('cartPanel');
    if (forceOpen === true) { overlay.classList.add('active'); panel.classList.add('active'); }
    else { overlay.classList.toggle('active'); panel.classList.toggle('active'); }
}

function renderCartUI() {
    const container = document.getElementById('cartItems');
    const checkout = document.getElementById('cartCheckout');
    document.getElementById('cartCount').textContent = cart.length;

    if (cart.length === 0) {
        container.innerHTML = '<p class="cart-empty">Sepetiniz boş</p>';
        checkout.style.display = 'none';
        return;
    }

    container.innerHTML = cart.map((item, i) => `
        <div class="cart-item">
            <span class="cart-item-name">${item.name}</span>
            <span class="cart-item-price">${item.price}</span>
            <button class="cart-item-remove" onclick="removeFromCart(${i})">✕</button>
        </div>`).join('');
    checkout.style.display = 'block';

    captchaA = Math.floor(Math.random() * 10) + 1;
    captchaB = Math.floor(Math.random() * 10) + 1;
    document.getElementById('captchaLabel').textContent = `🤖 Robot kontrolü: ${captchaA} + ${captchaB} = ?`;
    document.getElementById('cartProductsInput').value = cart.map(i => i.name + ' (' + i.price + ')').join(', ');
}

// Sepet form submit
document.addEventListener('DOMContentLoaded', () => {
    const cartForm = document.getElementById('cartForm');
    if (cartForm) {
        cartForm.addEventListener('submit', function (e) {
            e.preventDefault();
            if (parseInt(document.getElementById('captchaAnswer').value) !== captchaA + captchaB) {
                alert('Robot kontrolü yanlış!'); return;
            }
            const fd = new FormData(cartForm);
            const orderData = {
                date: new Date().toLocaleString('tr-TR'),
                products: fd.get('urunler'),
                name: fd.get('isim'),
                email: fd.get('email'),
                phone: fd.get('telefon'),
                note: fd.get('not') || ''
            };

            // Siparişi localStorage'a kaydet (admin görüntülemesi için)
            let orders = JSON.parse(localStorage.getItem('okOrders') || '[]');
            orders.push(orderData);
            localStorage.setItem('okOrders', JSON.stringify(orders));

            // Netlify Forms'a gönder
            fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fd).toString() })
                .then(res => {
                    if (res.ok && res.headers.get('content-type')?.includes('text/html') && location.hostname !== 'localhost') {
                        // Netlify başarılı
                        showOrderSuccess();
                    } else {
                        // Localhost veya Netlify hatası — e-posta fallback
                        sendOrderEmail(orderData);
                        showOrderSuccess();
                    }
                })
                .catch(() => {
                    sendOrderEmail(orderData);
                    showOrderSuccess();
                });
        });
    }

    function showOrderSuccess() {
        document.getElementById('cartSuccess').classList.add('show');
        cart = []; localStorage.removeItem('okCart'); renderCartUI();
        document.getElementById('cartForm').reset();
        setTimeout(() => { document.getElementById('cartSuccess').classList.remove('show'); toggleCart(); }, 4000);
    }

    function sendOrderEmail(order) {
        const msg = `🛒 *Yeni Sipariş - OK Otomasyon*\n\n📦 Ürünler: ${order.products}\n👤 İsim: ${order.name}\n📧 Email: ${order.email}\n📞 Telefon: ${order.phone}\n📝 Not: ${order.note}\n📅 Tarih: ${order.date}`;
        window.open('https://wa.me/905334947193?text=' + encodeURIComponent(msg), '_blank');
    }

    renderCartUI();
});

/* ═══════════════════════════════════════════
   ÜRÜN GÖRSELİ BÜYÜTME (LIGHTBOX)
   ═══════════════════════════════════════════ */
(function() {
    // Lightbox HTML oluştur
    var lightbox = document.createElement('div');
    lightbox.className = 'product-lightbox';
    lightbox.innerHTML = '<span class="product-lightbox-close">&times;</span><img src="" alt=""><div class="product-lightbox-title"></div>';
    document.body.appendChild(lightbox);

    var lbImg = lightbox.querySelector('img');
    var lbTitle = lightbox.querySelector('.product-lightbox-title');
    var lbClose = lightbox.querySelector('.product-lightbox-close');

    // Lightbox aç
    function openLightbox(src, title) {
        lbImg.src = src;
        lbTitle.textContent = title || '';
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // Lightbox kapat
    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Kapatma eventleri
    lbClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeLightbox();
    });

    // Tüm ürün görsellerini tıklanabilir yap
    document.addEventListener('click', function(e) {
        var img = e.target;
        if (img.tagName !== 'IMG') return;

        var wrap = img.closest('.product-img-wrap, .climate-product-img, .sensor-card-img');
        if (!wrap) return;

        e.preventDefault();
        var title = '';
        var card = img.closest('.product-card, .climate-product-card, .sensor-card');
        if (card) {
            var h3 = card.querySelector('h3');
            if (h3) title = h3.textContent;
        }
        openLightbox(img.src, title);
    });
})();
