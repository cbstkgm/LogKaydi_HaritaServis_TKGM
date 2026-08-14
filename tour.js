/**
 * tour.js - Vanilla JS Product Tour (Onboarding) Sistemi
 */

class ProductTour {
    constructor(steps = []) {
        this.steps = steps;
        this.currentIndex = 0;
        this.isActive = false;
        
        // DOM Elemanları
        this.shield = null;
        this.spotlight = null;
        this.tooltip = null;
        this.highlightedElement = null;
        
        this.init();
    }

    init() {
        // Zaten eklenmişse tekrar ekleme
        if (document.querySelector('.tour-spotlight')) return;

        // Arka Plan Kalkanı (Tıklamaları engellemek için)
        this.shield = document.createElement('div');
        this.shield.className = 'tour-backdrop-shield';
        document.body.appendChild(this.shield);

        // Spotlight
        this.spotlight = document.createElement('div');
        this.spotlight.className = 'tour-spotlight';
        document.body.appendChild(this.spotlight);

        // Tooltip
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tour-tooltip';
        
        this.tooltip.innerHTML = `
            <h3 class="tour-tooltip-header"></h3>
            <div class="tour-tooltip-body"></div>
            <div class="tour-tooltip-footer">
                <div class="tour-steps-indicator"></div>
                <div class="tour-btn-group">
                    <button class="tour-btn tour-btn-close">Atla</button>
                    <button class="tour-btn tour-btn-prev">Geri</button>
                    <button class="tour-btn tour-btn-next">İleri</button>
                </div>
            </div>
        `;
        document.body.appendChild(this.tooltip);

        // Event Dinleyicileri
        this.tooltip.querySelector('.tour-btn-close').addEventListener('click', () => this.close());
        this.tooltip.querySelector('.tour-btn-prev').addEventListener('click', () => this.prev());
        this.tooltip.querySelector('.tour-btn-next').addEventListener('click', () => this.next());
        
        // Yeniden boyutlandırmada pozisyonu güncelle
        window.addEventListener('resize', () => {
            if (this.isActive) {
                this.updatePositions();
            }
        });
    }

    start() {
        if (!this.steps || this.steps.length === 0) return;
        this.currentIndex = 0;
        this.isActive = true;
        
        this.shield.classList.add('active');
        this.spotlight.classList.add('active');
        this.tooltip.classList.add('active');
        
        this.showStep();
    }

    close() {
        this.isActive = false;
        this.shield.classList.remove('active');
        this.spotlight.classList.remove('active');
        this.tooltip.classList.remove('active');
        
        if (this.highlightedElement) {
            this.highlightedElement.classList.remove('tour-highlighted-element');
        }
        
        // Turun tamamlandığını kaydet
        localStorage.setItem('tourCompleted', 'true');
    }

    next() {
        if (this.currentIndex < this.steps.length - 1) {
            this.currentIndex++;
            this.showStep();
        } else {
            this.close(); // Son adımda ileriye basılırsa kapat
        }
    }

    prev() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.showStep();
        }
    }

    showStep() {
        const step = this.steps[this.currentIndex];
        
        // Eski elementi temizle
        if (this.highlightedElement) {
            this.highlightedElement.classList.remove('tour-highlighted-element');
        }

        // Yeni elementi bul
        const targetEl = document.querySelector(step.selector);
        
        if (!targetEl) {
            console.warn("ProductTour: Element bulunamadı - " + step.selector);
            // Element yoksa bir sonrakine atla
            if(this.currentIndex < this.steps.length -1 ) {
                this.currentIndex++;
                setTimeout(() => this.showStep(), 100);
            } else {
                this.close();
            }
            return;
        }

        this.highlightedElement = targetEl;
        this.highlightedElement.classList.add('tour-highlighted-element');
        
        // Hedefe scroll
        this.highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // İçerikleri güncelle
        this.tooltip.querySelector('.tour-tooltip-header').textContent = step.title;
        this.tooltip.querySelector('.tour-tooltip-body').innerHTML = step.description;
        this.tooltip.querySelector('.tour-steps-indicator').textContent = "Adım " + (this.currentIndex + 1) + " / " + this.steps.length;
        
        // Buton durumlarını güncelle
        const prevBtn = this.tooltip.querySelector('.tour-btn-prev');
        const nextBtn = this.tooltip.querySelector('.tour-btn-next');
        
        if (this.currentIndex === 0) {
            prevBtn.style.display = 'none';
        } else {
            prevBtn.style.display = 'block';
        }
        
        if (this.currentIndex === this.steps.length - 1) {
            nextBtn.textContent = 'Bitir';
        } else {
            nextBtn.textContent = 'İleri';
        }

        // Animasyon için kısa bir gecikme verelim (Scroll'un oturması için)
        setTimeout(() => this.updatePositions(), 50);
        setTimeout(() => this.updatePositions(), 300); // Garanti güncelleme
    }

    updatePositions() {
        if (!this.highlightedElement || !this.isActive) return;

        const rect = this.highlightedElement.getBoundingClientRect();
        
        // Spotlight boyutunu ve pozisyonunu hedef elemente uyarla (Biraz padding ekleyelim)
        const padding = 10;
        this.spotlight.style.top = (rect.top - padding) + "px";
        this.spotlight.style.left = (rect.left - padding) + "px";
        this.spotlight.style.width = (rect.width + (padding * 2)) + "px";
        this.spotlight.style.height = (rect.height + (padding * 2)) + "px";

        // Tooltip Pozisyonlaması
        const tooltipRect = this.tooltip.getBoundingClientRect();
        let topPos = rect.bottom + padding + 15;
        let leftPos = rect.left;

        // Ekrana sığıyor mu kontrolü (Dikey)
        if (topPos + tooltipRect.height > window.innerHeight) {
            // Alta sığmazsa üste koy
            topPos = rect.top - padding - tooltipRect.height - 15;
        }

        // Yatay taşma kontrolü
        if (leftPos + tooltipRect.width > window.innerWidth) {
            leftPos = window.innerWidth - tooltipRect.width - 20;
        }
        
        if (leftPos < 10) leftPos = 10;
        if (topPos < 10) topPos = 10;

        this.tooltip.style.top = topPos + "px";
        this.tooltip.style.left = leftPos + "px";
    }
}
