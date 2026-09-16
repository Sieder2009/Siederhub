// ============================================================================
// GYM STATS — cinematic effects engine, shared by every page that loads
// css/gym-theme.css. Organized to match the spec sections in that file's
// "CINEMATIC EFFECTS SYSTEM" comment block ([1] intro, [2] hero, [3] reveal,
// [4] scene transitions, [5] image reveal, [6] filmstrip, [8] hover/tilt/
// magnetic, [9] grain, [10] nav/progress/back-to-top, [11] cursor/counters,
// [12] app-page marketing widgets, [13] starfield/hyperspace background).
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
        filmstrip: true,        // [6] pinned horizontal reel on the plan archive
        themeToggle: true,      // [12] light/dark nav toggle (app page)
        scrollspy: true,        // [12] nav-link highlight for the in-view section (app page)
        deviceMedia: true,      // [12] device-frame video placeholder fallback (app page)
        lightbox: true,         // [12] gallery lightbox dialog (app page)
        osDetect: true,         // [12] OS-aware "recommended" download row (app page)
        copyInstall: true,      // [12] quick-install copy-to-clipboard button (app page)
        starfield: true         // [13] full-site starfield / hyperspace-on-scroll background
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

        // Safety net: IntersectionObserver can stop delivering updates in some
        // browsers/contexts (backgrounded or throttled tabs, some automation
        // setups) even though it fired once at setup. A plain scroll/resize
        // listener with a manual geometry check can't have that failure mode —
        // it guarantees content already on screen (or scrolled to) is never
        // stuck invisible, regardless of whether the observer above is behaving.
        var pending = Array.prototype.slice.call(targets);
        function manualCheck() {
            var vh = window.innerHeight;
            pending = pending.filter(function (el) {
                var r = el.getBoundingClientRect();
                // Only "not reached yet" (still fully below the viewport) stays
                // pending. An element already scrolled past (r.bottom <= 0) has
                // had its moment — reveal it too rather than leaving it stuck,
                // which a fast/instant scroll could otherwise skip forever.
                if (r.top >= vh) return true;
                el.classList.add('reveal-visible');
                io.unobserve(el);
                return false;
            });
            if (!pending.length) {
                window.removeEventListener('scroll', onScrollOrResize);
                window.removeEventListener('resize', onScrollOrResize);
            }
        }
        var manualTicking = false;
        function onScrollOrResize() {
            if (manualTicking) return;
            manualTicking = true;
            raf(function () { manualTicking = false; manualCheck(); });
        }
        window.addEventListener('scroll', onScrollOrResize, { passive: true });
        window.addEventListener('resize', onScrollOrResize, { passive: true });
        manualCheck();

        // Belt-and-braces: a fast flick scroll can move the page between two
        // rAF-coalesced checks above without ever landing a frame while a given
        // element was in view. A short-lived poll (first ~15s only, well within
        // where someone would still be scrolling through a first visit) sweeps
        // up anything either mechanism missed, independent of scroll events.
        var pollStart = Date.now();
        var pollId = setInterval(function () {
            if (!pending.length || Date.now() - pollStart > 15000) { clearInterval(pollId); return; }
            manualCheck();
        }, 400);
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

    // ------------------------------------------------- [12] APP PAGE — nav upgrades
    // Theme toggle: an inline script in app/index.html's <head> already
    // applies the stored (or system-preferred) theme to <html> before first
    // paint, so this only has to sync the button's icon and handle clicks —
    // it works fine standalone too (falls back to whatever data-theme
    // already is, or dark, if that inline script is ever absent).
    function initThemeToggle() {
        if (!FX.themeToggle) return;
        var btn = document.querySelector('.nav-theme-toggle');
        if (!btn) return;
        var sunIcon = btn.querySelector('.theme-icon-sun');
        var moonIcon = btn.querySelector('.theme-icon-moon');
        var root = document.documentElement;
        var key = 'gymstats-theme';

        function syncIcons() {
            var isLight = root.getAttribute('data-theme') === 'light';
            if (sunIcon) sunIcon.hidden = isLight;
            if (moonIcon) moonIcon.hidden = !isLight;
        }
        syncIcons();

        btn.addEventListener('click', function () {
            var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            root.setAttribute('data-theme', next);
            try { localStorage.setItem(key, next); } catch (err) { /* private mode */ }
            syncIcons();
        });
    }

    // Scrollspy: highlights the nav link whose section is currently in
    // view. No-ops on any page (like the homepage) whose nav links don't
    // point at in-page section ids.
    function initScrollspy() {
        if (!FX.scrollspy) return;
        var links = document.querySelectorAll('.nav-links a[href^="#"]');
        if (!links.length || !('IntersectionObserver' in window)) return;

        var map = {};
        var any = false;
        links.forEach(function (a) {
            var id = a.getAttribute('href').slice(1);
            var section = id && document.getElementById(id);
            if (section) { map[id] = a; any = true; }
        });
        if (!any) return;

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var link = map[entry.target.id];
                if (!link) return;
                links.forEach(function (a) { a.classList.remove('active'); });
                link.classList.add('active');
            });
        }, { threshold: 0, rootMargin: '-40% 0px -55% 0px' });

        Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
    }

    // Device-frame video placeholders: the media/*.mp4 clips aren't
    // recorded yet and will 404 today. error -> stays on .no-source (the
    // gradient placeholder stays on top). loadeddata -> .has-source (the
    // placeholder hides and the real clip plays). Shared with initLightbox
    // below, which builds a fresh device-frame for the enlarged video view.
    function wireDeviceFrame(frame) {
        var video = frame.querySelector('.device-video');
        if (!video) return;
        video.addEventListener('error', function () {
            frame.classList.add('no-source');
            frame.classList.remove('has-source');
        });
        video.addEventListener('loadeddata', function () {
            frame.classList.add('has-source');
            frame.classList.remove('no-source');
            var playPromise = video.play();
            if (playPromise && playPromise.catch) playPromise.catch(function () { /* autoplay blocked — placeholder already hidden, clip stays paused on first frame */ });
        });
    }

    function initDeviceMedia() {
        if (!FX.deviceMedia) return;
        var frames = document.querySelectorAll('.device-frame');
        if (!frames.length) return;
        frames.forEach(wireDeviceFrame);
    }

    // Gallery lightbox: clicking a screenshot or clip opens an enlarged
    // version in a native <dialog> (Esc-to-close and backdrop for free).
    function initLightbox() {
        if (!FX.lightbox) return;
        var dialog = document.querySelector('dialog.lightbox');
        var items = document.querySelectorAll('.gallery-item');
        if (!dialog || !items.length) return;
        var body = dialog.querySelector('.lightbox-body');
        var closeBtn = dialog.querySelector('.lightbox-close');
        if (!body) return;

        function openFor(item) {
            var type = item.getAttribute('data-type');
            var src = item.getAttribute('data-src');
            var caption = item.getAttribute('data-caption') || '';
            body.innerHTML = '';

            if (type === 'video') {
                var frame = document.createElement('div');
                frame.className = 'device-frame no-source lightbox-frame';
                var video = document.createElement('video');
                video.className = 'device-video';
                video.muted = true;
                video.loop = true;
                video.autoplay = true;
                video.playsInline = true;
                video.preload = 'metadata';
                video.src = src;
                var placeholder = document.createElement('div');
                placeholder.className = 'device-placeholder';
                placeholder.innerHTML =
                    '<img src="https://api.iconify.design/lucide:play-circle.svg?color=%23ffffff" width="40" height="40" alt="">' +
                    '<span class="device-placeholder-caption">Preview coming soon</span>';
                frame.appendChild(video);
                frame.appendChild(placeholder);
                body.appendChild(frame);
                wireDeviceFrame(frame);
            } else {
                var photoFrame = document.createElement('div');
                photoFrame.className = 'device-frame lightbox-frame';
                var img = document.createElement('img');
                img.className = 'device-photo';
                img.src = src;
                img.alt = caption;
                photoFrame.appendChild(img);
                body.appendChild(photoFrame);
            }

            if (caption) {
                var cap = document.createElement('p');
                cap.className = 'lightbox-caption';
                cap.textContent = caption;
                body.appendChild(cap);
            }

            if (typeof dialog.showModal === 'function') dialog.showModal();
        }

        items.forEach(function (item) {
            var trigger = item.querySelector('.gallery-trigger') || item;
            trigger.addEventListener('click', function () { openFor(item); });
        });

        if (closeBtn) closeBtn.addEventListener('click', function () { dialog.close(); });
        dialog.addEventListener('click', function (e) {
            if (e.target === dialog) dialog.close();
        });
    }

    // OS-aware download highlight: best-effort, local-only UA sniff — no
    // network call, nothing sent anywhere. Silently no-ops if inconclusive
    // or if the page has no #download table with data-os rows.
    function initOSDownloadHighlight() {
        if (!FX.osDetect) return;
        var rows = document.querySelectorAll('#download tr[data-os]');
        if (!rows.length) return;

        var raw = '';
        try {
            raw = (navigator.userAgentData && navigator.userAgentData.platform) ||
                navigator.platform || navigator.userAgent || '';
        } catch (err) { raw = ''; }

        var detected = null;
        if (/Android/i.test(raw)) detected = 'android';
        else if (/iPhone|iPad/i.test(raw)) detected = 'ios';
        else if (/Win/i.test(raw)) detected = 'windows';
        else if (/Mac/i.test(raw)) detected = 'macos';
        if (!detected) return;

        rows.forEach(function (row) {
            if (row.getAttribute('data-os') !== detected) return;
            row.classList.add('recommended');
            var cell = row.querySelector('.download-recommend-cell');
            if (cell && !cell.textContent.trim()) {
                var badge = document.createElement('span');
                badge.className = 'recommended-badge';
                badge.textContent = 'Recommended for you';
                cell.appendChild(badge);
            }
        });
    }

    // Quick-install copy button: copies the clone command and shows a
    // brief "Copied!" confirmation. No-ops silently if the Clipboard API
    // isn't available (denied permission, insecure context, old browser).
    function initCopyInstall() {
        if (!FX.copyInstall) return;
        var buttons = document.querySelectorAll('.copy-btn');
        if (!buttons.length) return;
        buttons.forEach(function (btn) {
            var defaultLabel = btn.textContent;
            btn.addEventListener('click', function () {
                var text = btn.getAttribute('data-copy-text') || '';
                if (!text || !navigator.clipboard || !navigator.clipboard.writeText) return;
                navigator.clipboard.writeText(text).then(function () {
                    btn.textContent = 'Copied!';
                    btn.classList.add('copied');
                    setTimeout(function () {
                        btn.textContent = defaultLabel;
                        btn.classList.remove('copied');
                    }, 1600);
                }, function () { /* clipboard denied — no-op */ });
            });
        });
    }

    // ------------------------------------------- [13] starfield / hyperspace
    // A single full-viewport <canvas>, injected once behind all page content
    // (z-index -1 in CSS — it paints above <body>'s own background but below
    // every normal-flow element). Classic 3D star-field projection: each
    // star has x/y/z in a centered 3D space; every frame it's projected to
    // screen space via perspective divide (screenX = x/z * focal + centerX)
    // and drawn as a short line from its PREVIOUS projected position to its
    // CURRENT one. At idle speed that line is a couple of px — reads as a
    // drifting dot. Scrolling adds to a "boost" that decays ~10%/frame; at
    // high speed the same per-star z-delta (and so the same line) simply
    // gets much longer, which is what turns the field into radiating
    // light-speed streaks — no separate "hyperspace mode" branch needed.
    function initStarfield() {
        if (!FX.starfield || reduceMotion) return;
        var canvas = document.createElement('canvas');
        canvas.className = 'fx-starfield';
        canvas.setAttribute('aria-hidden', 'true');
        document.body.insertBefore(canvas, document.body.firstChild);
        var ctx = canvas.getContext('2d');
        if (!ctx) return;

        var DENSITY = 1 / 7000;   // stars per square px of viewport
        var MAX_STARS = 340;
        var W, H, cx, cy, focal, stars;

        function baseRGB() {
            // near-white on the site's default dark theme; a dark ink tone
            // on app/index.html's light theme (data-theme="light") so stars
            // still read against a pale background instead of vanishing.
            return document.documentElement.getAttribute('data-theme') === 'light' ? '23,23,15' : '255,255,255';
        }
        var ACCENT_RGB = '255,109,77'; // matches --accent-light, ties a minority of stars to the brand

        function spawnStar(atFarPlane) {
            var z = atFarPlane ? focal : focal * (0.05 + Math.random() * 0.95);
            return { x: (Math.random() - 0.5) * W, y: (Math.random() - 0.5) * H, z: z, pz: z, tint: Math.random() < 0.12 };
        }

        function resize() {
            W = canvas.width = window.innerWidth;
            H = canvas.height = window.innerHeight;
            cx = W / 2; cy = H / 2;
            focal = Math.max(W, H) * 0.9;
            var count = Math.min(MAX_STARS, Math.max(60, Math.round(W * H * DENSITY)));
            stars = [];
            for (var i = 0; i < count; i++) stars.push(spawnStar(false));
        }

        var boost = 0;
        function addBoost() { boost = Math.min(boost + 5.5, 46); }

        var starRGB = baseRGB();
        var frameCount = 0;
        var visible = !document.hidden;
        document.addEventListener('visibilitychange', function () {
            visible = !document.hidden;
            if (visible) raf(tick);
        });

        function tick() {
            if (!visible) return;
            frameCount++;
            if (frameCount % 45 === 0) starRGB = baseRGB(); // cheap periodic re-check, not worth doing every frame

            var speed = 0.55 + boost;
            boost *= 0.9;
            if (boost < 0.02) boost = 0;

            ctx.clearRect(0, 0, W, H);

            for (var i = 0; i < stars.length; i++) {
                var s = stars[i];
                s.pz = s.z;
                s.z -= speed;
                if (s.z <= 1) { stars[i] = spawnStar(true); continue; }

                var sx = cx + (s.x / s.z) * focal;
                var sy = cy + (s.y / s.z) * focal;
                if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) continue;
                var px = cx + (s.x / s.pz) * focal;
                var py = cy + (s.y / s.pz) * focal;

                var depth = 1 - s.z / focal; // 0 far -> 1 near
                ctx.strokeStyle = 'rgba(' + (s.tint ? ACCENT_RGB : starRGB) + ',' + Math.min(1, 0.15 + depth * 0.9).toFixed(2) + ')';
                ctx.lineWidth = Math.max(0.6, depth * 2.2);
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(sx, sy);
                ctx.stroke();
            }

            raf(tick);
        }

        var resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(resize, 150);
        });
        window.addEventListener('scroll', addBoost, { passive: true });
        window.addEventListener('wheel', addBoost, { passive: true });

        resize();
        raf(tick);
    }

    // --------------------------------------------------------------- boot
    prepHero();
    prepImages();
    classifyReveal();

    initThemeToggle();
    initNavAndScroll();
    initScrollspy();
    initGrain();
    initCursor();
    initTilt();
    initMagnetic();
    initFilmstrip();
    initDeviceMedia();
    initLightbox();
    initOSDownloadHighlight();
    initCopyInstall();
    initStarfield();

    initCinemaIntro(); // -> afterIntro() once done: reveal observer, hero playback, counters
})();
