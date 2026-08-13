# Log Kaydı Harita Servisi (TKGM)

Bu proje, log kayıtlarını ve parselleri harita üzerinde görselleştirmek amacıyla geliştirilmiş bir uygulamadır.

## 🚀 Canlı Demo

Uygulamanın GitHub Pages üzerinde çalışan güncel haline aşağıdaki bağlantıdan erişebilirsiniz:

👉 [**https://cbstkgm.github.io/LogKaydi_HaritaServis_TKGM/**](https://cbstkgm.github.io/LogKaydi_HaritaServis_TKGM/)

## 🛠 Proje Hakkında

Bu uygulama, sağlanan log kayıtları (`logkaydi.txt`), parsel verileri (`cvpm_parsel_12082026.csv`) ve tapu idari birim verilerini (`tapuidaribirimler.csv`) kullanarak mekansal analizler ve harita üzerinde gösterim yapmayı amaçlar.

## 📦 Kurulum ve Çalıştırma

Projeyi kendi bilgisayarınızda (lokal ortamda) çalıştırmak için aşağıdaki adımları izleyebilirsiniz:

1. **Repoyu klonlayın:**
   ```bash
   git clone https://github.com/cbstkgm/LogKaydi_HaritaServis_TKGM.git
   ```

2. **Dizine gidin:**
   ```bash
   cd LogKaydi_HaritaServis_TKGM
   ```

3. **İlgili uygulamanın klasörüne girip bağımlılıkları yükleyin ve başlatın:**
   ```bash
   cd tkgm-log-analyzer
   npm install
   npm start
   ```
*(Not: Başlatma komutları kullanılan altyapıya göre değişiklik gösterebilir, örneğin React/Vite kullanılıyorsa `npm run dev` kullanılabilir.)*

## 🤝 Katkıda Bulunma

Projeye katkıda bulunmak isterseniz, lütfen bir `Pull Request` (PR) açmadan önce değişikliklerinizi ayrı bir branch üzerinde yapınız.
