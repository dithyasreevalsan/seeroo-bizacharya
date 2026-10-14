/* Bizacharya — Phase 1 front-end behaviour (vanilla JS) */
(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  /* ---------- Header: shrink on scroll + active link ---------- */
  function initHeader() {
    const header = $('#header');
    if (!header) return;
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    $$('.nav__link[href], .drawer__nav a[href]').forEach((a) => {
      const target = (a.getAttribute('href') || '').split('/').pop().toLowerCase();
      if (target === current) { a.classList.add('is-active'); a.setAttribute('aria-current', 'page'); }
    });
  }

  /* ---------- Desktop dropdowns (click for touch, hover via CSS, keyboard) ---------- */
  function initDropdowns() {
    const items = $$('.nav__item--has-sub');
    const closeAll = (except) => items.forEach((it) => {
      if (it !== except) { it.classList.remove('is-open'); $('.nav__toggle', it).setAttribute('aria-expanded', 'false'); }
    });
    items.forEach((item) => {
      const btn = $('.nav__toggle', item);
      btn.addEventListener('click', () => {
        const open = item.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(open));
        closeAll(item);
      });
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { item.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
        if (e.key === 'ArrowDown' && document.activeElement === btn) {
          e.preventDefault(); item.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true');
          const first = $('.nav__sub a', item); if (first) first.focus();
        }
      });
      item.addEventListener('focusout', (e) => {
        if (!item.contains(e.relatedTarget)) { item.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }
      });
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.nav__item--has-sub')) closeAll(); });
  }

  /* ---------- Mobile drawer ---------- */
  function initDrawer() {
    const drawer = $('#drawer'), burger = $('#burger');
    if (!drawer || !burger) return;
    const closeBtn = $('.drawer__close', drawer), backdrop = $('.drawer__backdrop', drawer);
    const open = () => {
      drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false');
      burger.setAttribute('aria-expanded', 'true'); document.body.classList.add('is-locked'); closeBtn.focus();
    };
    const close = () => {
      drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true');
      burger.setAttribute('aria-expanded', 'false'); document.body.classList.remove('is-locked'); burger.focus();
    };
    burger.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', close);
    drawer.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') trapFocus(e, $('.drawer__panel', drawer));
    });
    $$('.drawer__acc', drawer).forEach((btn) => {
      btn.addEventListener('click', () => {
        const sub = document.getElementById(btn.getAttribute('aria-controls'));
        const open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(open)); sub.classList.toggle('is-open', open);
      });
    });
  }

  function trapFocus(e, container) {
    const nodes = $$(FOCUSABLE, container).filter((n) => n.offsetParent !== null);
    if (!nodes.length) return;
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- Scroll reveal (single IntersectionObserver) ---------- */
  function initReveal() {
    const nodes = $$('[data-reveal]');
    if (!nodes.length) return;
    $$('[data-stagger]').forEach((group) => {
      $$('[data-reveal]', group).forEach((el, i) => { el.style.transitionDelay = (i * 80) + 'ms'; });
    });
    if (reducedMotion || !('IntersectionObserver' in window)) { nodes.forEach((n) => n.classList.add('is-visible')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); } });
      // A ratio threshold is unsafe here: intersectionRatio is measured against the element's own
      // height, so a block taller than ~8x the viewport can never reach 0.12 and would stay
      // invisible forever. Firing on any intersection past a percentage margin is height-proof.
    }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
    nodes.forEach((n) => io.observe(n));
  }

  /* ---------- Decorative art: very slight scroll drift (e.g. Contact page hero/section art) ---------- */
  function initParallax() {
    const nodes = $$('[data-parallax]');
    if (!nodes.length || reducedMotion) return;
    let ticking = false;
    const update = () => {
      const mid = window.innerHeight / 2;
      nodes.forEach((el) => {
        const factor = parseFloat(el.dataset.parallax) || 0.05;
        const offset = (el.getBoundingClientRect().top - mid) * factor;
        el.style.transform = `translateY(${offset}px)`;
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ---------- Listing pages (Opportunities / Services): highlight the row currently in view ---------- */
  function initListingTimeline() {
    const lists = $$('.listing__list');
    if (!lists.length || reducedMotion || !('IntersectionObserver' in window)) return;
    lists.forEach((list) => {
      const rows = $$('li', list);
      if (!rows.length) return;
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { en.target.classList.toggle('is-active', en.isIntersecting); });
      }, { threshold: 0.5 });
      rows.forEach((r) => io.observe(r));
    });
  }

  /* ---------- Our Journey (About page): scroll-reveal each milestone, grow the connector
     line to match how far the visitor has read. Independent of initJourney(), which drives
     the unrelated homepage entrepreneur-journey roadmap. ---------- */
  function initCompanyTimeline() {
    const list = $('[data-timeline]');
    if (!list) return;
    const items = $$('.timeline__item', list);
    if (!items.length) return;

    // The spine runs exactly from the first marker's centre to the last marker's centre, and the
    // progress fill stops on the marker of the latest item revealed — so both are measured from
    // the markers themselves rather than assumed from the list height.
    const markers = items.map((it) => $('.timeline__marker', it));
    let centers = [];
    let maxSeen = -1;
    const setProgress = () => {
      const len = centers[centers.length - 1] - centers[0];
      const reached = maxSeen < 0 ? 0 : centers[maxSeen] - centers[0];
      list.style.setProperty('--progress', len > 0 ? String(reached / len) : '0');
    };
    const measure = () => {
      if (markers.some((m) => !m)) return;
      const top = list.getBoundingClientRect().top;
      // Markers carry no transform (only the content beside them animates), so their rects are stable.
      centers = markers.map((m) => m.getBoundingClientRect().top - top + m.offsetHeight / 2);
      list.style.setProperty('--line-top', centers[0] + 'px');
      list.style.setProperty('--line-len', (centers[centers.length - 1] - centers[0]) + 'px');
      setProgress();
    };
    measure();
    window.addEventListener('resize', measure, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

    if (reducedMotion || !('IntersectionObserver' in window)) {
      items.forEach((it) => it.classList.add('is-in'));
      maxSeen = items.length - 1;
      setProgress();
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const item = en.target;
        item.classList.add('is-in');
        const idx = items.indexOf(item);
        if (idx > maxSeen) {
          maxSeen = idx;
          setProgress();
        }
        io.unobserve(item);
      });
    }, { threshold: 0.4, rootMargin: '0px 0px -80px 0px' });
    items.forEach((it) => io.observe(it));
  }

  /* ---------- Back to top ---------- */
  function initBackToTop() {
    const btn = $('#backToTop');
    if (!btn) return;
    const toggle = () => btn.classList.toggle('is-visible', window.scrollY > 600);
    toggle();
    window.addEventListener('scroll', toggle, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }));
  }

  /* ---------- Journey: one-step-at-a-time number -> image reveal, synced dotted-line progress ---------- */
  function initJourney() {
    const jm = $('[data-journey]');
    if (!jm) return;
    const list = $('.journey-map__list', jm);
    const stages = $$('.journey-stage', jm);
    if (!stages.length) return;

    // Number visible, then crossfades into the settled image. Each step is given at least as long
    // as its CSS transition so nothing is cut off mid-motion. The five values sum to one stage
    // cycle (1100ms) — .journey-map__list::after uses that same duration to glide the connector
    // line continuously between nodes, so keep the two in step if you retune either.
    const TIMING = { numberIn: 300, hold: 200, crossfade: 340, pause: 80, line: 180 };

    const showFinalState = () => {
      stages.forEach((s) => s.classList.add('is-in', 'show-image'));
      if (list) list.style.setProperty('--progress', '1');
    };

    if (reducedMotion || !('IntersectionObserver' in window)) { showFinalState(); return; }

    let runToken = 0;
    let timers = [];
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

    // Cancel any in-flight sequence and snap every stage + the line back to its untouched starting state.
    const reset = () => {
      runToken++;
      clearTimers();
      stages.forEach((s) => s.classList.remove('is-in', 'show-image', 'is-current'));
      if (list) {
        list.classList.add('no-anim');
        list.style.setProperty('--progress', '0');
        void list.getBoundingClientRect(); // force reflow so the next transition isn't skipped
        list.classList.remove('no-anim');
      }
    };

    // --progress is a fraction of the *track*, which runs from the first node's centre to the
    // last one's — so node i sits at i / (stages - 1), not i / stages.
    const lastNode = Math.max(stages.length - 1, 1);

    // Walk the stages 01 -> 06, one at a time: number appears, holds, crossfades into the image,
    // then pauses before the next one begins. The line is aimed one node ahead at the top of each
    // stage, so it spends the whole cycle gliding toward the circle that lights up next and lands
    // exactly as it does, rather than catching up in a jump once the stage is already over.
    const runSequence = () => {
      reset();
      const token = runToken;
      let t = 40;
      stages.forEach((stage, i) => {
        const nextNode = String(Math.min((i + 1) / lastNode, 1));
        timers.push(setTimeout(() => {
          if (runToken !== token) return;
          stage.classList.add('is-in', 'is-current');
          if (list) list.style.setProperty('--progress', nextNode);
        }, t));
        t += TIMING.numberIn + TIMING.hold;

        timers.push(setTimeout(() => { if (runToken === token) stage.classList.add('show-image'); }, t));
        t += TIMING.crossfade + TIMING.pause;

        timers.push(setTimeout(() => { if (runToken === token) stage.classList.remove('is-current'); }, t));
        t += TIMING.line;
      });
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) runSequence(); else reset(); });
    }, { threshold: 0.2, rootMargin: '0px 0px -60px 0px' });
    io.observe(jm);
  }

  /* ---------- Vision & Mission: connected infographic reveal ---------- */
  function initVisionMission() {
    const vm = $('[data-vm2]');
    if (!vm) return;
    const lines = $$('.vm2__connector-line', vm);
    lines.forEach((line) => {
      const len = Math.ceil(line.getTotalLength());
      line.style.setProperty('--len', len);
    });
    if (reducedMotion || !('IntersectionObserver' in window)) { vm.classList.add('is-in'); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { vm.classList.add('is-in'); io.disconnect(); } });
    }, { threshold: 0.25 });
    io.observe(vm);
  }

  /* ---------- Swiper carousels ---------- */
  function initCarousels() {
    if (typeof Swiper === 'undefined') return;
    $$('[data-events-carousel]').forEach((el) => {
      new Swiper(el, {
        slidesPerView: 1, loop: true, speed: 600, grabCursor: true,
        autoplay: reducedMotion ? false : { delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true },
        navigation: { nextEl: $('.events-carousel__next', el.closest('.events-carousel')), prevEl: $('.events-carousel__prev', el.closest('.events-carousel')) },
        pagination: { el: $('.events-carousel__dots', el.closest('.events-carousel')), clickable: true },
        a11y: { enabled: true }, keyboard: { enabled: true }
      });
    });
    $$('[data-stories]').forEach((el) => {
      const wrap = el.closest('.stories');
      const cur = $('[data-story-current]', wrap), bar = $('[data-story-progress]', wrap);
      const total = $$('.swiper-slide', el).length;
      const update = (sw) => {
        const idx = typeof sw.realIndex === 'number' && !isNaN(sw.realIndex) ? sw.realIndex : 0;
        const n = (idx % total) + 1;
        if (cur) cur.textContent = String(n).padStart(2, '0');
        if (bar) bar.style.width = (n / total * 100) + '%';
      };
      const sw = new Swiper(el, {
        slidesPerView: 'auto', centeredSlides: true, loop: true, spaceBetween: 28, grabCursor: true, speed: reducedMotion ? 0 : 800,
        navigation: { nextEl: $('.stories__next', wrap), prevEl: $('.stories__prev', wrap) },
        a11y: { enabled: true }, keyboard: { enabled: true },
        on: { init: update, slideChange: update }
      });
      // Own auto-advance (every 2s): keeps sliding even with the pointer over it, pauses while the tab is hidden,
      // restarts its count after any manual move, and only runs while the carousel is on screen.
      const DELAY = 2000; let t = 0, hover = false;
      const onScreen = () => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; };
      // Keeps ticking; a tick only advances when nobody is hovering and the carousel is in view
      const arm = () => { clearTimeout(t); t = setTimeout(() => { if (!hover && !document.hidden && onScreen()) sw.slideNext(); arm(); }, DELAY); };
      sw.on('slideChange', arm);
      document.addEventListener('visibilitychange', arm);
      arm();
    });
    const thumbsEl = $('[data-gallery-thumbs]');
    const galleryEl = $('[data-gallery]');
    if (galleryEl) {
      const thumbs = thumbsEl ? new Swiper(thumbsEl, { slidesPerView: 'auto', spaceBetween: 10, watchSlidesProgress: true, freeMode: true, centeredSlides: false, centerInsufficientSlides: true }) : null;
      new Swiper(galleryEl, {
        slidesPerView: 1, spaceBetween: 16, loop: true, speed: 500, grabCursor: true,
        navigation: { nextEl: '.gallery__next', prevEl: '.gallery__prev' },
        thumbs: thumbs ? { swiper: thumbs } : undefined, a11y: { enabled: true }, keyboard: { enabled: true }
      });
    }
  }

  /* ---------- Success Stories: layered "prev / active / next" testimonial deck ----------
     Data-driven — add a story by adding an entry to STORIES; the three card slots are built
     generically from this array. The card itself (position/size/gradient/shadow) never moves —
     only the inner .story-deck__content fades/slides/scales when the story changes. */
  var STORIES = [
    {
      image: null,
      name: 'From Homemaker to Business Owner',
      designation: 'Home-based food products, Thrissur',
      company: '',
      testimonial: 'With guidance from Bizacharya, I transformed my passion for homemade food products into a registered business. Today, my products reach customers across Kerala through retail outlets and online platforms. The mentorship, branding support, and business planning provided by Bizacharya gave me the confidence to grow my dream into reality.',
      category: 'Success Story',
      storyLink: 'success-stories.html'
    },
    {
      image: null,
      name: 'Building an Agri Enterprise',
      designation: 'Value-added agri products, Palakkad',
      company: '',
      testimonial: 'I always wanted to expand beyond traditional farming but wasn\'t sure where to begin. Bizacharya helped me identify opportunities in value-added agricultural products, prepare a business plan, and understand market requirements. Today, my enterprise supplies packaged products to regional distributors and continues to grow.',
      category: 'Success Story',
      storyLink: 'success-stories.html'
    },
    {
      image: null,
      name: 'A Startup Registered in Weeks, Not Months',
      designation: 'SaaS startup founder, Kochi',
      company: '',
      testimonial: 'Choosing the right structure, company registration and compliance were all handled with clarity. We could focus on building the product while Bizacharya guided the paperwork.',
      category: 'Success Story',
      storyLink: 'success-stories.html'
    },
    {
      image: null,
      name: 'Funding-Ready with a Credible Project Report',
      designation: 'Small manufacturing unit, Kozhikode',
      company: '',
      testimonial: 'The project report and financial projections prepared with Bizacharya gave our bank discussions a professional footing. We understood our own numbers better than ever before.',
      category: 'Success Story',
      storyLink: 'success-stories.html'
    },
    {
      image: null,
      name: 'A Financial Consultancy Built on Trust',
      designation: 'Loan facilitation business, Kollam',
      company: '',
      testimonial: 'From compliance to branding, Bizacharya helped me set up a financial services business that clients trust. The ongoing mentoring keeps me focused on sustainable growth.',
      category: 'Success Story',
      storyLink: 'success-stories.html'
    },
    {
      image: null,
      name: 'Taking a Rural Handicraft Brand Online',
      designation: 'Handicraft enterprise, Wayanad',
      company: '',
      testimonial: 'Bizacharya connected our self-help group with the right marketplaces and helped us with branding and packaging. Our products now travel far beyond our village.',
      category: 'Success Story',
      storyLink: 'success-stories.html'
    }
  ];

  function initStoryShow() {
    const root = $('[data-story-deck]');
    if (!root || !STORIES.length) return;
    const track = $('.story-deck__track', root);
    const slotPrev = $('.story-deck__card--prev', root);
    const slotActive = $('.story-deck__card--active', root);
    const slotNext = $('.story-deck__card--next', root);
    if (!track || !slotPrev || !slotActive || !slotNext) return;

    const avatarSvg = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>';
    const arrowSvg = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';

    const cardHTML = (story, role) => {
      const showCta = role === 'active';
      return (
        '<div class="story-deck__content">' +
        '<span class="story-deck__quote-mark" aria-hidden="true">&ldquo;</span>' +
        '<span class="story-deck__avatar" role="img" aria-label="Portrait for ' + story.name + '">' + avatarSvg + '</span>' +
        '<h3>' + story.name + '</h3>' +
        (story.designation ? '<p class="story-deck__role">' + story.designation + '</p>' : '') +
        '<blockquote>' + story.testimonial + '</blockquote>' +
        '<span class="tag story-deck__tag">' + story.category + '</span>' +
        (showCta ? '<a class="story-deck__cta" href="' + story.storyLink + '">Read Full Story ' + arrowSvg + '</a>' : '') +
        '</div>'
      );
    };

    let active = 0;
    let timer = null;
    const n = STORIES.length;

    function render() {
      const prevIdx = (active - 1 + n) % n;
      const nextIdx = (active + 1) % n;
      slotPrev.innerHTML = cardHTML(STORIES[prevIdx], 'prev');
      slotActive.innerHTML = cardHTML(STORIES[active], 'active');
      slotNext.innerHTML = cardHTML(STORIES[nextIdx], 'next');
    }

    // Content fades/slides/scales out, swaps underneath, then fades/slides/scales back in — the
    // card itself (outer box, position, size, gradient, shadow) never animates or resizes.
    function goTo(i) {
      if (n < 2) return;
      const next = ((i % n) + n) % n;
      if (next === active) return;
      active = next;
      if (reducedMotion) { render(); return; }
      track.classList.add('is-swapping');
      setTimeout(() => {
        render();
        void track.offsetWidth; // force layout so the new content's "hidden" state paints first
        track.classList.remove('is-swapping');
      }, 320);
    }

    if (slotPrev) slotPrev.addEventListener('click', () => { goTo(active - 1); restart(); });
    if (slotNext) slotNext.addEventListener('click', () => { goTo(active + 1); restart(); });
    const prevBtn = $('.story-deck__prev-btn', root), nextBtn = $('.story-deck__next-btn', root);
    if (prevBtn) prevBtn.addEventListener('click', () => { goTo(active - 1); restart(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { goTo(active + 1); restart(); });

    function stepNext() { goTo(active + 1); }
    function start() {
      if (reducedMotion || n < 2) return;
      stop();
      timer = setInterval(stepNext, 5500);
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function restart() { stop(); start(); }

    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', start);

    render();
    start();
  }

  /* ---------- Custom multi-select (Services) ---------- */
  function initMultiselect() {
    $$('[data-multiselect]').forEach((root) => {
      const toggle = $('.multiselect__toggle', root);
      const chips = $('[data-chips]', root);
      const boxes = $$('input[type="checkbox"]', root);
      const all = $('[data-select-all]', root);
      const others = boxes.filter((b) => b !== all);

      const render = () => {
        const picked = others.filter((b) => b.checked);
        if (all && all.checked) {
          chips.innerHTML = '<span class="chip chip--all">Complete support — all services</span>';
        } else if (picked.length) {
          chips.innerHTML = picked.map((b) => '<span class="chip">' + b.value + '</span>').join('');
        } else {
          chips.innerHTML = '<span class="multiselect__placeholder">Select one or more services</span>';
        }
      };
      const open = () => { root.classList.add('is-open'); toggle.setAttribute('aria-expanded', 'true'); };
      const close = () => { root.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); };

      toggle.addEventListener('click', () => (root.classList.contains('is-open') ? close() : open()));
      root.addEventListener('keydown', (e) => { if (e.key === 'Escape') { close(); toggle.focus(); } });
      document.addEventListener('click', (e) => { if (!root.contains(e.target)) close(); });

      boxes.forEach((b) => b.addEventListener('change', () => {
        if (b === all) {
          others.forEach((o) => { o.checked = all.checked; });          // "Complete support" selects everything
        } else if (all) {
          if (!b.checked) all.checked = false;                          // unchecking any one unchecks "Complete support"
          else if (others.every((o) => o.checked)) all.checked = true;
        }
        render();
      }));
      render();
    });
  }

  /* ---------- Forms: validation + inline success ---------- */
  const validators = {
    mobile: (v) => /^[6-9]\d{9}$/.test(v.replace(/[\s-]/g, '').replace(/^(\+91|91|0)/, '')),
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v),
    pincode: (v) => /^[1-9]\d{5}$/.test(v)
  };
  const messages = {
    required: 'This field is required.',
    mobile: 'Enter a valid 10-digit Indian mobile number.',
    email: 'Enter a valid email address.',
    pincode: 'Enter a valid 6-digit pincode.',
    fileType: 'Upload a PDF, DOC or DOCX file.',
    fileSize: 'File must be 5 MB or smaller.'
  };

  function setError(field, msg) {
    const err = $('.field__error', field);
    field.classList.toggle('is-invalid', Boolean(msg));
    if (err) err.textContent = msg || '';
    const input = $('input, select, textarea', field);
    if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  function validateField(field) {
    const input = $('input:not([type="checkbox"]), select, textarea', field);
    if (!input) return true;
    const required = input.hasAttribute('required');
    const type = input.dataset.type || (input.type === 'email' ? 'email' : '');
    if (input.type === 'file') {
      const f = input.files && input.files[0];
      if (required && !f) { setError(field, messages.required); return false; }
      if (f) {
        if (!/\.(pdf|docx?)$/i.test(f.name)) { setError(field, messages.fileType); return false; }
        const max = parseFloat(input.dataset.maxMb || '5');
        if (f.size > max * 1024 * 1024) { setError(field, messages.fileSize); return false; }
      }
      setError(field, ''); return true;
    }
    const v = (input.value || '').trim();
    if (required && !v) { setError(field, messages.required); return false; }
    if (v && type && validators[type] && !validators[type](v)) { setError(field, messages[type]); return false; }
    setError(field, ''); return true;
  }

  function initForms() {
    $$('form[data-validate]').forEach((form) => {
      form.setAttribute('novalidate', '');
      const fields = $$('.field', form);
      fields.forEach((f) => {
        const input = $('input, select, textarea', f);
        if (!input) return;
        input.addEventListener('blur', () => validateField(f));
        input.addEventListener('input', () => { if (f.classList.contains('is-invalid')) validateField(f); });
        input.addEventListener('change', () => validateField(f));
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        let ok = true, firstBad = null;
        fields.forEach((f) => { if (!validateField(f)) { ok = false; firstBad = firstBad || f; } });
        if (!ok) { const i = $('input, select, textarea, button', firstBad); if (i) i.focus(); return; }
        const body = $('[data-form-body]', form) || form;
        const success = $('.form-success', form);
        if (success) { if (body !== form) body.hidden = true; success.hidden = false; success.focus && success.setAttribute('tabindex', '-1'); success.focus(); }
        form.dispatchEvent(new CustomEvent('bz:submitted', { bubbles: true }));
      });
    });

    // File inputs: show the chosen filename
    $$('[data-file]').forEach((input) => {
      const name = $('[data-file-name]', input.closest('.field'));
      input.addEventListener('change', () => { if (name) name.textContent = input.files[0] ? input.files[0].name : 'No file chosen'; });
    });

    // Enquiry form: pre-select Area of Interest from ?interest=
    const enquiry = $('#enquiry');
    if (enquiry) {
      const interest = new URLSearchParams(location.search).get('interest');
      const select = $('select[name="interest"]', enquiry);
      if (interest && select) {
        const opt = Array.from(select.options).find((o) => o.value.toLowerCase() === interest.trim().toLowerCase());
        if (opt) select.value = opt.value;
      }
    }
  }

  /* ---------- Modals ---------- */
  const modalState = { open: null, trigger: null };

  function openModal(id, trigger) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modalState.open = modal; modalState.trigger = trigger || document.activeElement;
    modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    const first = $('[data-autofocus]', modal) || $$(FOCUSABLE, modal).filter((n) => !n.classList.contains('modal__close'))[0] || $('.modal__close', modal);
    if (first) setTimeout(() => first.focus(), 30);
  }

  function closeModal() {
    const modal = modalState.open;
    if (!modal) return;
    modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    const frame = $('iframe', modal);
    if (frame) frame.removeAttribute('src');                      // stop video playback
    if (modalState.trigger && modalState.trigger.focus) modalState.trigger.focus();
    modalState.open = null; modalState.trigger = null;
  }

  function initModals() {
    document.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-modal-open]');
      if (opener) { e.preventDefault(); openModal(opener.dataset.modalOpen, opener); return; }
      if (e.target.closest('[data-modal-close]') || e.target.classList.contains('modal__backdrop')) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (!modalState.open) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'Tab') trapFocus(e, $('.modal__dialog', modalState.open));
    });
  }

  /* ---------- Video grid → modal player ---------- */
  function initVideos() {
    const modal = $('#video-modal');
    if (!modal) return;
    const frame = $('iframe', modal), title = $('[data-video-title]', modal), desc = $('[data-video-desc]', modal);
    $$('[data-video]').forEach((card) => {
      card.addEventListener('click', () => {
        frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(card.dataset.video) + '?autoplay=1&rel=0';
        title.textContent = card.dataset.videoTitle || '';
        desc.textContent = card.dataset.videoDesc || '';
        openModal('video-modal', card);
      });
    });
  }

  /* ---------- Filter tabs ---------- */
  function initFilters() {
    $$('[data-filter-group]').forEach((group) => {
      const tabs = $$('.filter-tab', group);
      const target = document.getElementById(group.dataset.filterGroup);
      if (!target) return;
      const items = $$('[data-category]', target);
      const empty = $('.filter-empty', target.parentElement);
      const matches = (it, key) => key === 'all' || it.dataset.category.split(/\s+/).includes(key);
      const apply = (key) => {
        let shown = 0;
        items.forEach((it) => {
          const match = matches(it, key);
          it.classList.toggle('is-hidden', !match); if (match) shown++;
        });
        if (empty) empty.hidden = shown > 0;
      };

      // Premium variant (Community page): sliding indicator and fade/slide swap.
      const pro = group.classList.contains('filter-tabs--pro');
      const indicator = pro ? $('.filter-tabs__indicator', group) : null;
      const moveIndicator = () => {
        const active = $('.filter-tab.is-active', group);
        if (!indicator || !active) return;
        // Sub-pixel rects (offset* values round) measured from the group's padding box.
        const g = group.getBoundingClientRect();
        const r = active.getBoundingClientRect();
        const x = r.left - g.left - group.clientLeft + group.scrollLeft;
        const y = r.top - g.top - group.clientTop;
        indicator.style.width = r.width + 'px';
        indicator.style.height = r.height + 'px';
        indicator.style.transform = `translate(${x}px, ${y}px)`;
      };
      if (pro) {
        moveIndicator();
        requestAnimationFrame(() => group.classList.add('is-ready')); // enable the slide only after first placement
        window.addEventListener('resize', moveIndicator, { passive: true });
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveIndicator);
      }

      let swapTimer;
      tabs.forEach((tab) => tab.addEventListener('click', () => {
        if (pro && tab.classList.contains('is-active')) return;
        tabs.forEach((t) => { t.classList.toggle('is-active', t === tab); t.setAttribute('aria-pressed', String(t === tab)); });
        const key = tab.dataset.filter;
        if (!pro) { apply(key); return; }

        moveIndicator();
        // Keep the chosen tab in view when the bar is scrolling horizontally (phones).
        if (group.scrollWidth > group.clientWidth) {
          group.scrollTo({ left: tab.offsetLeft - (group.clientWidth - tab.offsetWidth) / 2, behavior: reducedMotion ? 'auto' : 'smooth' });
        }
        if (reducedMotion) { apply(key); return; }

        // Quick fade-out of the current set, then swap and stagger the new set in.
        clearTimeout(swapTimer);
        target.classList.add('is-leaving');
        swapTimer = setTimeout(() => {
          apply(key);
          target.classList.remove('is-leaving');
          let i = 0;
          items.forEach((it) => {
            it.classList.remove('is-entering');
            if (it.classList.contains('is-hidden')) return;
            it.classList.add('is-visible'); // swapped-in cards should not wait on the scroll reveal
            it.style.setProperty('--i', i++);
            void it.offsetWidth; // restart the animation
            it.classList.add('is-entering');
          });
        }, 200);
      }));
      items.forEach((it) => it.addEventListener('animationend', () => it.classList.remove('is-entering')));
    });
  }

  /* ---------- Event detail: registration state ---------- */
  function initEventState() {
    const body = document.body;
    if (!body.hasAttribute('data-status')) return;
    // Optional override for previewing states: ?state=upcoming-register | upcoming-info | completed
    const state = new URLSearchParams(location.search).get('state');
    if (state === 'upcoming-register') { body.dataset.status = 'upcoming'; body.dataset.registration = 'required'; }
    if (state === 'upcoming-info') { body.dataset.status = 'upcoming'; body.dataset.registration = 'none'; }
    if (state === 'completed') { body.dataset.status = 'completed'; body.dataset.registration = 'none'; }
    const show = body.dataset.status === 'upcoming' && body.dataset.registration === 'required';
    $$('[data-register-cta]').forEach((el) => { el.hidden = !show; });
    body.classList.toggle('has-mobile-bar', show && Boolean($('.mobile-bar')));
    const badge = $('[data-status-badge]');
    if (badge) badge.textContent = body.dataset.status === 'completed' ? 'Completed' : 'Upcoming';
  }


  /* ---------- Learning Hub (Advanced): video rail prev / next ---------- */
  function initRails() {
    $$('[data-rail]').forEach((rail) => {
      const wrap = rail.closest('section');
      const by = (dir) => { const item = $('li', rail); const w = item ? item.getBoundingClientRect().width + 20 : 320; rail.scrollBy({ left: dir * w, behavior: reducedMotion ? 'auto' : 'smooth' }); };
      // The rail lives in a panel that may start hidden, so measure the gutter once it is visible
      const pad = () => { if (!rail.offsetParent) return; rail.style.scrollPaddingInline = getComputedStyle(rail).paddingLeft; rail.scrollLeft = 0; };
      pad(); window.addEventListener('resize', pad);
      document.addEventListener('click', (e) => { if (e.target.closest('[data-hub], [data-hub-go]')) setTimeout(pad, 30); });
      const prev = $('[data-rail-prev]', wrap), next = $('[data-rail-next]', wrap);
      if (prev) prev.addEventListener('click', () => by(-1));
      if (next) next.addEventListener('click', () => by(1));
    });
  }

  /* ---------- Women Entrepreneurship staircase: label row = tallest label (keeps text off the steps) ---------- */
  function initStairLabels() {
    const list = $('.women-steps');
    if (!list) return;
    const measure = () => {
      let max = 0;
      $$('li', list).forEach((li) => {
        const t = [...li.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
        if (!t) return;
        const r = document.createRange(); r.selectNodeContents(t);
        max = Math.max(max, r.getBoundingClientRect().height);
      });
      if (max) list.style.setProperty('--ws-label', Math.ceil(max + 6) + 'px');
    };
    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(measure, 120); });
  }

  /* ---------- Learning Hub (Basic): the article row in focus while scrolling expands ---------- */
  function initRowFocus() {
    const list = $('.lh-journal__list');
    if (!list) return;
    const rows = () => $$('.lh-row', list).filter((r) => !r.classList.contains('is-hidden'));
    let current = null, ticking = false;
    const set = (row) => {
      if (row === current) return;
      const apply = () => { $$('.lh-row', list).forEach((r) => r.classList.toggle('is-expanded', r === row)); current = row; };
      apply();
    };
    const pick = () => {
      ticking = false;
      const vis = rows(); if (!vis.length) return;
      // Inside the scrolling tile (desktop) measure against the tile; otherwise against the window
      const inner = list.scrollHeight > list.clientHeight + 2 && getComputedStyle(list).overflowY !== 'visible';
      const box = list.getBoundingClientRect();
      const line = inner ? box.top + Math.min(140, box.height * .3) : window.innerHeight * .42;
      let chosen = vis[0];
      vis.forEach((r) => { if (r.getBoundingClientRect().top <= line) chosen = r; });
      if (inner && list.scrollTop + list.clientHeight >= list.scrollHeight - 4) chosen = vis[vis.length - 1];   // reached the end of the tile
      set(chosen);
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(pick); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    list.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    // Re-evaluate after a category filter
    $$('[data-filter-group="post-grid"] .filter-tab').forEach((b) => b.addEventListener('click', () => { current = null; list.scrollTop = 0; setTimeout(pick, 30); }));
    pick();
  }

  /* ---------- Learning Hub (Advanced): 3D cover-flow of videos ---------- */
  function initFlow() {
    $$('[data-flow]').forEach((flow) => {
      const sec = flow.closest('section');
      const items = $$('[data-flow-item]', flow), dots = $$('[data-flow-go]', sec), info = $('.lx-flow__info', sec);
      const t = $('[data-flow-title]', sec), d = $('[data-flow-desc]', sec), num = $('[data-flow-num]', sec), dur = $('[data-flow-dur]', sec);
      const n = items.length, MS = 5500;
      let cur = 0, timer = 0, paused = false;
      const render = () => {
        items.forEach((it, i) => {
          let o = i - cur; if (o > n / 2) o -= n; if (o < -n / 2) o += n;
          it.style.setProperty('--o', o); it.style.setProperty('--a', Math.abs(o));
          it.classList.toggle('is-on', o === 0);
          if (Math.abs(o) > 2) it.setAttribute('data-far', ''); else it.removeAttribute('data-far');
          $('.lx-flow__card', it).tabIndex = o === 0 ? 0 : -1;
        });
        dots.forEach((b, i) => b.classList.toggle('is-on', i === cur));
        const c = $('.lx-flow__card', items[cur]);
        t.textContent = c.dataset.videoTitle; d.textContent = c.dataset.videoDesc; dur.textContent = c.dataset.dur; num.textContent = String(cur + 1).padStart(2, '0');
        info.classList.remove('is-swap'); void info.offsetWidth; info.classList.add('is-swap');
      };
      const go = (i) => { cur = (i + n) % n; render(); schedule(); };
      const schedule = () => { clearTimeout(timer); if (!reducedMotion && !paused && flow.offsetParent) timer = setTimeout(() => go(cur + 1), MS); };
      // A side card brings itself to the centre instead of playing
      items.forEach((it, i) => $('.lx-flow__card', it).addEventListener('click', (e) => { if (i !== cur) { e.stopImmediatePropagation(); go(i); } }, true));
      dots.forEach((b) => b.addEventListener('click', () => go(+b.dataset.flowGo)));
      $('[data-flow-prev]', flow).addEventListener('click', () => go(cur - 1));
      $('[data-flow-next]', flow).addEventListener('click', () => go(cur + 1));
      flow.addEventListener('mouseenter', () => { paused = true; clearTimeout(timer); });
      flow.addEventListener('mouseleave', () => { paused = false; schedule(); });
      let sx = null;
      flow.addEventListener('pointerdown', (e) => { sx = e.clientX; });
      flow.addEventListener('pointerup', (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 40) go(cur + (e.clientX < sx ? 1 : -1)); sx = null; });
      document.addEventListener('click', (e) => { if (e.target.closest('[data-hub], [data-hub-go]')) setTimeout(() => go(0), 30); });
      render();
    });
  }

  /* ---------- Learning Hub (Advanced): video stage + article preview ---------- */
  function initStage() {
    $$('[data-stage]').forEach((stage) => {
      const screen = $('.lx-stage__screen', stage), imgs = $$('.lx-stage__img', stage), items = $$('[data-stage-item]', stage);
      const cap = $('.lx-stage__cap', stage), num = $('[data-stage-num]', stage), title = $('[data-stage-title]', stage), desc = $('[data-stage-desc]', stage), dur = $('[data-stage-dur]', stage);
      const MS = 6000; stage.style.setProperty('--stage-ms', MS + 'ms');
      let cur = 0, timer = 0;
      const show = (i) => {
        cur = (i + items.length) % items.length; const it = items[cur];
        imgs.forEach((im, k) => im.classList.toggle('is-on', k === cur));
        items.forEach((b, k) => b.classList.toggle('is-on', k === cur));
        Object.assign(screen.dataset, { video: it.dataset.v, videoTitle: it.dataset.t, videoDesc: it.dataset.d });
        screen.setAttribute('aria-label', 'Play: ' + it.dataset.t);
        num.textContent = String(cur + 1).padStart(2, '0'); title.textContent = it.dataset.t; desc.textContent = it.dataset.d; dur.textContent = it.dataset.dur;
        cap.classList.remove('is-swap'); void cap.offsetWidth; cap.classList.add('is-swap');
        schedule();
      };
      const schedule = () => { clearTimeout(timer); if (!reducedMotion && !stage.classList.contains('is-paused') && stage.offsetParent) timer = setTimeout(() => show(cur + 1), MS); };
      items.forEach((b, k) => b.addEventListener('click', () => show(k)));
      stage.addEventListener('mouseenter', () => { stage.classList.add('is-paused'); clearTimeout(timer); });
      stage.addEventListener('mouseleave', () => { stage.classList.remove('is-paused'); schedule(); });
      document.addEventListener('click', (e) => { if (e.target.closest('[data-hub], [data-hub-go]')) setTimeout(() => show(0), 30); });
    });
    // Article index: a photo preview follows the cursor over each row
    $$('.lx-index').forEach((list) => {
      const peek = $('.lx-peek', list), img = peek && $('img', peek);
      if (!peek || !window.matchMedia('(hover: hover)').matches) return;
      $$('.lx-entry', list).forEach((row) => {
        row.addEventListener('mouseenter', () => { img.src = row.dataset.peek; list.classList.add('is-peeking'); });
        row.addEventListener('mouseleave', () => list.classList.remove('is-peeking'));
      });
      list.addEventListener('mousemove', (e) => { const r = list.getBoundingClientRect(); peek.style.left = (e.clientX - r.left + 170) + 'px'; peek.style.top = (e.clientY - r.top) + 'px'; });
    });
  }

  /* ---------- Learning Hub (Advanced): cursor glow on cards + 3D tilt on video cards ---------- */
  function initLxFx() {
    if (reducedMotion || !window.matchMedia('(hover: hover)').matches) return;
    $$('.lx-vid, .lx-tile').forEach((el) => {
      const tilt = el.classList.contains('lx-vid');
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        el.style.setProperty('--mx', x + 'px'); el.style.setProperty('--my', y + 'px');
        if (tilt) { el.style.setProperty('--ry', ((x / r.width - .5) * 10).toFixed(2) + 'deg'); el.style.setProperty('--rx', ((.5 - y / r.height) * 8).toFixed(2) + 'deg'); }
      });
      el.addEventListener('pointerleave', () => { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); });
    });
  }

  /* ---------- Business Mentoring: arrows travel round the "What We Offer" loop ---------- */
  function initMentorLoop() {
    const cycle = $('.mt-cycle');
    if (!cycle || reducedMotion) return;
    const list = $('.mt-cycle__list', cycle);
    const arrows = $$('.mt-cycle__turn', cycle);
    const icons = $$('.ix-ico', list);
    const NS = 'http://www.w3.org/2000/svg';
    const mq = window.matchMedia('(min-width: 992px)');
    let svg, track, trails = [], len = 0, nodes, raf = 0, visible = false, start = 0, introDone = false, drawPath, head;
    const LAP = 16000;
    const until = new Map();
    // Phones / tablets (no travelling arrows): play each icon's animation as it scrolls into view
    const playIO = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting || mq.matches) return;
      const ic = e.target; ic.classList.add('is-lit'); setTimeout(() => ic.classList.remove('is-lit'), 1900);
    }), { threshold: .8 });
    icons.forEach((ic) => playIO.observe(ic));

    const build = () => {
      if (svg) svg.remove();
      cycle.classList.remove('is-flowing');
      arrows.forEach((a) => { a.style.transform = ''; });
      icons.forEach((i) => i.classList.remove('is-lit'));
      if (!mq.matches) return;
      const cs = getComputedStyle(cycle);
      const row = parseFloat(cs.getPropertyValue('--row')), node = parseFloat(cs.getPropertyValue('--node'));
      const inset = row - node / 2;
      const x = list.offsetLeft, y = list.offsetTop + inset, w = list.offsetWidth, h = list.offsetHeight - 2 * inset, r = h / 2;
      svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'mt-cycle__trail');
      svg.setAttribute('aria-hidden', 'true');
      const d = `M${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} H${x + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;
      track = document.createElementNS(NS, 'path'); track.setAttribute('d', d);
      track.setAttribute('stroke', 'none'); svg.appendChild(track);
      cycle.insertBefore(svg, cycle.firstChild);
      len = track.getTotalLength();
      const colors = ['#1A9A8C', '#07579A'];
      trails = arrows.map((_, i) => {
        const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d);
        p.setAttribute('class', 'mt-cycle__seg'); p.setAttribute('stroke', colors[i % 2]); p.setAttribute('stroke-opacity', '.55');
        p.setAttribute('stroke-dasharray', `${len * .14} ${len}`);
        svg.appendChild(p); return p;
      });
      // Intro: a glowing line draws itself round the loop; each step flips in as the line reaches it
      drawPath = document.createElementNS(NS, 'path'); drawPath.setAttribute('d', d);
      drawPath.setAttribute('class', 'mt-cycle__draw');
      drawPath.setAttribute('stroke-dasharray', `${len} ${len}`);
      drawPath.setAttribute('stroke-dashoffset', introDone ? '0' : String(len));
      svg.insertBefore(drawPath, svg.children[1]);
      head = document.createElementNS(NS, 'circle'); head.setAttribute('r', '7'); head.setAttribute('class', 'mt-cycle__head-dot');
      svg.appendChild(head);
      cycle.classList.add('is-flowing');
      if (!introDone) cycle.classList.add('is-pre');
      if (visible) introDone ? loop() : intro();
    };

    const posOnTrack = (el) => {
      const box = cycle.getBoundingClientRect(), b = el.getBoundingClientRect();
      const cx = b.left - box.left + b.width / 2, cy = b.top - box.top + b.height / 2;
      let best = 0, bd = Infinity;
      for (let i = 0; i <= 240; i++) { const l = len * i / 240, pt = track.getPointAtLength(l), dd = Math.hypot(pt.x - cx, pt.y - cy); if (dd < bd) { bd = dd; best = l; } }
      return best;
    };
    let introRunning = false;
    const intro = () => {
      if (introRunning || introDone) return;
      introRunning = true;
      const lis = $$('li', list);
      const marks = lis.map((li, i) => { const at = posOnTrack($('.ix-ico', li)); return { li, ic: $('.ix-ico', li), at: i === 0 && at > len * .7 ? 0 : at }; });
      const DUR = 3200, t0 = performance.now();
      const ease = (k) => 1 - Math.pow(1 - k, 2.2);
      const step = (t) => {
        const k = Math.min(1, (t - t0) / DUR), at = ease(k) * len;
        drawPath.setAttribute('stroke-dashoffset', String(len - at));
        const pt = track.getPointAtLength(Math.min(at, len - .01));
        head.setAttribute('cx', pt.x); head.setAttribute('cy', pt.y);
        marks.forEach((m) => {
          if (!m.li.classList.contains('is-on') && at >= m.at - 30) {
            m.li.classList.add('is-on'); m.ic.classList.add('is-lit'); until.set(m.ic, t + 1900);
            setTimeout(() => { if (!introDone) m.ic.classList.remove('is-lit'); }, 1900);
          }
        });
        if (k < 1) { raf = requestAnimationFrame(step); return; }
        introDone = true; introRunning = false;
        cycle.classList.remove('is-pre'); cycle.classList.add('is-drawn');
        start = performance.now(); loop();
      };
      raf = requestAnimationFrame(step);
    };

    const frame = (t) => {
      const base = ((t - start) % LAP) / LAP;
      const lit = new Set();
      const box = cycle.getBoundingClientRect();
      nodes = icons.map((ic) => { const b = ic.getBoundingClientRect(); return { el: ic, x: b.left - box.left + b.width / 2, y: b.top - box.top + b.height / 2 }; });
      arrows.forEach((a, i) => {
        const at = ((base + i / arrows.length) % 1) * len;
        const p = track.getPointAtLength(at), q = track.getPointAtLength((at + 1) % len);
        const ang = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
        a.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${ang - 90}deg)`;
        trails[i].setAttribute('stroke-dashoffset', String(-(at - len * .14)));
        nodes.forEach((n) => { if (Math.hypot(n.x - p.x, n.y - p.y) < 70) lit.add(n.el); });
      });
      icons.forEach((ic) => { if (lit.has(ic) && !(until.get(ic) > t)) until.set(ic, t + 1900); ic.classList.toggle('is-lit', until.get(ic) > t); });
    };
    const loop = () => { cancelAnimationFrame(raf); const tick = (t) => { frame(t); raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); };

    new IntersectionObserver((es) => {
      visible = es[0].isIntersecting;
      if (visible && svg && mq.matches) { introDone ? loop() : intro(); } else if (introDone) cancelAnimationFrame(raf);
    }, { threshold: .35 }).observe(cycle);
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (!introRunning) build(); }, 150); });
    if (document.readyState === 'complete') build(); else window.addEventListener('load', build);
  }

  /* ---------- Success Stories: expanding gallery — the last hovered/focused panel stays open ---------- */
  function initStoryPanes() {
    $$('.ss-acc').forEach((acc) => {
      const panes = $$('.ss-pane', acc);
      const open = (p) => panes.forEach((x) => x.classList.toggle('is-open', x === p));
      panes.forEach((p) => { p.addEventListener('mouseenter', () => open(p)); p.addEventListener('focusin', () => open(p)); p.addEventListener('click', () => open(p)); });
    });
  }

  /* ---------- Learning Hub: Free / Premium toggle (premium = Coming Soon) ---------- */
  function initHubToggle() {
    const toggle = $('[data-hub-toggle]');
    if (!toggle) return;
    const btns = $$('.hub-toggle__btn', toggle);
    const panels = $$('[data-hub-panel]');
    const show = (key) => {
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.hub === key)));
      panels.forEach((p) => { p.hidden = p.dataset.hubPanel !== key; });
    };
    btns.forEach((b) => b.addEventListener('click', () => show(b.dataset.hub)));
    $$('[data-hub-go]').forEach((b) => b.addEventListener('click', () => { show(b.dataset.hubGo); toggle.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' }); }));
  }

  /* ---------- Sign-up: Entrepreneur / Business Associate tab switch ---------- */
  function initTabs() {
    $$('[data-tabs]').forEach((tabs) => {
      const btns = $$('[role="tab"]', tabs);
      btns.forEach((btn) => btn.addEventListener('click', () => {
        btns.forEach((b) => {
          const on = b === btn;
          b.setAttribute('aria-selected', String(on));
          const panel = document.getElementById(b.getAttribute('aria-controls'));
          if (panel) panel.hidden = !on;
        });
      }));
    });
  }

  /* ---------- Services marquee: manual prev/next ----------
     The marquee auto-scrolls via CSS animation (see .marquee__track). The first click on either
     arrow switches it to a plain scrollable track (adds .is-manual, which stops the animation)
     so native scrollLeft can take over; every click after that just pages by one tile width. */
  function initServiceMarqueeNav() {
    const marquee = $('.service-marquee');
    const track = marquee && $('.marquee__track', marquee);
    const prevBtn = $('[data-marquee-prev]');
    const nextBtn = $('[data-marquee-next]');
    if (!marquee || !track || !prevBtn || !nextBtn) return;

    const pageBy = (dir) => {
      marquee.classList.add('is-manual');
      const tile = $('.service-tile', track);
      const step = tile ? tile.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || 0) : marquee.clientWidth * 0.8;
      marquee.scrollBy({ left: dir * step, behavior: reducedMotion ? 'auto' : 'smooth' });
    };
    prevBtn.addEventListener('click', () => pageBy(-1));
    nextBtn.addEventListener('click', () => pageBy(1));
  }

  /* ---------- Hero background slider ----------
     With one slide (today) this does nothing — nav controls only get built once there's
     something to switch to, so a single photo never shows a dead arrow or a lone dot. Add a
     second `.hero__bg-slide` div in index.html (own background-image, no `is-active`) and this
     wires itself up on the next load: dots, arrows, autoplay, all from the slide count alone. */
  function initHeroSlider() {
    const bg = $('.hero__bg');
    const slides = bg ? $$('.hero__bg-slide', bg) : [];
    if (slides.length < 2) return;

    let active = Math.max(0, slides.findIndex((s) => s.classList.contains('is-active')));
    slides.forEach((s, i) => s.classList.toggle('is-active', i === active));

    // One cluster — prev, dots, next, all inline — so the DOM matches the visual left-to-right
    // layout. See the CSS comment on .hero__bg-nav for why it's anchored bottom-right.
    const nav = document.createElement('div');
    nav.className = 'hero__bg-nav';

    const arrow = (dir, label) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hero__bg-arrow';
      btn.setAttribute('aria-label', label);
      btn.innerHTML = dir < 0
        ? '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m15 18-6-6 6-6"/></svg>'
        : '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 18 6-6-6-6"/></svg>';
      btn.addEventListener('click', () => { go(active + dir); restart(); });
      return btn;
    };
    nav.appendChild(arrow(-1, 'Previous background image'));
    const dots = slides.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'hero__bg-dot' + (i === active ? ' is-active' : '');
      dot.setAttribute('aria-label', `Show background image ${i + 1} of ${slides.length}`);
      dot.addEventListener('click', () => { go(i); restart(); });
      nav.appendChild(dot);
      return dot;
    });
    nav.appendChild(arrow(1, 'Next background image'));
    bg.appendChild(nav);

    function go(i) {
      slides[active].classList.remove('is-active');
      dots[active].classList.remove('is-active');
      active = (i + slides.length) % slides.length;
      slides[active].classList.add('is-active');
      dots[active].classList.add('is-active');
    }

    let timer;
    function restart() {
      clearInterval(timer);
      if (reducedMotion) return;
      timer = setInterval(() => go(active + 1), 6000);
    }
    restart();
    bg.addEventListener('mouseenter', () => clearInterval(timer));
    bg.addEventListener('mouseleave', restart);
  }

  /* ---------- Section watermarks: curated logo mark, optional parallax ----------
     Opt-in per section rather than automatic, so the mark only appears where it has open space
     to sit in and adds interest — never behind forms, photo rows or dense copy.
       <section data-watermark="corner-tr" data-watermark-parallax>
     Placements (sizes / offsets live in CSS, see .section-watermark--*):
       corner-tr  large, cropped into the top-right corner
       corner-tl  large, rotated, cropped into the top-left corner
       side-l     large, vertically centred, bleeding off the left edge
       side-r     medium, vertically centred, bleeding off the right edge
     data-watermark-parallax (optional value = speed, default 0.14) makes the mark trail the page
     slightly; it is skipped for reduced motion and below 768px, where it reads as jitter. */
  function initSectionWatermarks() {
    const sections = $$('section[data-watermark]');
    if (!sections.length) return;

    // This file is shared by root pages and by services/… and opportunities/… subpages, which
    // sit one level down and need "../assets/…" instead — so the asset path is read off the
    // header's own logo image rather than hard-coded, and just has its filename swapped.
    const brand = $('.header .brand img') || $('.brand img');
    const src = brand ? brand.getAttribute('src').replace(/logo\.png$/, 'logo-mark.png') : 'assets/img/logo-mark.png';

    const moving = [];
    sections.forEach((section) => {
      if (section.querySelector(':scope > .section-watermark')) return;

      // The mark sits in its own clipping layer, so it can bleed off the edge and drift without
      // the section needing overflow:hidden (which would break sticky children).
      const layer = document.createElement('span');
      layer.className = `section-watermark section-watermark--${section.dataset.watermark || 'corner-tr'}`;
      layer.setAttribute('aria-hidden', 'true');
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.loading = 'lazy';
      img.className = 'section-watermark__img';
      layer.appendChild(img);
      section.insertBefore(layer, section.firstChild);

      // Lift the section's real content above the mark (z-index:0) without touching layout —
      // position:relative with no offset doesn't move anything, it only opens a stacking context.
      if (getComputedStyle(section).position === 'static') section.style.position = 'relative';
      Array.from(section.children).forEach((child) => {
        if (child === layer) return;
        const ccs = getComputedStyle(child);
        if (ccs.position === 'static') child.style.position = 'relative';
        if (ccs.zIndex === 'auto') child.style.zIndex = '1';
      });

      if (section.hasAttribute('data-watermark-parallax')) {
        moving.push({ layer, speed: parseFloat(section.dataset.watermarkParallax) || 0.14 });
      }
    });

    // Parallax: as a section scrolls up past the viewport centre the mark is pushed down by a
    // fraction of that distance, so it trails the content. Only on-screen layers are updated.
    if (!moving.length || reducedMotion) return;
    const wide = window.matchMedia('(min-width: 768px)');
    const visible = new Set();
    let ticking = false;
    const update = () => {
      ticking = false;
      const mid = window.innerHeight / 2;
      moving.forEach(({ layer, speed }) => {
        if (!wide.matches) { layer.style.removeProperty('--wm-shift'); return; }
        if (!visible.has(layer)) return;
        const r = layer.getBoundingClientRect();
        layer.style.setProperty('--wm-shift', ((mid - (r.top + r.height / 2)) * speed).toFixed(1) + 'px');
      });
    };
    const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => (en.isIntersecting ? visible.add(en.target) : visible.delete(en.target)));
        request();
      }, { rootMargin: '15% 0px' });
      moving.forEach(({ layer }) => io.observe(layer));
    } else {
      moving.forEach(({ layer }) => visible.add(layer));
    }
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request, { passive: true });
    request();
  }

  /* ---------- Boot ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    initHeader(); initDropdowns(); initDrawer(); initReveal(); initParallax(); initListingTimeline(); initBackToTop();
    initJourney(); initCompanyTimeline(); initVisionMission(); initCarousels(); initStoryShow(); initMultiselect();
    initForms(); initModals(); initVideos(); initFilters(); initEventState(); initHubToggle(); initStoryPanes(); initMentorLoop(); initRails(); initLxFx(); initStage(); initFlow(); initRowFocus(); initStairLabels(); initTabs(); initServiceMarqueeNav();
    initHeroSlider(); initSectionWatermarks();
    if ($('.mobile-bar') && !document.body.hasAttribute('data-status')) document.body.classList.add('has-mobile-bar');
  });
})();
