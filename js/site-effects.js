// ============================================================================
// GYM STATS — cinematic effects engine, shared by every page that loads
// css/gym-theme.css. Organized to match the spec sections in that file's
// "CINEMATIC EFFECTS SYSTEM" comment block ([1] intro, [2] hero, [3] reveal,
// [4] scene transitions, [5] image reveal, [6] filmstrip, [8] hover/tilt/
// magnetic, [9] grain, [10] nav/progress/back-to-top, [11] cursor/counters).
//
// TO TUNE OR DISABLE AN EFFECT:
//   - Flip a flag in the FX object right below to turn a whole feature off.
//   - Timing/distance/blur/etc. are CSS custom properties (--fx-*) at the
//     top of css/gym-theme.css — change the numbers, nothing here.
//   - prefers-reduced-motion and mobile widths already scale most of this
//     down automatically; you shouldn't need to touch those cases by hand.
// ============================================================================
(function () {
    'use strict';

    var FX = {
        intro: true,            // [1] letterbox intro
        introCountdown: true,   // [1] optional 3-2-1 leader inside the intro
        scrollReveal: true,     // [3][4][5] container/scene/image reveal-on-scroll
        parallax: true,         // [2] hero background + content parallax
        navAutoHide: true,      // [10] nav slides away on scroll-down
        progressBar: true,      // [10] top scroll-progress bar
        backToTop: true,        // [11] "back to top" button
        cursor: true,           // [11] custom dot+ring cursor (fine pointers only)
        tilt: true,             // [8] 3D card tilt (fine pointers only)
        magnetic: true,         // [8] magnetic button pull (fine pointers only)
        grain: true,            // [9] film grain overlay (desktop only)
        counters: true,         // [11] count-up numbers
        filmstrip: true         // [6] pinned horizontal reel on the plan archive
    };

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    // ---------------------------------------------------------------- utils
    function raf(fn) { return window.requestAnimationFrame(fn); }

    function wrapWords(root) {
        var i = 0;
        function walk(node) {
            if (node.nodeType === 3) {
                if (!node.textContent || !/\S/.test(node.textContent)) return;
                var frag = document.createDocumentFragment();
                node.textContent.split(/(\s+)/).forEach(function (part) {
                    if (part === '') return;
                    if (/^\s+$/.test(part)) {
                        frag.appendChild(document.createTextNode(part));
                        return;
                    }
                    var outer = document.createElement('span');
                    outer.className = 'word';
                    var inner = document.createElement('span');
                    inner.className = 'word-inner';
                    inner.textContent = part;
                    inner.style.animationDelay = (i * 70) + 'ms';
                    i++;
                    outer.appendChild(inner);
                    frag.appendChild(outer);
                });
                node.parentNode.replaceChild(frag, node);
            } else if (node.nodeType === 1 && node.childNodes.length) {
                Array.prototype.slice.call(node.childNodes).forEach(walk);
            }
        }
        Array.prototype.slice.call(root.childNodes).forEach(walk);
    }

    function animateCounter(el) {
        var text = el.textContent;
        var match = text.match(/\d+(?:[.,]\d+)?/);
        if (!match) return;
        var raw = match[0];
        var usesComma = raw.indexOf(',') !== -1;
        var target = parseFloat(raw.replace(',', '.'));
        if (isNaN(target)) return;
        var decimals = (raw.split(/[.,]/)[1] || '').length;
        var prefix = text.slice(0, match.index);
        var suffix = text.slice(match.index + raw.length);
        var duration = 1400;
        var start = null;

        function tick(ts) {
            if (start === null) start = ts;
            var p = Math.min((ts - start) / duration, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            var out = (target * eased).toFixed(decimals);
            if (usesComma) out = out.replace('.', ',');
            el.textContent = prefix + out + suffix;
            if (p < 1) raf(tick); else el.textContent = text;
        }
        raf(tick);
    }

    // ------------------------------------------------------- [2] hero prep
    // Runs immediately (before the intro even finishes) so the DOM is ready
    // and the Ken Burns layer is already drifting by the time the letterbox
    // bars pull back. Pure structure — no visible animation starts until
    // .hero-play is added later by playHero().
    function prepHero() {
        var heroes = document.querySelectorAll('.hero, .app-hero');
        heroes.forEach(function (hero) {
            var bg = document.createElement('div');
            bg.className = 'hero-bg';
            bg.setAttribute('aria-hidden', 'true');
            var bgInner = document.createElement('div');
            bgInner.className = 'hero-bg-inner';
            bg.appendChild(bgInner);
            hero.insertBefore(bg, hero.firstChild);

            var content = document.createElement('div');
            content.className = 'hero-content';
            var child = bg.nextSibling;
            while (child) {
                var next = child.nextSibling;
                content.appendChild(child);
                child = next;
            }
            hero.appendChild(content);

            var h1 = hero.querySelector('h1');
            if (h1 && !reduceMotion) wrapWords(h1);
        });
    }

    function playHero() {
        document.querySelectorAll('.hero, .app-hero').forEach(function (el) {
            el.classList.add('hero-play');
        });
    }

    // --------------------------------------------------- [5] image prep
    function prepImages() {
        document.querySelectorAll('.screenshot-grid img').forEach(function (img) {
            var wrap = document.createElement('div');
            wrap.className = 'img-reveal';
            img.parentNode.insertBefore(wrap, img);
            wrap.appendChild(img);
            img.classList.add('img-reveal-photo');
            var panel = document.createElement('div');
            panel.className = 'img-reveal-panel';
            panel.setAttribute('aria-hidden', 'true');
            wrap.appendChild(panel);
        });
    }

    // ------------------------------------------ [3][4] reveal classification
    // Bold tier: section headers, the app-promo halves, workout-day blocks,
    // standalone notes — alternates left/right in document order.
    var BOLD_SELECTOR = '.section-header, .app-promo-text, .app-promo-visual, ' +
        '.workout-section, .privacy-note, .credits-box';
    // Scene tier: top-level sections get a one-shot clip-path "cut" on top
    // of (not instead of) whatever their children are doing.
    var SCENE_SELECTOR = '.section, .app-promo';
    // Swept into the gentle .reveal tier even though the HTML doesn't
    // already carry the class (kept out of the HTML to avoid a no-JS flash).
    var GENTLE_EXTRA_SELECTOR = '.table-wrap, .site-footer';

    function classifyReveal() {
        document.querySelectorAll(BOLD_SELECTOR).forEach(function (el, i) {
            el.classList.add('reveal-bold');
            if (i % 2 === 1) el.classList.add('reveal-right');
        });

        var sceneVariants = ['scene-wipe-l', 'scene-wipe-r', 'scene-circle'];
        document.querySelectorAll(SCENE_SELECTOR).forEach(function (el, i) {
            el.classList.add('scene', sceneVariants[i % sceneVariants.length]);
        });

        document.querySelectorAll(GENTLE_EXTRA_SELECTOR).forEach(function (el) {
            el.classList.add('reveal');
        });

        var parentCounts = new Map();
        document.querySelectorAll('.reveal, .reveal-bold').forEach(function (el) {
            var parent = el.parentElement;
            var i = parentCounts.get(parent) || 0;
            el.style.setProperty('--reveal-i', i);
            parentCounts.set(parent, i + 1);
        });
    }

    function startRevealObserver() {
        var targets = document.querySelectorAll('.reveal, .reveal-bold, .scene, .img-reveal');
        if (!targets.length) return;

        if (!FX.scrollReveal || reduceMotion || !('IntersectionObserver' in window)) {
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

    function initCounters() {
        if (!FX.counters) return;
        var els = document.querySelectorAll('.stat-grid .stat-value, .overview-grid .overview-value');
        if (!els.length || reduceMotion || !('IntersectionObserver' in window)) return;
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        els.forEach(function (el) { io.observe(el); });
    }

    // ------------------------------------------------------------- [1] intro
    function initCinemaIntro() {
        var overlay = document.getElementById('cinemaIntro');
        if (!FX.intro && overlay) overlay.remove();
        overlay = FX.intro ? overlay : null;

        if (!overlay) { afterIntro(); return; }

        var seenKey = 'gymstats-intro-seen';
        var alreadySeen = true;
        try { alreadySeen = sessionStorage.getItem(seenKey) === '1'; } catch (err) { /* private mode */ }

        if (reduceMotion || alreadySeen) {
            overlay.remove();
            afterIntro();
            return;
        }

        document.documentElement.classList.add('intro-lock');

        var topBar = overlay.querySelector('.cinema-bar-top');
        var bottomBar = overlay.querySelector('.cinema-bar-bottom');

        if (FX.introCountdown && topBar) {
            var cd = document.createElement('div');
            cd.className = 'cinema-countdown';
            cd.innerHTML =
                '<svg viewBox="0 0 60 60" aria-hidden="true">' +
                '<circle class="ring-track" cx="30" cy="30" r="26"></circle>' +
                '<circle class="ring-sweep" cx="30" cy="30" r="26"></circle>' +
                '</svg>' +
                '<div class="cinema-countdown-num"><span>3</span><span>2</span><span>1</span></div>';
            topBar.appendChild(cd);
        }
        if (bottomBar) {
            var skip = document.createElement('span');
            skip.className = 'cinema-skip';
            skip.textContent = 'Klicken zum Überspringen';
            bottomBar.appendChild(skip);
        }

        var holdMs = FX.introCountdown ? 1300 : 550;
        var opened = false;
        var finished = false;

        function openIntro() {
            if (opened) return;
            opened = true;
            overlay.classList.add('cinema-opening');
        }
        function finishIntro() {
            if (finished) return;
            finished = true;
            overlay.remove();
            document.documentElement.classList.remove('intro-lock');
            afterIntro();
        }

        var openTimer = setTimeout(openIntro, holdMs);
        var safetyTimer = setTimeout(finishIntro, holdMs + 1400);

        overlay.addEventListener('click', function () {
            clearTimeout(openTimer);
            openIntro();
        });
        overlay.addEventListener('animationend', function (e) {
            if (e.animationName !== 'cinemaBarUp' && e.animationName !== 'cinemaBarDown') return;
            clearTimeout(safetyTimer);
            finishIntro();
        });

        try { sessionStorage.setItem(seenKey, '1'); } catch (err) { /* ignore */ }
    }

    function afterIntro() {
        startRevealObserver();
        initCounters();
        // Bebas Neue loads with font-display:swap, after wrapWords() has
        // already split the h1 into per-word spans. If the swap lands after
        // playHero() starts, different glyph widths can reflow which word
        // sits on which line mid-animation. Wait for the swap (bounded, so
        // a slow/failed font load can never stall the hero) before playing.
        var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
        var timeout = new Promise(function (resolve) { setTimeout(resolve, 1200); });
        Promise.race([fontsReady, timeout]).then(playHero, playHero);
    }

    // --------------------------------------------- [6] filmstrip (pinned)
    var filmstripWrap = null, filmstripPin = null, filmstripTrack = null;

    function isMobileFilmstrip() {
        return window.matchMedia('(max-width: 720px), (hover: none) and (pointer: coarse)').matches;
    }
    function sizeFilmstrip() {
        if (!filmstripWrap || !filmstripTrack) return;
        if (reduceMotion || isMobileFilmstrip()) { filmstripWrap.style.height = ''; return; }
        var extra = Math.max(filmstripTrack.scrollWidth - window.innerWidth, 0);
        filmstripWrap.style.height = (window.innerHeight + extra) + 'px';
    }
    function updateFilmstripFrame() {
        if (!filmstripWrap || !filmstripTrack || !filmstripPin) return;
        if (reduceMotion || isMobileFilmstrip()) return;
        var scrollable = filmstripWrap.offsetHeight - window.innerHeight;
        if (scrollable <= 0) return;
        var rect = filmstripWrap.getBoundingClientRect();
        var progress = Math.min(Math.max(-rect.top / scrollable, 0), 1);
        var maxTranslate = Math.max(filmstripTrack.scrollWidth - filmstripPin.clientWidth, 0);
        filmstripTrack.style.transform = 'translate3d(' + (-progress * maxTranslate).toFixed(1) + 'px,0,0)';
    }
    function initFilmstrip() {
        if (!FX.filmstrip) return;
        filmstripWrap = document.querySelector('.filmstrip-wrap');
        filmstripPin = document.querySelector('.filmstrip-pin');
        filmstripTrack = document.querySelector('.filmstrip-track');
        if (!filmstripWrap || !filmstripTrack) return;
        sizeFilmstrip();
        window.addEventListener('load', sizeFilmstrip);
    }

    // ------------------------------- [2][6][10] shared scroll/resize ticker
    // One rAF-coalesced listener drives every continuous, scroll-position
    // -dependent effect (nav glass/hide, progress bar, back-to-top
    // visibility, hero parallax, filmstrip translate). These genuinely need
    // live scroll position, unlike the one-shot reveals above, which is why
    // this is the one place the "IntersectionObserver, not a scroll
    // listener" rule doesn't apply — see the CSS file's [3] comment.
    function initNavAndScroll() {
        var nav = document.querySelector('.site-nav');
        var hero = document.querySelector('.hero, .app-hero');
        var heroBg = hero ? hero.querySelector('.hero-bg') : null;
        var heroContent = hero ? hero.querySelector('.hero-content') : null;

        var progress = null;
        if (FX.progressBar) {
            progress = document.createElement('div');
            progress.className = 'fx-progress';
            progress.setAttribute('aria-hidden', 'true');
            document.body.appendChild(progress);
        }

        var toTop = null;
        if (FX.backToTop) {
            toTop = document.createElement('button');
            toTop.type = 'button';
            toTop.className = 'fx-to-top';
            toTop.setAttribute('aria-label', 'Nach oben scrollen');
            toTop.textContent = '↑';
            toTop.addEventListener('click', function () {
                window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
            });
            document.body.appendChild(toTop);
        }

        var lastY = window.scrollY || 0;
        var ticking = false;

        function frame() {
            ticking = false;
            var y = window.scrollY || window.pageYOffset || 0;
            var doc = document.documentElement;
            var max = (doc.scrollHeight - doc.clientHeight) || 1;
            var pct = Math.min(Math.max(y / max, 0), 1) * 100;

            if (progress) progress.style.width = pct + '%';
            if (toTop) toTop.classList.toggle('visible', y > 640);

            if (nav) {
                nav.classList.toggle('nav-glass', y > 60);
                if (FX.navAutoHide && !reduceMotion) {
                    nav.classList.toggle('nav-hidden', y > lastY && y > 160);
                } else {
                    nav.classList.remove('nav-hidden');
                }
            }

            if (heroBg && FX.parallax && !reduceMotion) {
                var rect = hero.getBoundingClientRect();
                if (rect.bottom > 0 && rect.top < window.innerHeight) {
                    heroBg.style.transform = 'translateY(' + (y * 0.22).toFixed(1) + 'px)';
                    if (heroContent) heroContent.style.transform = 'translateY(' + (y * 0.08).toFixed(1) + 'px)';
                }
            }

            if (FX.filmstrip) updateFilmstripFrame();

            lastY = y;
        }

        function onScroll() {
            if (!ticking) { ticking = true; raf(frame); }
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        frame();
    }

    // ------------------------------------------------------------ [9] grain
    function initGrain() {
        if (!FX.grain || reduceMotion) return;
        if (window.matchMedia('(max-width: 720px)').matches) return;
        var grain = document.createElement('div');
        grain.className = 'fx-grain';
        grain.setAttribute('aria-hidden', 'true');
        document.body.appendChild(grain);
    }

    // --------------------------------------------------------- [11] cursor
    function initCursor() {
        if (!FX.cursor || reduceMotion || !finePointer) return;

        var dot = document.createElement('div');
        dot.className = 'fx-cursor-dot';
        var ring = document.createElement('div');
        ring.className = 'fx-cursor-ring';
        document.body.appendChild(dot);
        document.body.appendChild(ring);
        document.body.classList.add('fx-cursor-on');

        var mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
        var ringX = mouseX, ringY = mouseY;
        function place(el, x, y) { el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-50%)'; }
        place(dot, mouseX, mouseY);
        place(ring, ringX, ringY);

        document.addEventListener('pointermove', function (e) {
            mouseX = e.clientX;
            mouseY = e.clientY;
            place(dot, mouseX, mouseY);
        }, { passive: true });

        function loop() {
            ringX += (mouseX - ringX) * 0.18;
            ringY += (mouseY - ringY) * 0.18;
            place(ring, ringX, ringY);
            raf(loop);
        }
        raf(loop);

        var hoverTargets = 'a, button, .btn, .plan-card, .version-card, .feature-block, ' +
            '.chart-point, .filmstrip-frame, input, summary, .fx-to-top';
        document.addEventListener('pointerover', function (e) {
            if (e.target.closest && e.target.closest(hoverTargets)) ring.classList.add('cursor-hover');
        });
        document.addEventListener('pointerout', function (e) {
            if (e.target.closest && e.target.closest(hoverTargets)) ring.classList.remove('cursor-hover');
        });
    }

    // ---------------------------------------------------------- [8] tilt
    function initTilt() {
        if (!FX.tilt || reduceMotion || !finePointer) return;
        var max = 9; // degrees — mirrors --fx-tilt-max in the CSS
        document.querySelectorAll('.plan-card, .version-card, .feature-block, .chart-card, .overview-card, .stat-tile')
            .forEach(function (card) {
                card.addEventListener('pointermove', function (e) {
                    var r = card.getBoundingClientRect();
                    var px = (e.clientX - r.left) / r.width;
                    var py = (e.clientY - r.top) / r.height;
                    card.style.setProperty('--tilt-x', ((0.5 - py) * max).toFixed(2) + 'deg');
                    card.style.setProperty('--tilt-y', ((px - 0.5) * max).toFixed(2) + 'deg');
                    card.style.setProperty('--tilt-mx', (px * 100).toFixed(1) + '%');
                    card.style.setProperty('--tilt-my', (py * 100).toFixed(1) + '%');
                    card.classList.add('tilt-active');
                });
                card.addEventListener('pointerleave', function () {
                    card.classList.remove('tilt-active');
                });
            });
    }

    // ------------------------------------------------- [8] magnetic + ripple
    function initMagnetic() {
        var magneticOn = FX.magnetic && !reduceMotion && finePointer;
        document.querySelectorAll('.btn').forEach(function (btn) {
            if (magneticOn) {
                btn.addEventListener('pointermove', function (e) {
                    var r = btn.getBoundingClientRect();
                    var x = (e.clientX - r.left - r.width / 2) * 0.28;
                    var y = (e.clientY - r.top - r.height / 2) * 0.28;
                    btn.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
                });
                btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
            }
            btn.addEventListener('pointerdown', function (e) {
                var r = btn.getBoundingClientRect();
                var size = Math.max(r.width, r.height) * 2;
                var ripple = document.createElement('span');
                ripple.className = 'btn-ripple';
                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = (e.clientX - r.left - size / 2) + 'px';
                ripple.style.top = (e.clientY - r.top - size / 2) + 'px';
                btn.appendChild(ripple);
                ripple.addEventListener('animationend', function () { ripple.remove(); });
            });
        });
    }

    // --------------------------------------------------------------- boot
    prepHero();
    prepImages();
    classifyReveal();

    initNavAndScroll();
    initGrain();
    initCursor();
    initTilt();
    initMagnetic();
    initFilmstrip();

    initCinemaIntro(); // -> afterIntro() once done: reveal observer, hero playback, counters
})();
