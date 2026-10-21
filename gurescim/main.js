import { dotnet } from './_framework/dotnet.js'

const is_browser = typeof window != "undefined";
if (!is_browser) throw new Error(`Expected to be running in a browser`);

// ═══ KALICI DEPO (LOCALSTORAGE) KÖPRÜSÜ ═══
globalThis.gurescimDepoOku = function (anahtar) {
    try {
        return localStorage.getItem("gurescim_" + anahtar);
    } catch (e) {
        console.warn("gurescimDepoOku hatasi:", e);
        return null;
    }
};

globalThis.gurescimDepoYaz = function (anahtar, deger) {
    try {
        const k = "gurescim_" + anahtar;
        if (deger === null || deger === undefined) {
            localStorage.removeItem(k);
        } else {
            localStorage.setItem(k, deger);
        }
    } catch (e) {
        console.warn("gurescimDepoYaz hatasi:", e);
    }
};

// ═══ WEB BİLDİRİMLERİ (NOTIFICATION API) ═══
let bildirimIzinIstendi = false;
globalThis.gurescimBildirimGoster = function (baslik, mesaj, etiket) {
    try {
        if (!("Notification" in window)) return;
        if (Notification.permission === "granted") {
            new Notification(baslik || "🤼 Güreşçim Kulübü", {
                body: mesaj || "",
                tag: etiket || "gurescim_genel",
                icon: "https://img.icons8.com/color/180/wrestling.png"
            });
        } else if (Notification.permission !== "denied" && !bildirimIzinIstendi) {
            bildirimIzinIstendi = true;
            Notification.requestPermission().then(function (perm) {
                if (perm === "granted") {
                    new Notification(baslik || "🤼 Güreşçim Kulübü", {
                        body: mesaj || "",
                        tag: etiket || "gurescim_genel",
                        icon: "https://img.icons8.com/color/180/wrestling.png"
                    });
                }
            });
        }
    } catch (e) {
        console.warn("gurescimBildirimGoster hatasi:", e);
    }
};

// ═══ SEKME GÖRÜNÜRLÜK (VISIBILITY) DURUMU ═══
globalThis.gurescimSekmeGizliMi = function () {
    return document.hidden;
};

// ═══ SERVICE WORKER KAYDI (PWA) ═══
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js?v=20261021').catch(function (err) {
        console.log("SW kayit atlandi:", err);
    });
}

// ═══ AVALONIA RUNTIME BAŞLATMA ═══
const dotnetRuntime = await dotnet
    .withDiagnosticTracing(false)
    .withApplicationArgumentsFromQuery()
    .create();

const config = dotnetRuntime.getConfig();

await dotnetRuntime.runMain(config.mainAssemblyName, [globalThis.location.href]);
