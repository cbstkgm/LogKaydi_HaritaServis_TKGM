// DOM Elementleri
const logDosyasiInput = document.getElementById('logDosyasiInput');
const logDosyaAdiGosterge = document.getElementById('logDosyaAdiGosterge');

const analizEtButonu = document.getElementById('analizEtButonu');

const sonuclarAlani = document.getElementById('sonuclarAlani');
const tabloGovdesi = document.getElementById('tabloGovdesi');
const aramaKutusu = document.getElementById('aramaKutusu');
const bosDurum = document.getElementById('bosDurum');
const logTablosu = document.getElementById('logTablosu');

const bildirimAlani = document.getElementById('bildirimAlani');
const bildirimIkonu = document.getElementById('bildirimIkonu');
const bildirimMesaji = document.getElementById('bildirimMesaji');

const detayModal = document.getElementById('detayModal');
const detayKapatButonu = document.getElementById('detayKapatButonu');
const modalIcerik = document.getElementById('modalIcerik');
const modalBasligi = document.getElementById('modalBasligi');

const sqlModal = document.getElementById('sqlModal');
const sqlGosterButonu = document.getElementById('sqlGosterButonu');
const sqlKapatButonu = document.getElementById('sqlKapatButonu');
const sqlKopyalaButonu = document.getElementById('sqlKopyalaButonu');
const sqlKodu = document.getElementById('sqlKodu');

const zeminSqlModal = document.getElementById('zeminSqlModal');
const zeminSqlKapatButonu = document.getElementById('zeminSqlKapatButonu');
const zeminSqlKopyalaButonu = document.getElementById('zeminSqlKopyalaButonu');
const zeminSqlKodu = document.getElementById('zeminSqlKodu');
// Global Durum
let cozumlenmisLoglar = [];
let siralamaYonu = 1;
let idariBirimler = typeof idariBirimlerData !== 'undefined' ? idariBirimlerData : [];

// Sayfalama (Pagination) Global Değişkenleri
let aktifFiltrelenmisLoglar = [];
let mevcutSayfa = 1;
let sayfaBasinaKayit = 100;

// Gelişmiş Filtre Global Değişkenleri
let aktifGelisimisFiltreler = [];
let filtreSayaci = 0;

// Seçiciler (Paginator)
const sayfaBasinaKayitSecici = document.getElementById('sayfaBasinaKayitSecici');
const btnOncekiSayfa = document.getElementById('btnOncekiSayfa');
const btnSonrakiSayfa = document.getElementById('btnSonrakiSayfa');
const sayfalamaBilgisi = document.getElementById('sayfalamaBilgisi');

// Dosya Seçim Dinleyicileri
logDosyasiInput.addEventListener('change', (e) => {
    const dosyalar = e.target.files;
    if (dosyalar.length > 0) {
        logDosyaAdiGosterge.textContent = dosyalar.length === 1 ? dosyalar[0].name : `${dosyalar.length} dosya seçildi`;
        analizEtButonu.disabled = false;
    } else {
        logDosyaAdiGosterge.textContent = 'Log Dosyası Seçin (.csv)';
        analizEtButonu.disabled = true;
    }
});

// Analiz Et Butonu
analizEtButonu.addEventListener('click', () => {
    const dosyalar = logDosyasiInput.files;
    if (dosyalar.length > 0) {
        analizEtButonu.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> İşleniyor...';
        
        let tumVeriler = [];
        let islenenDosyaSayisi = 0;

        Array.from(dosyalar).forEach(dosya => {
            Papa.parse(dosya, {
                header: true,
                skipEmptyLines: true,
                complete: (sonuclar) => {
                    tumVeriler = tumVeriler.concat(sonuclar.data);
                    islenenDosyaSayisi++;
                    
                    if (islenenDosyaSayisi === dosyalar.length) {
                        veriyiAnalizEt(tumVeriler);
                        analizEtButonu.innerHTML = '<i class="fa-solid fa-gears"></i> Analiz Et';
                    }
                },
                error: (err) => {
                    console.error("Dosya okunurken hata:", err);
                    islenenDosyaSayisi++;
                    if (islenenDosyaSayisi === dosyalar.length) {
                        veriyiAnalizEt(tumVeriler);
                        analizEtButonu.innerHTML = '<i class="fa-solid fa-gears"></i> Analiz Et';
                    }
                }
            });
        });
    }
});

function veriyiAnalizEt(veri) {
    cozumlenmisLoglar = [];
    let wmsSayisi = 0; let wfsSayisi = 0;
    let urlKolonu = null, durumKolonu = null, xmlKolonu = null, zamanKolonu = null, logIdKolonu = null, ipKolonu = null, reqBodyKolonu = null;
    
    // Adım 1: Kolon tespiti (ilk 20 satır - İÇERİK bazlı kesin tespit)
    const kontrolEdilecekSatirSayisi = Math.min(veri.length, 20);
    for (let i = 0; i < kontrolEdilecekSatirSayisi; i++) {
        const anahtarlar = Object.keys(veri[i]);
        for (let anahtar of anahtarlar) {
            const deger = (veri[i][anahtar] || '').toString().trim();
            const kucukDeger = deger.toLowerCase();
            const kucukAnahtar = anahtar.toLowerCase().trim();

            if (!urlKolonu && (deger.startsWith('http') || (kucukDeger.includes('service=') && kucukDeger.includes('request=')))) urlKolonu = anahtar;
            if (!xmlKolonu && (deger.startsWith('<?xml') || kucukDeger.includes('<wfs:') || kucukDeger.includes('exception') || deger.startsWith('{"') || deger.startsWith('[{'))) xmlKolonu = anahtar;
            if (!logIdKolonu && (kucukAnahtar === 'id' || kucukAnahtar.includes('log_id') || kucukAnahtar.includes('logid') || /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(deger))) logIdKolonu = anahtar;
            if (!ipKolonu && (kucukAnahtar.includes('ip') || kucukAnahtar.includes('host') || kucukAnahtar.includes('address') || /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(deger))) ipKolonu = anahtar;
            if (!zamanKolonu && (kucukAnahtar.includes('date') || kucukAnahtar.includes('zaman') || kucukAnahtar.includes('tarih') || /^\d{4}-\d{2}-\d{2}/.test(deger))) zamanKolonu = anahtar;
            if (!durumKolonu && (kucukAnahtar.includes('status') || kucukAnahtar.includes('code') || kucukAnahtar.includes('durum'))) durumKolonu = anahtar;
        }
    }

    // Adım 2: İçerik bazlı bulunamayanlar için İSİM bazlı tespit (Fallback)
    const ilkSatirAnahtarlari = Object.keys(veri[0] || {});
    
    if (!urlKolonu) {
        urlKolonu = ilkSatirAnahtarlari.find(k => {
            const ad = k.toLowerCase().replace(/[\s_]/g, '');
            return ad === 'request' || ad === 'url' || ad === 'istek' || ad === 'requesturl' || ad === 'orjinalurl';
        }) || null;
    }

    if (!xmlKolonu) {
        xmlKolonu = ilkSatirAnahtarlari.find(k => {
            const ad = k.toLowerCase().replace(/[\s_]/g, '');
            return ad === 'response' || ad === 'yanit' || ad === 'yanıt' || ad === 'xml' || ad === 'responsedata' || ad === 'responsebody';
        }) || null;
    }

    if (!reqBodyKolonu) {
        reqBodyKolonu = ilkSatirAnahtarlari.find(k => {
            const ad = k.toLowerCase().replace(/[\s_]/g, '');
            return ad === 'requestbody' || ad === 'payload' || ad === 'istekgovdesi' || ad === 'body';
        }) || null;
    }

    if (!urlKolonu) {
        urlKolonu = Object.keys(veri[0] || {}).find(k => k.toLowerCase().includes('url') || k.toLowerCase().includes('request'));
        if(!urlKolonu) {
            bildirimGoster("CSV dosyasında OGC sorgusu (Request/URL) içeren bir sütun bulunamadı.", "warning");
            return;
        }
    }

    let featureCountKolonu = ilkSatirAnahtarlari.find(k => {
        const ad = k.toLowerCase().replace(/[\s_]/g, '');
        return ad === 'featurecount' || ad === 'kayitsayisi' || ad === 'objesayisi' || ad === 'count';
    }) || null;

    const islenenLogIdler = new Set();

    veri.forEach((satir, indeks) => {
        const hamUrl = satir[urlKolonu];
        if (!hamUrl) return;

        // Duplicate (Çoklu Yükleme) Kontrolü
        const logId = logIdKolonu && satir[logIdKolonu] ? satir[logIdKolonu] : null;
        if (logId && logId !== '-') {
            if (islenenLogIdler.has(logId)) return; // Bu ID daha önce işlenmiş, atla
            islenenLogIdler.add(logId);
        }

        const logKaydi = urlCozumle(hamUrl, indeks + 1);
        if (logKaydi.ogcMi) {
            logKaydi.durum = durumKolonu && satir[durumKolonu] ? satir[durumKolonu] : '-';
            logKaydi.zaman = zamanKolonu && satir[zamanKolonu] ? satir[zamanKolonu] : '-';
            logKaydi.logIdDegeri = logIdKolonu && satir[logIdKolonu] ? satir[logIdKolonu] : '-';
            logKaydi.ipAdresi = ipKolonu && satir[ipKolonu] ? satir[ipKolonu] : '-';
            logKaydi.xmlYaniti = xmlKolonu && satir[xmlKolonu] ? satir[xmlKolonu] : null;
            logKaydi.reqBody = reqBodyKolonu && satir[reqBodyKolonu] ? satir[reqBodyKolonu] : null;
            logKaydi.hamSatir = satir;
            
            logKaydi.objeSayisi = '-';
            
            // Eğer CSV'de hazır bir Kayıt Sayısı (Feature Count) kolonu varsa onu kullan
            if (featureCountKolonu && satir[featureCountKolonu] !== undefined && satir[featureCountKolonu] !== null && satir[featureCountKolonu] !== '') {
                logKaydi.objeSayisi = satir[featureCountKolonu];
            } 
            // Yoksa XML üzerinden hesaplamaya çalış
            else if (logKaydi.xmlYaniti) {
                if (logKaydi.xmlYaniti.includes('ExceptionReport') || logKaydi.xmlYaniti.includes('ows:Exception')) {
                    logKaydi.objeSayisi = 'Hata';
                } else {
                    const eslesmeler = logKaydi.xmlYaniti.match(/<TKGM:tapukimlikno(?:>|\s[^>]*>)/gi);
                    if (eslesmeler) logKaydi.objeSayisi = eslesmeler.length;
                    else {
                        const yedekEslesmeler = logKaydi.xmlYaniti.match(/<(gml:featureMember|wfs:member)(?:>|\s[^>]*>)/gi);
                        logKaydi.objeSayisi = yedekEslesmeler ? yedekEslesmeler.length : 0;
                    }
                }
            }
            cozumlenmisLoglar.push(logKaydi);
            if (logKaydi.servis === 'WMS') wmsSayisi++;
            if (logKaydi.servis === 'WFS') wfsSayisi++;
        }
    });

    document.getElementById('toplamSayac').textContent = `Toplam: ${cozumlenmisLoglar.length}`;
    document.getElementById('wmsSayac').textContent = `WMS: ${wmsSayisi}`;
    document.getElementById('wfsSayac').textContent = `WFS: ${wfsSayisi}`;

    if (cozumlenmisLoglar.length > 0) {
        tabloyuCiz(cozumlenmisLoglar);
        sonuclarAlani.classList.remove('hidden');
        const scrollBtns = document.getElementById('kaydirmaButonlari');
        if(scrollBtns) scrollBtns.classList.remove('hidden');
        bildirimGizle();
        
        if(document.getElementById('anomaliAcButonu')) {
            document.getElementById('anomaliAcButonu').disabled = false;
            document.getElementById('anomaliAcButonu').style.cursor = 'pointer';
            document.getElementById('anomaliAcButonu').style.opacity = '1';
        }
    } else {
        bildirimGoster("Geçerli WMS veya WFS isteği (SERVICE=WMS/WFS) bulunamadı.", "warning");
        sonuclarAlani.classList.add('hidden');
        const scrollBtns = document.getElementById('kaydirmaButonlari');
        if(scrollBtns) scrollBtns.classList.add('hidden');
        
        if(document.getElementById('anomaliAcButonu')) {
            document.getElementById('anomaliAcButonu').disabled = true;
            document.getElementById('anomaliAcButonu').style.cursor = 'not-allowed';
            document.getElementById('anomaliAcButonu').style.opacity = '0.6';
        }
    }
}

function urlCozumle(urlString, satirNo) {
    let sonuc = { id: satirNo, ogcMi: false, orjinalUrl: urlString, servis: '-', istekTipi: '-', hedef: '-', filtre: '-', parametreler: {} };
    try {
        let islenecekUrl = urlString;
        if (!urlString.startsWith('http')) islenecekUrl = 'http://dummy.com/?' + urlString.replace(/^\?/, '');
        
        const url = new URL(islenecekUrl);
        const parametreler = new URLSearchParams(url.search);
        
        for(let [anahtar, deger] of parametreler.entries()) {
            sonuc.parametreler[anahtar.toUpperCase()] = deger;
        }

        const servis = sonuc.parametreler['SERVICE'];
        if (servis && (servis.toUpperCase() === 'WMS' || servis.toUpperCase() === 'WFS')) {
            sonuc.ogcMi = true;
            sonuc.servis = servis.toUpperCase();
            sonuc.istekTipi = sonuc.parametreler['REQUEST'] || 'Bilinmiyor';

            if (sonuc.servis === 'WMS') sonuc.hedef = sonuc.parametreler['LAYERS'] || sonuc.parametreler['LAYER'] || sonuc.parametreler['QUERY_LAYERS'] || '-';
            else if (sonuc.servis === 'WFS') sonuc.hedef = sonuc.parametreler['TYPENAME'] || sonuc.parametreler['TYPENAMES'] || '-';
            
            if(sonuc.hedef !== '-') sonuc.hedef = decodeURIComponent(sonuc.hedef.replace(/\+/g, ' '));

            let cql = sonuc.parametreler['CQL_FILTER'] || sonuc.parametreler['FILTER'] || '-';
            if (cql !== '-') {
                sonuc.filtre = decodeURIComponent(cql.replace(/\+/g, ' '));
            } else if (sonuc.servis === 'WMS' && sonuc.istekTipi === 'GetMap') {
                let bbox = sonuc.parametreler['BBOX'];
                let genislik = sonuc.parametreler['WIDTH'];
                let yukseklik = sonuc.parametreler['HEIGHT'];
                if (bbox) {
                    sonuc.filtre = `BBOX: ${bbox.replace(/,/g, ', ')}` + (genislik && yukseklik ? ` (${genislik}x${yukseklik})` : '');
                }
            }
        }
    } catch (e) { console.warn(`URL parse hatası, Satır ${satirNo}`); }
    return sonuc;
}

function mahalleAdiGetir(refNumarasi) {
    if (!idariBirimler || idariBirimler.length === 0) return null;
    
    const birim = idariBirimler.find(b => {
        for (let anahtar in b) {
            const temizAnahtar = anahtar.toLowerCase().replace(/_/g, '');
            if ((temizAnahtar === 'mahalleid' || temizAnahtar === 'tapumahalleref' || temizAnahtar === 'id') && b[anahtar] == refNumarasi) {
                return true;
            }
        }
        return false;
    });
    
    if (birim) {
        let il = "", ilce = "", mahalle = "", bulunanRef = refNumarasi;
        for (let anahtar in birim) {
            const temizAnahtar = anahtar.toLowerCase().replace(/_/g, '');
            if (temizAnahtar === 'il' || temizAnahtar === 'ilad' || temizAnahtar === 'iladi') il = birim[anahtar];
            if (temizAnahtar === 'ilce' || temizAnahtar === 'ilcead' || temizAnahtar === 'ilceadi') ilce = birim[anahtar];
            if (temizAnahtar === 'mahalle' || temizAnahtar === 'mahallead' || temizAnahtar === 'mahalleadi') mahalle = birim[anahtar];
            if (temizAnahtar === 'mahalleid' || temizAnahtar === 'tapumahalleref') bulunanRef = birim[anahtar];
        }
        return { tamAd: `${il} / ${ilce} / ${mahalle}`, mahalleRef: bulunanRef };
    }
    return null;
}

function tabloyuCiz(cizilecekLoglar) {
    aktifFiltrelenmisLoglar = cizilecekLoglar;
    mevcutSayfa = 1; // Yeni bir arama veya veri geldiğinde başa dön
    sayfalayiCiz();
}

function sayfalayiCiz() {
    tabloGovdesi.innerHTML = '';
    const toplamKayit = aktifFiltrelenmisLoglar.length;
    
    if (toplamKayit === 0) {
        logTablosu.classList.add('hidden'); 
        bosDurum.classList.remove('hidden'); 
        document.getElementById('paginatorAlani').classList.add('hidden');
        return;
    }
    
    logTablosu.classList.remove('hidden'); 
    bosDurum.classList.add('hidden');
    const paginatorAlani = document.getElementById('paginatorAlani');
    paginatorAlani.classList.remove('hidden');
    paginatorAlani.classList.remove('paginator-pulse'); // Sayfa değişince animasyonu sıfırla

    // Sayfalama Kesimi (Slice)
    const baslangicIndex = (mevcutSayfa - 1) * sayfaBasinaKayit;
    const bitisIndex = Math.min(baslangicIndex + sayfaBasinaKayit, toplamKayit);
    const sayfadakiLoglar = aktifFiltrelenmisLoglar.slice(baslangicIndex, bitisIndex);

    // Paginator Arayüzünü Güncelle
    sayfalamaBilgisi.textContent = `${baslangicIndex + 1} - ${bitisIndex} / ${toplamKayit}`;
    btnOncekiSayfa.disabled = mevcutSayfa === 1;
    btnSonrakiSayfa.disabled = bitisIndex >= toplamKayit;

    sayfadakiLoglar.forEach(log => {
        const tr = document.createElement('tr');
        
        const servisRozeti = log.servis === 'WMS' ? 'badge-wms' : (log.servis === 'WFS' ? 'badge-wfs' : '');
        
        let durumSinifi = 'cell-muted';
        const durumKodu = parseInt(log.durum);
        if (!isNaN(durumKodu)) {
            if (durumKodu >= 200 && durumKodu < 300) durumSinifi = 'status-ok';
            else if (durumKodu >= 400) durumSinifi = 'status-err';
        }

        const gosterilenHedef = log.hedef.length > 25 ? log.hedef.substring(0, 25) + '...' : log.hedef;
        let gosterilenFiltre = log.filtre;
        
        // Mahalle Ref
        const mahalleRefEslesme = log.filtre.match(/(?:TKGM:)?tapumahalleref\s*=\s*(\d+)/i);
        let parselSorguButonu = "-";
        if (mahalleRefEslesme) {
            const refNumarasi = mahalleRefEslesme[1];
            const mahalleBilgi = mahalleAdiGetir(refNumarasi);
            
            const adaEslesme = log.filtre.match(/adano\s*=\s*(\d+)/i);
            const parselEslesme = log.filtre.match(/parselno\s*=\s*(\d+)/i);
            
            const adaNo = adaEslesme ? adaEslesme[1] : "";
            const parselNo = parselEslesme ? parselEslesme[1] : "";
            
            // İstekte Ada var ama Parsel yoksa butonu gösterme
            if (!(adaEslesme && !parselEslesme)) {
                const tkgmUrl = `https://parselsorgu.tkgm.gov.tr/#ara/idari/${refNumarasi}/${adaNo}/${parselNo}`;
                parselSorguButonu = `<a href="${tkgmUrl}" target="_blank" class="btn btn-small btn-primary" title="Parsel Sorgu" style="width: 100%; justify-content: center;"><i class="fa-solid fa-map-location-dot"></i> Git</a>`;
            }

            if (mahalleBilgi) {
                gosterilenFiltre = gosterilenFiltre.replace(
                    new RegExp(`(?:TKGM:)?tapumahalleref\\s*=\\s*${refNumarasi}`, 'i'),
                    `tapumahalleref=<span class="tag mahalle">📍 ${refNumarasi} - ${mahalleBilgi.tamAd}</span>`
                );
            } else {
                gosterilenFiltre = gosterilenFiltre.replace(
                    new RegExp(`(?:TKGM:)?tapumahalleref\\s*=\\s*${refNumarasi}`, 'i'),
                    `tapumahalleref=<span class="tag not-found">📍 ${refNumarasi} - Bulunamadı</span>`
                );
            }
        }
        
        const zeminRefEslesme = log.filtre.match(/(?:TKGM:)?tapuzeminref\s*=\s*(\d+)/i);
        if (zeminRefEslesme) {
            const zeminRefNumarasi = zeminRefEslesme[1];
            parselSorguButonu = `<button onclick="zeminSqlAc('${zeminRefNumarasi}')" class="btn btn-small btn-primary" title="Zemin SQL Kopyala" style="width: 100%; justify-content: center;"><i class="fa-solid fa-code"></i> SQL</button>`;
        }

        const gosterilenLogId = log.logIdDegeri.length > 15 ? log.logIdDegeri.substring(0, 15) + '...' : log.logIdDegeri;
        let sayacRozeti = '-';
        if (log.objeSayisi === 'Hata') {
            sayacRozeti = '<span class="count-badge err">Hata</span>';
        } else if (log.objeSayisi !== '-') {
            const sayac = parseInt(log.objeSayisi);
            sayacRozeti = sayac > 0 
                ? `<span class="count-badge num">${sayac}</span>`
                : `<span class="count-badge zero">0</span>`;
        }

        let onizleButonu = '-';
        if (log.ogcMi && (log.servis === 'WMS' || log.servis === 'WFS')) {
            let baseUrl = log.servis === 'WMS' ? 'https://cbsservis.tkgm.gov.tr/tkgm.ows/wms?' : 'https://cbsservis.tkgm.gov.tr/tkgm.ows/wfs?';
            const qParams = new URLSearchParams(log.parametreler).toString();
            if (qParams) {
                onizleButonu = `<a href="${baseUrl}${qParams}" target="_blank" class="btn btn-small btn-outline" style="width: 100%; justify-content: center; font-size: 0.75rem;" title="Tarayıcıda Servis İsteği Yap"><i class="fa-solid fa-arrow-up-right-from-square"></i> Aç</a>`;
            } else if (log.orjinalUrl.includes('?')) {
                const hamQuery = log.orjinalUrl.substring(log.orjinalUrl.indexOf('?') + 1);
                onizleButonu = `<a href="${baseUrl}${hamQuery}" target="_blank" class="btn btn-small btn-outline" style="width: 100%; justify-content: center; font-size: 0.75rem;" title="Tarayıcıda Servis İsteği Yap"><i class="fa-solid fa-arrow-up-right-from-square"></i> Aç</a>`;
            }
        }

        tr.innerHTML = `
            <td class="cell-muted">${log.id}</td>
            <td class="cell-code" title="${log.logIdDegeri}">${gosterilenLogId}</td>
            <td class="cell-code">${log.ipAdresi}</td>
            <td><span class="${servisRozeti}">${log.servis}</span></td>
            <td style="font-weight: 500;">${log.istekTipi}</td>
            <td class="cell-code" title="${log.hedef}">${gosterilenHedef}</td>
            <td class="cell-filter" title="${log.filtre.replace(/"/g, '&quot;')}">${gosterilenFiltre}</td>
            <td style="text-align: center;">${sayacRozeti}</td>
            <td class="${durumSinifi}" style="font-family: monospace;">${log.zaman !== '-' ? log.zaman : log.durum}</td>
            <td style="text-align: center;">${onizleButonu}</td>
            <td style="text-align: center;">${parselSorguButonu}</td>
            <td>
                <button onclick="detayGoster(${log.id})" class="btn btn-small btn-success" style="font-weight: 600;">
                    <i class="fa-solid fa-magnifying-glass"></i> İncele
                </button>
            </td>
        `;
        tabloGovdesi.appendChild(tr);
    });
}

let aktifServisFiltresi = 'HEPSİ';

document.getElementById('toplamSayac').addEventListener('click', () => {
    aktifServisFiltresi = 'HEPSİ';
    filtrele(aramaKutusu.value);
});
document.getElementById('wmsSayac').addEventListener('click', () => {
    aktifServisFiltresi = 'WMS';
    filtrele(aramaKutusu.value);
});
document.getElementById('wfsSayac').addEventListener('click', () => {
    aktifServisFiltresi = 'WFS';
    filtrele(aramaKutusu.value);
});

let aramaZamanlayici;
aramaKutusu.addEventListener('input', (e) => {
    const terim = e.target.value.toLowerCase();
    if (!cozumlenmisLoglar.length) return;
    
    clearTimeout(aramaZamanlayici);
    aramaZamanlayici = setTimeout(() => {
        filtrele(terim);
    }, 300);
});

function filtrele(arananKelimeler) {
    const terim = (arananKelimeler || '').toString().toLowerCase().trim();
    
    const filtrelenmis = cozumlenmisLoglar.filter(log => {
        // 1. Servis Filtresi
        if (aktifServisFiltresi !== 'HEPSİ' && log.servis !== aktifServisFiltresi) return false;
        
        // 2. Gelişmiş Filtreler (AND Logic)
        for (let f of aktifGelisimisFiltreler) {
            if (f.kolon === 'kayit') {
                if (log.objeSayisi === 'Hata' || log.objeSayisi === '-') return false;
                const val = parseInt(log.objeSayisi);
                if (isNaN(val)) return false;
                if (f.min !== null && val < f.min) return false;
                if (f.max !== null && val > f.max) return false;
            } else if (f.kolon === 'durum') {
                const status = parseInt(log.durum);
                if (isNaN(status)) return false;
                if (f.min !== null && status < f.min) return false;
                if (f.max !== null && status > f.max) return false;
            } else if (f.kolon === 'tarih') {
                const logTarihi = log.zaman; // Örn: 2026-08-13 02:06:21.049
                if (logTarihi === '-') return false;
                if (f.min && logTarihi < f.min) return false; // YYYY-MM-DD mantığında string kıyaslama genelde yeterlidir
                if (f.max && logTarihi > f.max) return false;
            } else if (f.kolon === 'ipadresi') {
                if (!log.ipAdresi.toLowerCase().includes(f.text)) return false;
            } else if (f.kolon === 'logid') {
                if (!f.idListesi.includes(log.logIdDegeri)) return false;
            }
        }

        // 3. Genel Text Arama (OR Logic)
        if (!terim) return true;
        const alanlar = [
            log.id, log.logIdDegeri, log.ipAdresi, log.servis, 
            log.istekTipi, log.hedef, log.filtre, log.objeSayisi, 
            log.zaman, log.durum
        ];
        return alanlar.some(alan => alan !== null && alan !== undefined && alan.toString().toLowerCase().includes(terim));
    });
    
    tabloyuCiz(filtrelenmis);
    
    // Eğer Anomali Analizi modalı/bölümü açıksa konumsal ve diğer anomali sekmelerini de yeni filtreyle güncelle
    const anomaliModal = document.getElementById('anomaliModal');
    if (anomaliModal && anomaliModal.style.display === 'block') {
        anomaliAnaliziYap();
    }
}

document.getElementById('siralamaButonu').addEventListener('click', function() {
    const yukleniyorEkrani = document.getElementById('yukleniyorEkrani');
    if(yukleniyorEkrani) yukleniyorEkrani.classList.remove('hidden');

    const ikon = this.querySelector('i');

    setTimeout(() => {
        siralamaYonu = siralamaYonu === 1 ? -1 : 1;
        cozumlenmisLoglar.sort((a, b) => {
            let sayiA = (a.objeSayisi === 'Hata') ? -2 : (a.objeSayisi === '-' ? -1 : parseInt(a.objeSayisi) || 0);
            let sayiB = (b.objeSayisi === 'Hata') ? -2 : (b.objeSayisi === '-' ? -1 : parseInt(b.objeSayisi) || 0);
            return (sayiA - sayiB) * siralamaYonu;
        });
        filtrele(aramaKutusu.value.toLowerCase());
        ikon.className = siralamaYonu === -1 ? 'fa-solid fa-sort-down' : 'fa-solid fa-sort-up';
        
        if(yukleniyorEkrani) yukleniyorEkrani.classList.add('hidden');
    }, 50);
});

window.detayGoster = function(id) {
    const log = cozumlenmisLoglar.find(l => l.id === id);
    if (!log) return;

    modalBasligi.innerHTML = `<span class="badge-wms" style="margin-right:10px;">${log.servis}</span> ${log.istekTipi} Detayı`;
    
    let icerikHTML = `
        <div class="detail-box">
            <h4><i class="fa-solid fa-link"></i> Tam İstek (Request/URL)</h4>
            <div class="content">${log.orjinalUrl}</div>
        </div>
    `;

    if(log.filtre !== '-') {
        let modalFiltre = log.filtre;
        
        // Mahalle Ref
        const mahalleRefEslesme = log.filtre.match(/(?:TKGM:)?tapumahalleref\s*=\s*(\d+)/i);
        if (mahalleRefEslesme) {
            const refNum = mahalleRefEslesme[1];
            const mahalleBilgi = mahalleAdiGetir(refNum);
            let aksiyonButonu = "";
            const adaEslesme = log.filtre.match(/adano\s*=\s*(\d+)/i);
            const parselEslesme = log.filtre.match(/parselno\s*=\s*(\d+)/i);
            if (adaEslesme && parselEslesme) {
                aksiyonButonu = `<a href="https://parselsorgu.tkgm.gov.tr/#ara/idari/${refNum}/${adaEslesme[1]}/${parselEslesme[1]}" target="_blank" class="tag-btn"><i class="fa-solid fa-map-location-dot"></i> Git</a>`;
            }
            if (mahalleBilgi) {
                modalFiltre = modalFiltre.replace(new RegExp(`(?:TKGM:)?tapumahalleref\\s*=\\s*${refNum}`, 'i'), `tapumahalleref=<span class="tag mahalle">📍 ${refNum} - ${mahalleBilgi.tamAd}${aksiyonButonu}</span>`);
            } else {
                modalFiltre = modalFiltre.replace(new RegExp(`(?:TKGM:)?tapumahalleref\\s*=\\s*${refNum}`, 'i'), `tapumahalleref=<span class="tag not-found">📍 ${refNum} - Bulunamadı${aksiyonButonu}</span>`);
            }
        }
        
        // Zemin Ref
        const zeminRefEslesme = log.filtre.match(/(?:TKGM:)?tapuzeminref\s*=\s*(\d+)/i);
        if (zeminRefEslesme) {
            const zeminRefNum = zeminRefEslesme[1];
            const mahalleBilgi = mahalleAdiGetir(zeminRefNum);
            if (mahalleBilgi) {
                modalFiltre = modalFiltre.replace(new RegExp(`(?:TKGM:)?tapuzeminref\\s*=\\s*${zeminRefNum}`, 'i'), `tapuzeminref=<span class="tag zemin">📌 Zemin:${zeminRefNum} | ${mahalleBilgi.mahalleRef} - ${mahalleBilgi.tamAd}</span>`);
            } else {
                modalFiltre = modalFiltre.replace(new RegExp(`(?:TKGM:)?tapuzeminref\\s*=\\s*${zeminRefNum}`, 'i'), `tapuzeminref=<span class="tag not-found">📌 Zemin: ${zeminRefNum} (Bulunamadı)</span>`);
            }
        }

        icerikHTML += `
            <div class="detail-box">
                <h4><i class="fa-solid fa-filter"></i> Uygulanan Filtre / Sorgu (CQL_FILTER)</h4>
                <div class="content">${modalFiltre}</div>
            </div>
        `;
    }

    if (log.reqBody && log.reqBody.trim() !== '' && log.reqBody !== '-') {
        const guvenliReq = log.reqBody.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        icerikHTML += `
            <div class="detail-box">
                <h4><i class="fa-solid fa-file-code"></i> İstek Gövdesi (Request Body/Payload)</h4>
                <div class="content" style="max-height: 200px; overflow-y: auto;">${guvenliReq}</div>
            </div>
        `;
    }

    icerikHTML += `<div class="detail-box"><h4>Sorgu Parametreleri</h4><div class="grid-params">`;
    for (let [anahtar, deger] of Object.entries(log.parametreler)) {
        let vurguSinifi = ['SERVICE', 'REQUEST', 'LAYERS', 'TYPENAME'].includes(anahtar.toUpperCase()) ? "highlight" : "";
        icerikHTML += `<div class="param-item ${vurguSinifi}"><span class="key">${anahtar}</span><span class="val">${decodeURIComponent(deger)}</span></div>`;
    }
    icerikHTML += `</div></div>`;

    if (log.xmlYaniti) {
        const guvenliXml = log.xmlYaniti.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        icerikHTML += `
            <div class="detail-box">
                <h4>Sunucu Yanıtı (Response)</h4>
                <div class="content" style="max-height: 200px; overflow-y: auto;">${guvenliXml}</div>
            </div>
        `;
    }

    icerikHTML += `<div class="detail-box"><h4>Orjinal CSV Satır Verisi</h4><div class="content">`;
    for(let [anahtar, deger] of Object.entries(log.hamSatir)) {
        icerikHTML += `<div style="margin-bottom:4px;"><span style="color:#64748b;">${anahtar}:</span> ${deger}</div>`;
    }
    icerikHTML += `</div></div>`;

    modalIcerik.innerHTML = icerikHTML;
    detayModal.style.display = "flex"; 
}

// Modallar
sqlGosterButonu.onclick = () => sqlModal.style.display = "flex";
window.detayKapat = function() {
    detayModal.style.display = 'none';
};
detayKapatButonu.addEventListener('click', detayKapat);

window.sqlKapat = function() {
    sqlModal.style.display = 'none';
};
sqlKapatButonu.addEventListener('click', sqlKapat);
sqlKopyalaButonu.addEventListener('click', () => {
    navigator.clipboard.writeText(sqlKodu.textContent);
    bildirimGoster("SQL kopyalandı!", "success");
});

window.zeminSqlKapat = function() {
    zeminSqlModal.style.display = 'none';
};
zeminSqlKapatButonu.addEventListener('click', zeminSqlKapat);
zeminSqlKopyalaButonu.addEventListener('click', () => {
    navigator.clipboard.writeText(zeminSqlKodu.textContent);
    bildirimGoster("Zemin SQL kopyalandı!", "success");
});

// Kaydırma (Scroll) Butonları İşlevleri
const tableWrapper = document.querySelector('.table-wrapper');
document.getElementById('btnScrollTop').addEventListener('click', () => {
    tableWrapper.scrollTo({ top: 0, behavior: 'smooth' });
});
document.getElementById('btnScrollBottom').addEventListener('click', () => {
    tableWrapper.scrollTo({ top: tableWrapper.scrollHeight, behavior: 'smooth' });
});

tableWrapper.addEventListener('scroll', () => {
    const maxSayfa = Math.ceil(aktifFiltrelenmisLoglar.length / sayfaBasinaKayit);
    const paginatorAlani = document.getElementById('paginatorAlani');
    
    // Tablonun en altına gelinip gelinmediğini kontrol et (veya 10px yakını)
    if (aktifFiltrelenmisLoglar.length > 0 && mevcutSayfa < maxSayfa) {
        if (Math.ceil(tableWrapper.scrollTop + tableWrapper.clientHeight) >= tableWrapper.scrollHeight - 10) {
            paginatorAlani.classList.add('paginator-pulse');
        } else {
            paginatorAlani.classList.remove('paginator-pulse');
        }
    } else {
        paginatorAlani.classList.remove('paginator-pulse');
    }
});

// Paginator Olay Dinleyicileri
if(sayfaBasinaKayitSecici) {
    sayfaBasinaKayitSecici.addEventListener('change', (e) => {
        const val = parseInt(e.target.value);
        sayfaBasinaKayit = isNaN(val) ? 999999 : val;
        mevcutSayfa = 1;
        sayfalayiCiz();
        tableWrapper.scrollTo({ top: 0 });
    });
}

if(btnOncekiSayfa) {
    btnOncekiSayfa.addEventListener('click', () => {
        if (mevcutSayfa > 1) {
            mevcutSayfa--;
            sayfalayiCiz();
            tableWrapper.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
}

if(btnSonrakiSayfa) {
    btnSonrakiSayfa.addEventListener('click', () => {
        const maxSayfa = Math.ceil(aktifFiltrelenmisLoglar.length / sayfaBasinaKayit);
        if (mevcutSayfa < maxSayfa) {
            mevcutSayfa++;
            sayfalayiCiz();
            tableWrapper.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
}

window.onclick = (olay) => {
    if (olay.target === detayModal) detayModal.style.display = "none";
    if (olay.target === sqlModal) sqlModal.style.display = "none";
    if (olay.target === zeminSqlModal) zeminSqlModal.style.display = "none";
}

sqlKopyalaButonu.onclick = () => {
    navigator.clipboard.writeText(sqlKodu.innerText).then(() => {
        const orjinalIcerik = sqlKopyalaButonu.innerHTML;
        sqlKopyalaButonu.innerHTML = '<i class="fa-solid fa-check"></i> Kopyalandı';
        sqlKopyalaButonu.style.background = 'var(--success)';
        setTimeout(() => {
            sqlKopyalaButonu.innerHTML = orjinalIcerik;
            sqlKopyalaButonu.style.background = 'rgba(255,255,255,0.1)';
        }, 2000);
    });
}

zeminSqlKopyalaButonu.onclick = () => {
    navigator.clipboard.writeText(zeminSqlKodu.innerText).then(() => {
        const orjinalIcerik = zeminSqlKopyalaButonu.innerHTML;
        zeminSqlKopyalaButonu.innerHTML = '<i class="fa-solid fa-check"></i> Kopyalandı';
        zeminSqlKopyalaButonu.style.background = 'var(--success)';
        setTimeout(() => {
            zeminSqlKopyalaButonu.innerHTML = orjinalIcerik;
            zeminSqlKopyalaButonu.style.background = 'rgba(255,255,255,0.1)';
        }, 2000);
    });
}

window.zeminSqlAc = function(zeminRef) {
    zeminSqlKodu.innerText = `select t.ilad ,t.ilcead ,t.mahallead , p.adano ,p.parselno , p.durum , p.onaydurum \nfrom tapuidaribirimler t \ninner join parseller p on p.tapumahalleref = t.mahalleid \nwhere p.tapuzeminref ='${zeminRef}'`;
    zeminSqlModal.style.display = "flex";
}

// Bildirimler
function bildirimGoster(mesaj, tip = 'warning') {
    bildirimAlani.className = `alert ${tip}`;
    bildirimIkonu.className = 'fa-solid ' + (tip === 'success' ? 'fa-check-circle' : 'fa-triangle-exclamation');
    bildirimMesaji.textContent = mesaj;
    bildirimAlani.classList.remove('hidden');
}

function bildirimGizle() { 
    bildirimAlani.classList.add('hidden'); 
}
// ---- GELİŞMİŞ FİLTRELEME OLAYLARI ----
const btnGelismisFiltreAcKapa = document.getElementById('btnGelismisFiltreAcKapa');
const gelismisFiltrePaneli = document.getElementById('gelismisFiltrePaneli');
const filtreKolonSecici = document.getElementById('filtreKolonSecici');
const filterInputContainer = document.getElementById('filterInputContainer');
const btnFiltreyiEkle = document.getElementById('btnFiltreyiEkle');
const aktifFiltrelerKutusu = document.getElementById('aktifFiltrelerKutusu');

if(btnGelismisFiltreAcKapa) {
    btnGelismisFiltreAcKapa.addEventListener('click', () => {
        gelismisFiltrePaneli.classList.toggle('hidden');
        if(!gelismisFiltrePaneli.classList.contains('hidden')) {
            gelismisFiltreInputlariGuncelle();
        }
    });
}

if(filtreKolonSecici) {
    filtreKolonSecici.addEventListener('change', gelismisFiltreInputlariGuncelle);
}

function gelismisFiltreInputlariGuncelle() {
    const kolon = filtreKolonSecici.value;
    filterInputContainer.innerHTML = '';
    
    if (kolon === 'kayit' || kolon === 'durum') {
        filterInputContainer.innerHTML = `
            <input type="number" id="gelismisMin" placeholder="Min Değer">
            <span style="color:var(--text-muted)">-</span>
            <input type="number" id="gelismisMax" placeholder="Max Değer">
        `;
    } else if (kolon === 'tarih') {
        filterInputContainer.innerHTML = `
            <input type="date" id="gelismisMin" title="Başlangıç Tarihi">
            <span style="color:var(--text-muted)">-</span>
            <input type="date" id="gelismisMax" title="Bitiş Tarihi">
        `;
    } else if (kolon === 'ipadresi') {
        filterInputContainer.innerHTML = `
            <input type="text" id="gelismisText" placeholder="Örn: 192.168.1.1">
        `;
    } else if (kolon === 'logid') {
        filterInputContainer.innerHTML = `
            <input type="text" id="gelismisText" placeholder="Virgülle veya ID IN (...) şeklinde">
        `;
    }
}

if(btnFiltreyiEkle) {
    btnFiltreyiEkle.addEventListener('click', () => {
        const kolon = filtreKolonSecici.value;
        const kolonIsmi = filtreKolonSecici.options[filtreKolonSecici.selectedIndex].text;
        let kural = { id: ++filtreSayaci, kolon: kolon, label: '' };

        if (kolon === 'kayit' || kolon === 'durum' || kolon === 'tarih') {
            const minInput = document.getElementById('gelismisMin').value;
            const maxInput = document.getElementById('gelismisMax').value;
            if (!minInput && !maxInput) return; // İkisi de boşsa ekleme
            
            kural.min = minInput ? (kolon === 'tarih' ? minInput : parseInt(minInput)) : null;
            kural.max = maxInput ? (kolon === 'tarih' ? (maxInput + " 23:59:59") : parseInt(maxInput)) : null; // Tarihse max günün sonuna kadar
            
            if (minInput && maxInput) kural.label = `${kolonIsmi}: ${minInput} ile ${maxInput} arası`;
            else if (minInput) kural.label = `${kolonIsmi}: ${minInput} ve üstü`;
            else if (maxInput) kural.label = `${kolonIsmi}: ${maxInput} ve altı`;
            
            // Alanları temizle
            document.getElementById('gelismisMin').value = '';
            document.getElementById('gelismisMax').value = '';
        } else if (kolon === 'logid') {
            const textInput = document.getElementById('gelismisText').value.trim();
            if (!textInput) return;
            
            // "ID IN ('...', '...')" veya "123, 456" gibi metinlerden sadece id'leri ayıklamak için
            let temizStr = textInput.replace(/id\s+in/i, '').replace(/[()'"\s]/g, '');
            let idDizisi = temizStr.split(',').filter(id => id.length > 0);
            
            if (idDizisi.length === 0) return;
            
            kural.idListesi = idDizisi;
            kural.label = `Çoklu Log ID (${idDizisi.length} Adet)`;
            document.getElementById('gelismisText').value = '';
        } else {
            const textInput = document.getElementById('gelismisText').value.trim();
            if (!textInput) return;
            kural.text = textInput.toLowerCase();
            kural.label = `${kolonIsmi} '${textInput}' içeriyor`;
            document.getElementById('gelismisText').value = '';
        }

        aktifGelisimisFiltreler.push(kural);
        aktifFiltreRozetleriniCiz();
        filtrele(aramaKutusu.value);
    });
}

function aktifFiltreRozetleriniCiz() {
    if (!aktifFiltrelerKutusu) return;
    
    // Rozetleri ve boş durumu temizle
    const rozetler = aktifFiltrelerKutusu.querySelectorAll('.filter-badge');
    rozetler.forEach(r => r.remove());

    if (aktifGelisimisFiltreler.length === 0) {
        aktifFiltrelerKutusu.classList.add('empty');
    } else {
        aktifFiltrelerKutusu.classList.remove('empty');
        aktifGelisimisFiltreler.forEach(filtre => {
            const badge = document.createElement('div');
            badge.className = 'filter-badge';
            badge.innerHTML = `
                <span>${filtre.label}</span>
                <button onclick="gelismisFiltreyiSil(${filtre.id})"><i class="fa-solid fa-xmark"></i></button>
            `;
            aktifFiltrelerKutusu.appendChild(badge);
        });
    }
}

window.gelismisFiltreyiSil = function(id) {
    aktifGelisimisFiltreler = aktifGelisimisFiltreler.filter(f => f.id !== id);
    aktifFiltreRozetleriniCiz();
    filtrele(aramaKutusu.value);
};

// --- ANOMALİ TESPİT MODÜLÜ ---
const anomaliAcButonu = document.getElementById('anomaliAcButonu');
const anomaliModal = document.getElementById('anomaliModal');
const anomaliKapatButonu = document.getElementById('anomaliKapatButonu');
const anomaliTablari = document.querySelectorAll('.anomali-tabs .tab-btn');

if(anomaliAcButonu) {
    anomaliAcButonu.addEventListener('click', () => {
        const yukleniyorEkrani = document.getElementById('yukleniyorEkrani');
        const h2 = yukleniyorEkrani ? yukleniyorEkrani.querySelector('h2') : null;
        let eskiYazi = h2 ? h2.innerText : "İşlem Yapılıyor...";
        
        if (yukleniyorEkrani) {
            if (h2) h2.innerText = "Anomaliler Analiz Ediliyor...";
            yukleniyorEkrani.classList.remove('hidden');
        }

        setTimeout(() => {
            anomaliAnaliziYap();
            anomaliModal.style.display = 'block';
            
            if (yukleniyorEkrani) {
                yukleniyorEkrani.classList.add('hidden');
                if (h2) h2.innerText = eskiYazi;
            }
        }, 50);
    });
}

if(anomaliKapatButonu) {
    anomaliKapatButonu.addEventListener('click', () => {
        anomaliModal.style.display = 'none';
    });
}

// Sekme Geçişleri
let anomaliMapObjesi = null;
let konumsalKatman = null;

anomaliTablari.forEach(tab => {
    tab.addEventListener('click', () => {
        anomaliTablari.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
        
        if (tab.dataset.tab === 'tab-konumsal' && anomaliMapObjesi) {
            setTimeout(() => { anomaliMapObjesi.invalidateSize(); }, 200);
        }
    });
});

function anomaliAnaliziYap() {
    const analizDizisi = (typeof aktifFiltrelenmisLoglar !== 'undefined' && aktifFiltrelenmisLoglar !== null) ? aktifFiltrelenmisLoglar : cozumlenmisLoglar;

    if(!analizDizisi || analizDizisi.length === 0) {
        document.querySelectorAll('.anomali-liste').forEach(el => el.innerHTML = '<div class="empty-state"><i class="fa-solid fa-database" style="font-size:2rem;margin-bottom:10px;opacity:0.5;"></i><br>Lütfen önce log dosyası analiz ediniz veya filtrenizi gevşetiniz.</div>');
        return;
    }
    
    let guvenlikAnomalileri = [];
    let performansAnomalileri = [];
    let mantiksalAnomaliler = [];
    let istatistikAnomalileri = [];
    let konumsalAnomaliler = []; // Konumsal Tespit Dizisi

    let ipGruplari = {};
    let sorguTekrarlari = {};
    
    const sqliRegex = /(?:union|select|insert|update|delete|drop|truncate)\s|--|%27/i;
    const sldExceptionRegex = /(?:RenderException|ProjectionException|Axis Order Error|ExceptionReport|ows:ExceptionText|ServiceException)/i;
    // Genişletilmiş WKT çıkartıcı RegExp (+, e, E dahil bilimsel gösterim ve url decode uyumu)
    const wktRegex = /(POINT|POLYGON|MULTIPOLYGON|LINESTRING|MULTILINESTRING|MULTIPOINT)\s*\([0-9.,\s()\-+eE]+\)/i;

    analizDizisi.forEach(log => {
        let durumInt = parseInt(log.durum);
        let urlKey = Object.keys(log.hamSatir).find(k=>k.toLowerCase().includes('url') || k.toLowerCase().includes('request'));
        let urlValue = urlKey ? (log.hamSatir[urlKey] || '') : '';
        let xmlYaniti = log.xmlYaniti || '';
        let reqBody = log.reqBody || '';

        // 3. Mantıksal Hatalar
        if(!isNaN(durumInt) && durumInt >= 400) {
            mantiksalAnomaliler.push({
                tur: "Durum Kodu Anomalisi / HTTP " + log.durum,
                detay: "Hatalı İstek / Erişim",
                log: log,
                ispat: `Sunucu bu isteğe HTTP <b>${log.durum}</b> hata kodu ile yanıt vermiştir. (Örn: 404 ise sonsuz tile döngüsü/eksik kaynak, 5xx ise sunucu mantıksal hatası).`
            });
        }
        
        if(xmlYaniti && sldExceptionRegex.test(xmlYaniti)) {
            mantiksalAnomaliler.push({
                tur: "Geçersiz Geometri veya SLD Hatası",
                detay: "RenderException / CRS Uyuşmazlığı",
                log: log,
                ispat: `Sunucu yanıtında OGC XML Error (Örn: RenderException veya Projection Error) tespit edilmiştir. İstemcinin desteklenmeyen SRS/EPSG kodu veya bozuk bir SLD XML'i gönderdiği ispatlanmıştır.`
            });
        }

        // 1. Güvenlik ve Suistimal Hataları
        // WFS-T Mesai Dışı
        let saatMatch = (log.zaman && log.zaman !== '-') ? log.zaman.match(/\s(\d{2}):/) : null;
        let saat = saatMatch && saatMatch[1] ? parseInt(saatMatch[1]) : null;
        
        if (saat !== null && (saat >= 18 || saat <= 8)) {
            if(urlValue.toLowerCase().includes('transaction') || reqBody.toLowerCase().includes('transaction')) {
                guvenlikAnomalileri.push({
                    tur: "WFS-T Yetki Aşımı",
                    detay: "Mesai Dışı Veri Modifikasyonu (Transaction)",
                    log: log,
                    ispat: `Mesai saatleri dışında (Saat: <b>${log.zaman}</b>) OGC WFS-T servisine veritabanı güncelleme/silme talebi gelmesi, izinsiz bir yetki aşımı (siber olay) göstergesidir.`
                });
            } else if (saat >= 3 && saat <= 5) {
                guvenlikAnomalileri.push({
                    tur: "Zaman Anomalisi (Bot/Scraping Olasılığı)",
                    detay: "Gece Yarısı Şüpheli Yoğunluk",
                    log: log,
                    ispat: `Kayıtlı işlem zamanı <b>${log.zaman}</b>. Gece 03:00 - 05:00 arasındaki bu trafik, normal kullanıcılardan ziyade otomatize veri kazıma (scraping) faaliyetlerine işaret eder.`
                });
            }
        }

        // SQL Enjeksiyonu
        if(urlValue.toLowerCase().includes('filter=') && sqliRegex.test(urlValue)) {
            guvenlikAnomalileri.push({
                tur: "OGC SQL Enjeksiyonu (Injection)",
                detay: "CQL_FILTER veya FILTER İçinde Şüpheli Komut",
                log: log,
                ispat: `İstek parametreleri arasında (Örn: CQL_FILTER) zararlı SQL keyword'leri (DROP, SELECT, UNION vb.) veya kaçış karakterleri (%27 / ') saptanmıştır. Amaç Spatial Veritabanını sömürmektir.`
            });
        }

        // 2. Performans ve Altyapı Hataları
        // Katman Bombardımanı
        let layerMatch = urlValue.match(/LAYERS=([^&]+)/i) || urlValue.match(/TYPENAMES=([^&]+)/i);
        if(layerMatch) {
            let layers = layerMatch[1].split(',');
            if(layers.length > 10) {
                performansAnomalileri.push({
                    tur: "Katman Bombardımanı",
                    detay: `${layers.length} Katman Aynı Anda Çağrıldı`,
                    log: log,
                    ispat: `Tek bir WMS/WFS isteğinde virgülle ayrılarak aynı anda tam <b>${layers.length}</b> katman talep edilmiştir. Bu durum sunucu render motorunu ve CPU'yu felç edebilir.`
                });
            }
        }

        // Max Features İhlali
        let maxFMatch = urlValue.match(/MAXFEATURES=(\d+)/i) || urlValue.match(/COUNT=(\d+)/i);
        if(maxFMatch) {
            let maxF = parseInt(maxFMatch[1]);
            if(maxF > 50000) {
                performansAnomalileri.push({
                    tur: "Maksimum Özellik Sınırı (maxFeatures) İhlali",
                    detay: `Talep Edilen: ${maxF} Kayıt`,
                    log: log,
                    ispat: `İstemci, güvenlik limitlerini bypass etmek için maxFeatures (veya count) değerini ekstrem bir boyuta (<b>${maxF}</b>) çekmiştir. (Out of Memory - OOM riski barındırır).`
                });
            }
        }

        // Ölümcül BBOX (Zehirli İstek)
        let bboxMatch = urlValue.match(/BBOX=([^&]+)/i);
        if(bboxMatch) {
            let coords = bboxMatch[1].split(',').map(Number);
            if(coords.length === 4) {
                let dx = Math.abs(coords[2] - coords[0]);
                let dy = Math.abs(coords[3] - coords[1]);
                if(dx >= 180 || dy >= 90) { 
                    performansAnomalileri.push({
                        tur: "Ölümcül BBOX İstekleri (Zehirli İstek)",
                        detay: "Devasa Kapsama Alanı",
                        log: log,
                        ispat: `İstekteki BBOX parametresi (<b>${bboxMatch[1]}</b>) tek seferde tüm dünyayı/kıtayı kapsayacak kadar büyüktür. Binlerce veriyi aynı anda yükletmek sunucuyu kilitleyebilir.`
                    });
                }
            }
        }

        // IP Gruplama
        if(log.ipAdresi && log.ipAdresi !== '-') {
            if(!ipGruplari[log.ipAdresi]) ipGruplari[log.ipAdresi] = [];
            ipGruplari[log.ipAdresi].push(log);
        }

        // İstatistik (Tekrarlanan İstekler)
        if(log.orjinalUrl && log.orjinalUrl !== '-') {
            if (!sorguTekrarlari[log.orjinalUrl]) sorguTekrarlari[log.orjinalUrl] = [];
            sorguTekrarlari[log.orjinalUrl].push(log);
        }

        // Konumsal Tespit (INTERSECTS veya WKT)
        let k_url = log.orjinalUrl || '';
        let k_filtre = log.filtre || '';
        
        let d_url = k_url;
        let d_filtre = k_filtre;
        // URL-Encoded karakterleri (%20, %28 vs) çözmek için
        try { d_url = decodeURIComponent(k_url.replace(/\+/g, '%20')); } catch(e){}
        try { d_filtre = decodeURIComponent(k_filtre.replace(/\+/g, '%20')); } catch(e){}

        if (d_url.toUpperCase().includes('INTERSECTS') || d_filtre.toUpperCase().includes('INTERSECTS')) {
            let eslesme = d_url.match(wktRegex) || d_filtre.match(wktRegex);
            if (eslesme) {
                let rawWkt = eslesme[0];
                let openCount = 0;
                let started = false;
                let validEnd = -1;
                for(let i=0; i<rawWkt.length; i++){
                    if(rawWkt[i] === '(') { openCount++; started = true; }
                    else if (rawWkt[i] === ')') { openCount--; }
                    if (started && openCount === 0) {
                        validEnd = i;
                        break;
                    }
                }
                let cleanWkt = validEnd !== -1 ? rawWkt.substring(0, validEnd + 1) : rawWkt;

                konumsalAnomaliler.push({
                    log: log,
                    wkt: cleanWkt,
                    id: log.logIdDegeri !== '-' ? log.logIdDegeri : log.id
                });
            }
        }
    });

    // Gruplu IP Analizi (Veri Kazıma ve Hız Anomalisi)
    for (const [ip, loglar] of Object.entries(ipGruplari)) {
        if (loglar.length > 50) {
            let zamanlar = loglar.map(l => l.zaman).filter(z => z && z !== '-').sort();
            let gercekIlkZaman = zamanlar.length > 0 ? zamanlar[0] : '-';
            let gercekSonZaman = zamanlar.length > 0 ? zamanlar[zamanlar.length - 1] : '-';
            
            guvenlikAnomalileri.push({
                tur: "Veri Kazıma (Data Scraping) / Sistematik İndirme",
                detay: `IP: ${ip} | Aşırı İstek (Toplam: ${loglar.length})`,
                log: loglar[0],
                tumLoglar: loglar,
                ispat: `Aynı IP üzerinden, <b>${gercekIlkZaman}</b> ile <b>${gercekSonZaman}</b> saatleri arasında toplam <b>${loglar.length}</b> OGC isteği atılmıştır. Sürekli değişen BBOX ile harita datasının sistematik olarak indirildiği (kazındığı) kanıtlanmıştır.`
            });
        }
        
        let oncekiBbox = null;
        for (let i = 0; i < loglar.length; i++) {
            let log = loglar[i];
            let urlKey = Object.keys(log.hamSatir).find(k=>k.toLowerCase().includes('url') || k.toLowerCase().includes('request'));
            if(urlKey) {
                let bboxMatch = (log.hamSatir[urlKey] || '').match(/BBOX=([^&]+)/i);
                if(bboxMatch) {
                    let coords = bboxMatch[1].split(',').map(Number);
                    if(coords.length === 4 && oncekiBbox) {
                        let dx = coords[0] - oncekiBbox[0];
                        let dy = coords[1] - oncekiBbox[1];
                        let mesafe = Math.sqrt(dx*dx + dy*dy);
                        
                        if (mesafe > 20000) { 
                            guvenlikAnomalileri.push({
                                tur: "Hız / Lokasyon Anomalisi (İmkansız Seyahat)",
                                detay: `Fiziksel BBOX Sıçraması (IP: ${ip})`,
                                log: log,
                                ispat: `Aynı IP çok kısa sürede birbiriyle fiziksel bağlantısı olmayan alanlardan işlem yapmıştır.<br>Önceki Konum: [${oncekiBbox.join(', ')}]<br>Yeni Konum: [${coords.join(', ')}]<br>Mesafe Skoru: <b>${mesafe.toFixed(2)}</b>. (Sistemi aldatmaya yönelik IP/VPN/Proxy hilesidir).`
                            });
                            break;
                        }
                    }
                    oncekiBbox = coords.length === 4 ? coords : null;
                }
            }
        }
    }

    // İstatistik (Tekrarlanan Sorgular) Analizi
    for (const [url, loglar] of Object.entries(sorguTekrarlari)) {
        if (loglar.length > 2) { 
            let toplamKayit = 0;
            loglar.forEach(l => {
                let sayi = parseInt(l.objeSayisi);
                if (!isNaN(sayi)) toplamKayit += sayi;
            });

            let sorguOzet = loglar[0].filtre !== '-' ? loglar[0].filtre : loglar[0].hedef;
            if (sorguOzet === '-') sorguOzet = loglar[0].orjinalUrl;

            istatistikAnomalileri.push({
                tur: "Tekrarlanan İstek (İstatistik)",
                detay: `Aynı sorgudan <span style="color: #ef4444; font-weight: bold;">${loglar.length}</span> adet bulundu.`,
                log: loglar[0],
                tumLoglar: loglar,
                count: loglar.length,
                toplamKayit: toplamKayit,
                ispat: `<strong>Sorgulanan Veri / Filtre:</strong> <br><span style="font-family: monospace; background: rgba(0,0,0,0.2); padding: 2px 4px; border-radius: 3px;">${sorguOzet}</span><br><br>Bu sorgu tam <b style="color: #ef4444;">${loglar.length}</b> defa tekrarlanmıştır. Bu tekrarlanan istekler sonucunda toplam <b style="color: #ef4444;">${toplamKayit.toLocaleString()}</b> adet kayıt (feature_count) sunucudan dönmüştür.`
            });
        }
    }
    
    // Toplam dönen kayıt (feature_count) sayısına göre çoktan aza doğru sıralama
    istatistikAnomalileri.sort((a, b) => b.toplamKayit - a.toplamKayit);

    const kartRenderFn = (item) => {
        let url = item.log.orjinalUrl || '-';
        url = url.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        let hamSatirJson = JSON.stringify(item.log.hamSatir, null, 2).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        let logId = 'log_' + Math.random().toString(36).substr(2, 9);
        
        let ids = [];
        if (item.tumLoglar && item.tumLoglar.length > 0) {
            item.tumLoglar.forEach(l => {
                let idKey = Object.keys(l.hamSatir).find(k => k.toLowerCase() === 'id' || k.toLowerCase().includes('logid') || k.toLowerCase().includes('log_id'));
                if (idKey && l.hamSatir[idKey]) ids.push(l.hamSatir[idKey]);
            });
        } else {
            let idKey = Object.keys(item.log.hamSatir).find(k => k.toLowerCase() === 'id' || k.toLowerCase().includes('logid') || k.toLowerCase().includes('log_id'));
            if (idKey && item.log.hamSatir[idKey]) ids.push(item.log.hamSatir[idKey]);
        }
        
        let idBtnHtml = '';
        let idDivHtml = '';
        if (ids.length > 0) {
            let sqlFormat = `ID IN ('${ids.join("', '")}')`;
            idBtnHtml = `<button onclick="document.getElementById('ids_${logId}').style.display = document.getElementById('ids_${logId}').style.display === 'none' ? 'block' : 'none'" style="margin-top:10px; background:#475569; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem; transition: background 0.3s;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#475569'"><i class="fa-solid fa-list"></i> LogID Listesi</button>`;
            idDivHtml = `<div id="ids_${logId}" style="display:none; margin-top:10px; padding:10px; background:rgba(0,0,0,0.3); color:#34d399; border-radius:4px; font-family:monospace; font-size:0.8rem; overflow-x:auto; white-space:pre-wrap; border: 1px solid rgba(255,255,255,0.1); word-break: break-all;">${sqlFormat}</div>`;
        }

        return `
        <div class="anomali-kart danger">
            <div class="anomali-baslik">
                <span><i class="fa-solid fa-triangle-exclamation"></i> ${item.tur}</span> 
                <span class="anomali-detay">${item.log.zaman}</span>
            </div>
            <div class="anomali-detay" style="margin-bottom:8px; font-weight:500; color:var(--text-light);">${item.detay}</div>
            <div class="anomali-detay" style="font-size:0.8rem; opacity:0.8; word-break:break-all; background:rgba(0,0,0,0.1); padding:5px; border-radius:4px;">URL: ${url}</div>
            <div style="margin-top: 10px; padding: 10px; background: rgba(255,255,255,0.05); border-left: 3px solid var(--warning); font-size: 0.85rem;">
                <strong><i class="fa-solid fa-microscope"></i> Tespit Kanıtı (İspat):</strong><br>
                ${item.ispat}
            </div>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <button onclick="document.getElementById('${logId}').style.display = document.getElementById('${logId}').style.display === 'none' ? 'block' : 'none'" style="margin-top:10px; background:var(--primary); color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem; transition: background 0.3s;" onmouseover="this.style.background='var(--primary-dark)'" onmouseout="this.style.background='var(--primary)'">
                    <i class="fa-solid fa-code"></i> İlgili Log Kaydını Göster
                </button>
                ${idBtnHtml}
            </div>
            <div id="${logId}" style="display:none; margin-top:10px; padding:10px; background:rgba(0,0,0,0.3); color:#e0e0e0; border-radius:4px; font-family:monospace; font-size:0.8rem; overflow-x:auto; white-space:pre-wrap; border: 1px solid rgba(255,255,255,0.1);">
                ${hamSatirJson}
            </div>
            ${idDivHtml}
        </div>
        `;
    };


    sonuclariEkranaCiz('listeGuvenlik', guvenlikAnomalileri.slice(0, 100), kartRenderFn);
    sonuclariEkranaCiz('listePerformans', performansAnomalileri.slice(0, 100), kartRenderFn);
    sonuclariEkranaCiz('listeMantiksal', mantiksalAnomaliler.slice(0, 100), kartRenderFn);

    const hedefIst = document.getElementById('listeIstatistik');
    if (hedefIst) {
        if (istatistikAnomalileri.length === 0) {
            hedefIst.innerHTML = '<div class="empty-state"><i class="fa-solid fa-check" style="color:var(--primary); font-size:2rem; margin-bottom:10px;"></i><br>Bu kritere uyan anomali bulunamadı.</div>';
        } else {
            let genelToplamTekrar = 0;
            let genelToplamKayit = 0;
            istatistikAnomalileri.forEach(item => {
                genelToplamTekrar += item.count;
                genelToplamKayit += item.toplamKayit;
            });

            let ozetHtml = `
                <div style="background: rgba(243, 156, 18, 0.1); border: 1px solid #f39c12; border-left: 4px solid #f39c12; padding: 15px; margin-bottom: 20px; border-radius: 6px;">
                    <h4 style="margin: 0 0 10px 0; color: #f39c12;"><i class="fa-solid fa-chart-pie"></i> Tekrarlanan Sorgular - Genel Özet</h4>
                    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                        <div style="background: rgba(0,0,0,0.2); padding: 10px 15px; border-radius: 4px; flex: 1; min-width: 200px;">
                            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Mükerrer İstek Toplamı</div>
                            <div style="font-size: 1.5rem; font-weight: bold; color: #ef4444;">${genelToplamTekrar.toLocaleString()}</div>
                        </div>
                        <div style="background: rgba(0,0,0,0.2); padding: 10px 15px; border-radius: 4px; flex: 1; min-width: 200px;">
                            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Çekilen Toplam Kayıt (Feature)</div>
                            <div style="font-size: 1.5rem; font-weight: bold; color: #ef4444;">${genelToplamKayit.toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            `;
            hedefIst.innerHTML = ozetHtml + istatistikAnomalileri.slice(0, 100).map(kartRenderFn).join('');
        }
    }

    haritayiCiz(konumsalAnomaliler);
}

function haritayiCiz(veriler) {
    const mapDiv = document.getElementById('anomaliMap');
    const listeDiv = document.getElementById('konumsalListe');
    if (!mapDiv) return;

    if (anomaliMapObjesi !== null) {
        anomaliMapObjesi.remove();
        anomaliMapObjesi = null;
        konumsalKatman = null;
    }

    if (veriler.length === 0) {
        mapDiv.innerHTML = '<div class="empty-state" style="padding-top: 50px; color:#666;"><i class="fa-solid fa-map-location-dot" style="font-size:3rem; opacity:0.5; margin-bottom:15px;"></i><br>Loglar içerisinde konumsal bir filtre (INTERSECTS) bulunamadı.</div>';
        if (listeDiv) listeDiv.innerHTML = '<div style="color: #666; text-align: center; margin-top: 20px;">Kayıt yok.</div>';
        return;
    }
    mapDiv.innerHTML = '';

    anomaliMapObjesi = L.map('anomaliMap', {
        center: [39.0, 35.0],
        zoom: 6
    });

    new ResizeObserver(() => {
        if (anomaliMapObjesi) {
            anomaliMapObjesi.invalidateSize();
        }
    }).observe(mapDiv);

    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    });
    
    const googleSatellite = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',{
        maxZoom: 20,
        subdomains:['mt0','mt1','mt2','mt3']
    });

    const googleHybrid = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}',{
        maxZoom: 20,
        subdomains:['mt0','mt1','mt2','mt3']
    });

    osm.addTo(anomaliMapObjesi);

    var baseMaps = {
        "OpenStreetMap": osm,
        "Google Uydu": googleSatellite,
        "Google Hibrit": googleHybrid
    };

    L.control.layers(baseMaps).addTo(anomaliMapObjesi);
    konumsalKatman = L.featureGroup().addTo(anomaliMapObjesi);

    // --- PAGINATION MANTIĞI ---
    let currentPage = 1;
    let itemsPerPage = 50;
    let isShowAll = false;
    let totalPages = Math.ceil(veriler.length / itemsPerPage);

    if (listeDiv) {
        listeDiv.innerHTML = `
            <div style="position: sticky; top: -10px; margin: -10px -10px 0 -10px; padding: 10px 10px 5px 10px; z-index: 1000; background: #ebebeb; box-shadow: 0 4px 6px -4px rgba(0,0,0,0.1);">
                <div style="background: var(--glass-bg); padding: 10px; border-radius: 4px; margin-bottom: 10px; font-weight: bold; color: var(--warning); text-align: center; border: 1px solid var(--glass-border); box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    Toplam <span style="font-size: 1.2rem; color: var(--danger);">${veriler.length}</span> Adet<br>
                    <span style="font-size: 0.8rem; font-weight: normal; color: var(--text-secondary);">Konumsal (INTERSECTS) Sorgu</span>
                    
                    <div style="margin-top: 8px; font-size: 0.85rem; background: rgba(0,0,0,0.05); padding: 6px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.05);">
                        <label style="cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; margin: 0; width: 100%;">
                            <input type="checkbox" id="chkTumunuGoster" style="accent-color: var(--warning); transform: scale(1.1);">
                            <span style="color: var(--text-primary);">Tümünü Göster (Paginatörü İptal Et)</span>
                        </label>
                    </div>
                </div>
                
                <div id="paginatorKapsayici" style="display:flex; justify-content: space-between; align-items:center; margin-bottom: 15px; background: var(--glass-bg); padding: 8px; border-radius: 4px; border: 1px solid var(--glass-border); box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <button id="btnKonumsalGeri" class="btn btn-outline" style="padding: 4px 10px;"><i class="fa-solid fa-chevron-left"></i> Geri</button>
                    <span id="txtSayfaBilgisi" style="font-size: 0.85rem; color: var(--text-primary); font-weight: bold;"></span>
                    <button id="btnKonumsalIleri" class="btn btn-outline" style="padding: 4px 10px;">İleri <i class="fa-solid fa-chevron-right"></i></button>
                </div>
            </div>
            <div id="konumsalListeIcerik"></div>
        `;

        document.getElementById('chkTumunuGoster').addEventListener('change', (e) => {
            isShowAll = e.target.checked;
            document.getElementById('paginatorKapsayici').style.display = isShowAll ? 'none' : 'flex';
            renderPage(1);
        });

        document.getElementById('btnKonumsalGeri').addEventListener('click', () => renderPage(currentPage - 1));
        document.getElementById('btnKonumsalIleri').addEventListener('click', () => renderPage(currentPage + 1));
    }

    function renderPage(pageNo) {
        itemsPerPage = isShowAll ? (veriler.length > 0 ? veriler.length : 1) : 50;
        totalPages = Math.ceil(veriler.length / itemsPerPage) || 1;
        
        if (pageNo < 1) pageNo = 1;
        if (pageNo > totalPages) pageNo = totalPages;
        currentPage = pageNo;

        if (konumsalKatman) {
            konumsalKatman.clearLayers();
        }

        if (listeDiv) {
            let btnGeri = document.getElementById('btnKonumsalGeri');
            let btnIleri = document.getElementById('btnKonumsalIleri');
            let txtSayfa = document.getElementById('txtSayfaBilgisi');
            
            if (btnGeri && btnIleri && txtSayfa) {
                txtSayfa.textContent = `Sayfa ${currentPage} / ${totalPages}`;
                
                if (currentPage === 1) {
                    btnGeri.style.opacity = '0.5';
                    btnGeri.style.pointerEvents = 'none';
                } else {
                    btnGeri.style.opacity = '1';
                    btnGeri.style.pointerEvents = 'auto';
                }

                if (currentPage === totalPages) {
                    btnIleri.style.opacity = '0.5';
                    btnIleri.style.pointerEvents = 'none';
                } else {
                    btnIleri.style.opacity = '1';
                    btnIleri.style.pointerEvents = 'auto';
                }
            }
        }

        let sliceStart = (currentPage - 1) * itemsPerPage;
        let sliceEnd = currentPage * itemsPerPage;
        let aktifVeriler = veriler.slice(sliceStart, sliceEnd);
        let icerikDiv = document.getElementById('konumsalListeIcerik');
        if (icerikDiv) icerikDiv.innerHTML = '';

        aktifVeriler.forEach(veri => {
            let isValid = false;
            let obj = null;
            let hataMesaji = "";
            let gosterilenId = veri.id;

            try {
                let wkt = new Wkt.Wkt();
                wkt.read(veri.wkt);
                
                let geojsonGeom = wkt.toJson();
                
                obj = L.geoJSON(geojsonGeom, {
                    style: function () {
                        return { color: '#ef4444', weight: 3, opacity: 0.9, fillColor: '#ef4444', fillOpacity: 0.3 };
                    },
                    pointToLayer: function (feature, latlng) {
                        return L.circleMarker(latlng, { radius: 7, fillColor: "#ef4444", color: "#666", weight: 1, opacity: 1, fillOpacity: 0.8 });
                    }
                });
                
                if (gosterilenId.length > 15) gosterilenId = gosterilenId.substring(0, 8) + '..';
                obj.bindTooltip(`<b>ID:</b> ${gosterilenId}`, { permanent: true, direction: 'center', className: 'map-label', interactive: true });
                konumsalKatman.addLayer(obj);
                isValid = true;
            } catch (e) {
                hataMesaji = e.message || "Bilinmeyen Format Hatası";
                console.error("WKT Parse Hatası:", veri.wkt, e);
            }

            let cardIdStr = `card-${veri.id}`;

            if (isValid && obj) {
                obj.on('click', function(e) {
                    let listItem = document.getElementById(cardIdStr);
                    if (listItem) {
                        listItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        let prevBg = listItem.style.background;
                        listItem.style.background = 'rgba(243, 156, 18, 0.4)';
                        setTimeout(() => { listItem.style.background = prevBg; }, 1500);
                    }
                });
            }

            if (icerikDiv) {
                let kisaWkt = veri.wkt.length > 60 ? veri.wkt.substring(0, 60) + '...' : veri.wkt;
                let listIdStr = veri.id.length > 15 ? veri.id.substring(0, 15) + '..' : veri.id;
                let div = document.createElement('div');
                div.id = cardIdStr;
                
                if (isValid && obj) {
                    div.style.cssText = "background: var(--glass-bg); border: 1px solid var(--glass-border); box-shadow: 0 2px 4px rgba(0,0,0,0.05); padding: 10px; margin-bottom: 8px; border-radius: 4px; cursor: pointer; transition: all 0.2s;";
                    div.innerHTML = `
                        <div style="font-weight: bold; margin-bottom: 5px; color: var(--warning);"><i class="fa-solid fa-crosshairs"></i> ID: ${listIdStr}</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); font-family: monospace; word-break: break-all; margin-bottom: 5px;">${kisaWkt}</div>
                        <div style="font-size: 0.75rem; color: var(--text-primary);"><i class="fa-regular fa-clock"></i> Zaman: ${veri.log.zaman || '-'}</div>
                    `;
                    div.onmouseover = () => div.style.background = "#fff";
                    div.onmouseout = () => div.style.background = "var(--glass-bg)";
                    div.onclick = () => {
                        if (obj.getBounds) {
                            anomaliMapObjesi.flyToBounds(obj.getBounds(), { padding: [30, 30], maxZoom: 15 });
                        } else if (obj.getLatLng) {
                            anomaliMapObjesi.flyTo(obj.getLatLng(), 15);
                        }
                        if(obj.openTooltip) obj.openTooltip();
                    };
                } else {
                    div.style.cssText = "background: rgba(255,0,0,0.1); border: 1px solid rgba(255,0,0,0.3); padding: 10px; margin-bottom: 8px; border-radius: 4px;";
                    div.innerHTML = `
                        <div style="font-weight: bold; margin-bottom: 5px; color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Hatalı WKT (ID: ${listIdStr})</div>
                        <div style="font-size: 0.75rem; color: #ef4444; word-break: break-all; margin-bottom: 5px;">Ayrıştırılamadı: ${hataMesaji}</div>
                        <div style="font-size: 0.75rem; color: #7f1d1d; font-family: monospace; word-break: break-all; background: rgba(255,0,0,0.05); padding: 5px; border-radius: 3px;">${kisaWkt}</div>
                    `;
                }
                icerikDiv.appendChild(div);
            }
        });
    }

    renderPage(1);
}

function sonuclariEkranaCiz(hedefId, dataList, renderFn) {
    const hedef = document.getElementById(hedefId);
    if(!hedef) return;
    if(dataList.length === 0) {
        hedef.innerHTML = '<div class="empty-state"><i class="fa-solid fa-check" style="color:var(--primary); font-size:2rem; margin-bottom:10px;"></i><br>Bu kritere uyan anomali bulunamadı.</div>';
    } else {
        hedef.innerHTML = dataList.map(renderFn).join('');
    }
}

// --- PRODUCT TOUR (ONBOARDING) ENTEGRASYONU ---
const tourSteps = [
    {
        selector: '.header-title',
        title: 'Hoş Geldiniz!',
        description: 'TKGM Harita Servisleri Log Analizörüne hoş geldiniz. Bu kısa rehber size uygulamanın nasıl kullanılacağını gösterecektir.'
    },
    {
        selector: 'label[for="logDosyasiInput"]',
        title: '1. Dosya Yükleme',
        description: 'Log analizine başlamak için öncelikle WFS veya diğer servis loglarını içeren CSV dosyanızı buradaki bulut ikonuna tıklayarak seçmelisiniz.'
    },
    {
        selector: '#analizEtButonu',
        title: '2. Analizi Başlat',
        description: 'Dosyanızı seçtikten sonra, yüzbinlerce satır veriyi saniyeler içinde analiz etmek ve anomali taramasını başlatmak için bu butona tıklayın.'
    },
    {
        selector: '#anomaliAcButonu',
        title: '3. Anomali Tespiti',
        description: 'Log analizi bittikten sonra sistemde güvenlik, performans veya mantıksal bir ihlal tespit edilirse anomali raporunu (yapay zeka algoritmalarıyla incelenmiş halini) buradan görüntüleyebilirsiniz.'
    },
    {
        selector: '.search-box',
        title: '4. Hızlı Arama',
        description: 'Tabloda listelenen binlerce log içerisinde herhangi bir kelimeyi, IP adresini veya servis adını buradan hızlıca arayabilirsiniz.'
    },
    {
        selector: '#btnGelismisFiltreAcKapa',
        title: '5. Gelişmiş Filtreler',
        description: "Sadece belirli bir zaman aralığındaki, spesifik bir HTTP durum koduna sahip (örn: 404) veya birden fazla ID'ye sahip logları incelemek için bu detaylı menüyü kullanabilirsiniz."
    },
    {
        selector: 'table',
        title: '6. Sonuç Tablosu',
        description: "Tüm loglarınız bu tabloda listelenir. (Henüz bir dosya yüklemediyseniz tablo şu an gizli veya boş olabilir). Tablo başlıklarına tıklayarak sıralama yapabilir, log satırının üzerine tıklayarak tüm (SQL, vb.) detaylarını görebilirsiniz."
    }
];

let appTour = null;

document.addEventListener('DOMContentLoaded', () => {
    // Sınıfın instance'ını oluştur
    if (typeof ProductTour !== 'undefined') {
        appTour = new ProductTour(tourSteps);

        // Header'daki Rehber butonuna tıklandığında manuel başlat
        const startTourBtn = document.getElementById('startTourBtn');
        if (startTourBtn) {
            startTourBtn.addEventListener('click', () => {
                appTour.start();
            });
        }

        // LocalStorage kontrolü ile otomatik başlatma (Sadece 1 kere)
        const isTourCompleted = localStorage.getItem('tourCompleted');
        if (!isTourCompleted) {
            // Biraz gecikmeli başlatalım ki sayfa tam yüklensin
            setTimeout(() => {
                appTour.start();
            }, 500);
        }
    }
});
