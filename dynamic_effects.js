/**
 * LE DÉFI DU MILLION - DYNAMIC VISUAL EFFECTS & MOTION SUITE
 * High-performance, 60fps micro-interactions & cinematic atmosphere
 */

document.addEventListener('DOMContentLoaded', () => {
    initScrollProgressBar();
    initAmbientCursorSpotlight();
    initHeroGoldenParticles();
    initCountUpAnimations();
    initCard3DTilt();
    initCinematicImageLightbox();
});

// 1. TOP SCROLL PROGRESS BAR
function initScrollProgressBar() {
    const progressBar = document.createElement('div');
    progressBar.id = 'top-scroll-progress';
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        height: 3.5px;
        width: 0%;
        background: linear-gradient(90deg, #D4A373, #C8A951, #E29578);
        z-index: 99999;
        transition: width 0.1s ease-out;
        box-shadow: 0 0 10px rgba(200, 169, 81, 0.8), 0 0 20px rgba(212, 163, 115, 0.5);
    `;
    document.body.appendChild(progressBar);

    window.addEventListener('scroll', () => {
        const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        progressBar.style.width = scrolled + '%';
    }, { passive: true });
}

// 2. AMBIENT CURSOR GLOW SPOTLIGHT (Desktop Only)
function initAmbientCursorSpotlight() {
    if (window.innerWidth < 1024) return;

    const spotlight = document.createElement('div');
    spotlight.id = 'cursor-ambient-spotlight';
    spotlight.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 1;
        transition: opacity 0.3s ease;
        background: radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(200, 169, 81, 0.06), transparent 70%);
    `;
    document.body.appendChild(spotlight);

    window.addEventListener('mousemove', (e) => {
        spotlight.style.setProperty('--mouse-x', e.clientX + 'px');
        spotlight.style.setProperty('--mouse-y', e.clientY + 'px');
    }, { passive: true });
}

// 3. HERO GOLDEN PARTICLES CANVAS (Cinematic Floating Embers)
function initHeroGoldenParticles() {
    const hero = document.querySelector('header');
    if (!hero) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'hero-particles-canvas';
    canvas.style.cssText = `
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
        opacity: 0.75;
    `;
    hero.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let width = canvas.width = hero.clientWidth;
    let height = canvas.height = hero.clientHeight;

    window.addEventListener('resize', () => {
        width = canvas.width = hero.clientWidth;
        height = canvas.height = hero.clientHeight;
    });

    const particles = [];
    const particleCount = window.innerWidth < 768 ? 28 : 55;

    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 2.5 + 0.8,
            speedY: Math.random() * 0.7 + 0.2,
            speedX: (Math.random() - 0.5) * 0.5,
            opacity: Math.random() * 0.7 + 0.2,
            fadeSpeed: Math.random() * 0.015 + 0.005,
            color: Math.random() > 0.4 ? '200, 169, 81' : '212, 163, 115' // Gold or Crema
        });
    }

    function renderParticles() {
        ctx.clearRect(0, 0, width, height);

        particles.forEach(p => {
            p.y -= p.speedY;
            p.x += p.speedX;
            p.opacity += p.fadeSpeed;

            if (p.opacity > 0.9 || p.opacity < 0.15) {
                p.fadeSpeed = -p.fadeSpeed;
            }

            if (p.y < 0) {
                p.y = height;
                p.x = Math.random() * width;
            }
            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.color}, ${Math.abs(p.opacity)})`;
            ctx.shadowBlur = 8;
            ctx.shadowColor = `rgba(${p.color}, 0.8)`;
            ctx.fill();
        });

        requestAnimationFrame(renderParticles);
    }
    renderParticles();
}

// 4. ANIMATED COUNT-UP FOR NUMBERS (Stats Counters)
function initCountUpAnimations() {
    const counters = document.querySelectorAll('.font-mono');
    if (!counters || counters.length === 0) return;

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const text = el.textContent.trim();
                const match = text.match(/[\d,]+/);
                if (match && !el.dataset.animated) {
                    el.dataset.animated = "true";
                    const targetNum = parseInt(match[0].replace(/,/g, ''), 10);
                    if (targetNum && targetNum > 0) {
                        animateNumber(el, targetNum, text);
                    }
                }
                obs.unobserve(el);
            }
        });
    }, { threshold: 0.4 });

    counters.forEach(c => observer.observe(c));

    function animateNumber(element, target, originalText) {
        let current = 0;
        const duration = 1400; // ms
        const startTime = performance.now();

        function update(now) {
            const progress = Math.min((now - startTime) / duration, 1);
            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);
            current = Math.floor(ease * target);

            let formatted = current.toLocaleString();
            element.textContent = originalText.replace(/[\d,]+/, formatted);

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = originalText;
            }
        }
        requestAnimationFrame(update);
    }
}

// 5. INTERACTIVE 3D TILT EFFECT ON CARDS
function initCard3DTilt() {
    if (window.innerWidth < 1024) return; // Only desktop for performance

    const cards = document.querySelectorAll('.glass-card');
    cards.forEach(card => {
        card.style.transformStyle = 'preserve-3d';
        card.style.transition = 'transform 0.25s ease-out, box-shadow 0.25s ease-out, border-color 0.25s ease';

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -6; // Max 6 deg
            const rotateY = ((x - centerX) / centerX) * 6;

            card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-6px)`;
            card.style.boxShadow = `0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 25px rgba(200, 169, 81, 0.25)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
            card.style.boxShadow = '';
        });
    });
}

// 6. CINEMATIC FULLSCREEN IMAGE LIGHTBOX ON CLICK
function initCinematicImageLightbox() {
    const lightbox = document.createElement('div');
    lightbox.id = 'cinematic-image-lightbox';
    lightbox.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(8, 7, 6, 0.94);
        backdrop-filter: blur(16px);
        z-index: 100000;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        cursor: zoom-out;
        opacity: 0;
        transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    lightbox.innerHTML = `
        <div style="position: relative; max-width: 90vw; max-height: 88vh; display: flex; flex-direction: column; align-items: center;" onclick="event.stopPropagation()">
            <img id="lightbox-full-img" src="" style="max-width: 100%; max-height: 75vh; object-fit: contain; border-radius: 1rem; border: 1px solid rgba(200, 169, 81, 0.4); box-shadow: 0 30px 60px rgba(0,0,0,0.95), 0 0 40px rgba(200, 169, 81, 0.2);">
            <div id="lightbox-caption" style="margin-top: 1rem; color: #fff; font-family: 'Tajawal', sans-serif; font-size: 1rem; font-weight: 700; text-align: center; text-shadow: 0 2px 8px rgba(0,0,0,0.8);"></div>
            <button id="lightbox-close-btn" style="position: absolute; top: -16px; right: -16px; width: 40px; height: 40px; border-radius: 50%; background: #181715; color: #C8A951; border: 2px solid #C8A951; font-weight: bold; font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.8);">✕</button>
        </div>
    `;
    document.body.appendChild(lightbox);

    function closeLightbox() {
        lightbox.style.opacity = '0';
        setTimeout(() => {
            lightbox.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    }

    lightbox.addEventListener('click', closeLightbox);
    document.getElementById('lightbox-close-btn').addEventListener('click', closeLightbox);
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLightbox();
    });

    // Attach click zoom to cards & pitch images
    document.querySelectorAll('.card-img-container img, .h-44 img, .h-48 img, .stop-card img').forEach(img => {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            const fullImg = document.getElementById('lightbox-full-img');
            const caption = document.getElementById('lightbox-caption');
            fullImg.src = img.src;
            caption.textContent = img.alt || 'Le Défi du Million • تحدي المليون';

            lightbox.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            setTimeout(() => {
                lightbox.style.opacity = '1';
            }, 20);
        });
    });
}
