// Shared across all GYM STATS pages: torn-paper intro (once per browser
// session) + scroll-triggered reveal for card/container elements.
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function initReveal() {
        var targets = document.querySelectorAll('.reveal');
        if (!targets.length) return;

        var parentCounts = new Map();
        targets.forEach(function (el) {
            var parent = el.parentElement;
            var i = parentCounts.get(parent) || 0;
            el.style.setProperty('--reveal-i', i);
            parentCounts.set(parent, i + 1);
        });

        if (reduceMotion || !('IntersectionObserver' in window)) {
            targets.forEach(function (el) { el.classList.add('reveal-visible'); });
            return;
        }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal-visible');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

        targets.forEach(function (el) { io.observe(el); });
    }

    // ---- Intro tear ----
    var overlay = document.getElementById('tearIntro');
    if (!overlay) {
        initReveal();
        return;
    }

    var seenKey = 'gymstats-intro-seen';
    var alreadySeen = true;
    try { alreadySeen = sessionStorage.getItem(seenKey) === '1'; } catch (err) { /* private mode, etc. */ }

    if (reduceMotion || alreadySeen) {
        overlay.remove();
        initReveal();
        return;
    }

    // Intro is about to play: hold the reveal-in of above-the-fold cards
    // until the paper actually tears open, so they visibly slide in right
    // as the page appears instead of finishing invisibly underneath it.
    document.documentElement.classList.add('intro-lock');

    var halvesDone = 0;
    overlay.addEventListener('animationend', function () {
        halvesDone++;
        if (halvesDone >= 2) {
            overlay.remove();
            document.documentElement.classList.remove('intro-lock');
            initReveal();
        }
    });

    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            overlay.classList.add('tearing');
        });
    });

    try { sessionStorage.setItem(seenKey, '1'); } catch (err) { /* ignore */ }
})();
