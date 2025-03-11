const { contextBridge } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('img').forEach(img => {
        img.loading = 'lazy';
        img.decoding = 'async';
        
        const cachedImage = sessionStorage.getItem(img.src);
        if (cachedImage) {
            img.src = cachedImage;
        }
    });

    document.querySelectorAll('video').forEach(video => {
        video.preload = 'metadata';
        video.addEventListener('canplay', () => {
            if (video.paused) {
                video.preload = 'auto';
            }
        });
    });

    const style = document.createElement('style');
    style.textContent = `
        /* Animações suaves com GPU acceleration */
        .fade-in {
            animation: fadeIn 0.5s ease-in;
            will-change: opacity;
            transform: translateZ(0);
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Efeitos de hover otimizados */
        a {
            transition: all 0.3s ease;
            will-change: transform, color;
            transform: translateZ(0);
        }

        a:hover {
            color: #007bff;
            transform: translateY(-2px);
        }

        /* Loading spinner otimizado */
        .custom-spinner {
            width: 50px;
            height: 50px;
            border: 5px solid #f3f3f3;
            border-top: 5px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            will-change: transform;
            transform: translateZ(0);
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Otimizações gerais */
        * {
            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
    `;
    document.head.appendChild(style);

    const observerOptions = {
        root: null,
        rootMargin: '50px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);

                if (entry.target.tagName === 'IMG') {
                    entry.target.src = entry.target.dataset.src;
                }
            }
        });
    }, observerOptions);

    document.querySelectorAll('.content, .header, .footer, img[data-src]').forEach(el => {
        observer.observe(el);
    });

    const debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    window.addEventListener('scroll', debounce(() => {
    }, 100));

    window.addEventListener('resize', debounce(() => {
    }, 100));
}); 