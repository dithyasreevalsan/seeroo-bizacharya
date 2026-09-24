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
    const total = items.length;

    if (reducedMotion || !('IntersectionObserver' in window)) {
      items.forEach((it) => it.classList.add('is-in'));
      list.style.setProperty('--progress', '1');
      return;
    }

    let maxSeen = -1;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const item = en.target;
        item.classList.add('is-in');
        const idx = items.indexOf(item);
        if (idx > maxSeen) {
          maxSeen = idx;
          list.style.setProperty('--progress', String((idx + 1) / total));
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
      new Swiper(el, {
        slidesPerView: 'auto', centeredSlides: true, loop: true, spaceBetween: 28, grabCursor: true, speed: 700,
        autoplay: reducedMotion ? false : { delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true },
        navigation: { nextEl: $('.stories__next', wrap), prevEl: $('.stories__prev', wrap) },
        a11y: { enabled: true }, keyboard: { enabled: true },
        on: { init: update, slideChange: update }
      });
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
     Data-driven — add a story by adding an entry to STORIES; the three card slots and the
     pagination dots are all built generically from this array, nothing is hard-coded per story.
     Only the approved example stories from the project document are listed here. */
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
        '<span class="story-deck__quote-mark" aria-hidden="true">&ldquo;</span>' +
        '<span class="story-deck__avatar" role="img" aria-label="Portrait for ' + story.name + '">' + avatarSvg + '</span>' +
        '<h3>' + story.name + '</h3>' +
        (story.designation ? '<p class="story-deck__role">' + story.designation + '</p>' : '') +
        '<blockquote>' + story.testimonial + '</blockquote>' +
        '<span class="tag story-deck__tag">' + story.category + '</span>' +
        (showCta ? '<a class="story-deck__cta" href="' + story.storyLink + '">Read Full Story ' + arrowSvg + '</a>' : '')
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

    function goTo(i, dir) {
      if (n < 2) return;
      const next = ((i % n) + n) % n;
      if (next === active) return;
      const direction = dir || (next === (active + 1) % n ? 'next' : 'prev');
      active = next;
      if (reducedMotion) { render(); return; }
      track.classList.add(direction === 'next' ? 'is-going-next' : 'is-going-prev');
      setTimeout(() => {
        render();
        track.classList.remove('is-going-next', 'is-going-prev');
      }, 320);
    }

    if (slotPrev) slotPrev.addEventListener('click', () => { goTo(active - 1, 'prev'); restart(); });
    if (slotNext) slotNext.addEventListener('click', () => { goTo(active + 1, 'next'); restart(); });
    const prevBtn = $('.story-deck__prev-btn', root), nextBtn = $('.story-deck__next-btn', root);
    if (prevBtn) prevBtn.addEventListener('click', () => { goTo(active - 1, 'prev'); restart(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { goTo(active + 1, 'next'); restart(); });

    function stepNext() { goTo(active + 1, 'next'); }
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
      tabs.forEach((tab) => tab.addEventListener('click', () => {
        tabs.forEach((t) => { t.classList.toggle('is-active', t === tab); t.setAttribute('aria-pressed', String(t === tab)); });
        const key = tab.dataset.filter;
        let shown = 0;
        items.forEach((it) => {
          const match = key === 'all' || it.dataset.category.split(/\s+/).includes(key);
          it.classList.toggle('is-hidden', !match); if (match) shown++;
        });
        if (empty) empty.hidden = shown > 0;
      }));
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

  /* ---------- Boot ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    initHeader(); initDropdowns(); initDrawer(); initReveal(); initParallax(); initListingTimeline(); initBackToTop();
    initJourney(); initCompanyTimeline(); initVisionMission(); initCarousels(); initStoryShow(); initMultiselect();
    initForms(); initModals(); initVideos(); initFilters(); initEventState(); initHubToggle(); initTabs();
    if ($('.mobile-bar') && !document.body.hasAttribute('data-status')) document.body.classList.add('has-mobile-bar');
  });
})();
