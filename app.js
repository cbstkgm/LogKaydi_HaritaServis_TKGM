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
    } else {
        bildirimGoster("Geçerli WMS veya WFS isteği (SERVICE=WMS/WFS) bulunamadı.", "warning");
        sonuclarAlani.classList.add('hidden');
        const scrollBtns = document.getElementById('kaydirmaButonlari');
        if(scrollBtns) scrollBtns.classList.add('hidden');
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
    document.getElementById('paginatorAlani').classList.remove('hidden');

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
    const terim = (arananKelimeler || '').toLowerCase();
    const filtrelenmis = cozumlenmisLoglar.filter(log => {
        if (aktifServisFiltresi !== 'HEPSİ' && log.servis !== aktifServisFiltresi) return false;
        if (!terim) return true;

        const alanlar = [
            log.id, log.logIdDegeri, log.ipAdresi, log.servis, 
            log.istekTipi, log.hedef, log.filtre, log.objeSayisi, 
            log.zaman, log.durum
        ];
        return alanlar.some(alan => alan !== null && alan !== undefined && alan.toString().toLowerCase().includes(terim));
    });
    tabloyuCiz(filtrelenmis);
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
