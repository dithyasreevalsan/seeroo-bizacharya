/* Bizacharya — Phase 1 front-end behaviour (vanilla JS) */
(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  // Resolve the cursor mark relative to this script's own location, so it works from any page depth (root or subfolders).
  const CURSOR_IMG = document.currentScript ? new URL('../img/cursor-logo.png', document.currentScript.src).href : 'assets/img/cursor-logo.png';

  /* ---------- Custom cursor: small Bizacharya mark, desktop/fine-pointer only ---------- */
  function initCustomCursor() {
    if (reducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const cursor = document.createElement('div');
    cursor.className = 'cursor';
    cursor.setAttribute('aria-hidden', 'true');
    const mark = document.createElement('img');
    mark.className = 'cursor__mark';
    mark.src = CURSOR_IMG; mark.alt = ''; mark.width = 26; mark.height = 28;
    cursor.appendChild(mark);
    document.body.appendChild(cursor);
    document.documentElement.classList.add('has-custom-cursor');

    let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2, curX = mouseX, curY = mouseY, hasMoved = false;

    const onMove = (e) => {
      mouseX = e.clientX; mouseY = e.clientY;
      if (!hasMoved) { hasMoved = true; curX = mouseX; curY = mouseY; cursor.classList.add('is-visible'); }
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseout', (e) => { if (!e.relatedTarget) cursor.classList.remove('is-visible', 'is-active'); }, { passive: true });
    window.addEventListener('mousedown', () => cursor.classList.add('is-active'), { passive: true });
    window.addEventListener('mouseup', () => cursor.classList.remove('is-active'), { passive: true });

    // Bail out cleanly on the first real touch, for hybrid laptop/tablet devices that report a fine pointer.
    window.addEventListener('touchstart', () => {
      window.removeEventListener('mousemove', onMove);
      document.documentElement.classList.remove('has-custom-cursor');
      cursor.remove();
    }, { once: true, passive: true });

    document.addEventListener('mouseover', (e) => {
      cursor.classList.toggle('is-hover', Boolean(e.target.closest && e.target.closest(FOCUSABLE)));
    }, { passive: true });

    // Smoothly ease the mark toward the real pointer position each frame, rather than snapping to it.
    (function tick() {
      curX += (mouseX - curX) * 0.35;
      curY += (mouseY - curY) * 0.35;
      cursor.style.transform = 'translate3d(' + curX + 'px, ' + curY + 'px, 0) translate(-50%, -50%)';
      requestAnimationFrame(tick);
    })();
  }

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
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    nodes.forEach((n) => io.observe(n));
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

    // Number visible, then crossfades into the settled image; timings follow the brief's suggested ranges.
    const TIMING = { numberIn: 300, hold: 500, crossfade: 400, pause: 200, line: 400 };

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

    // Walk the stages 01 -> 06, one at a time: number appears, holds, crossfades into the image,
    // pauses, then the line advances to that stage's node before the next one begins.
    const runSequence = () => {
      reset();
      const token = runToken;
      let t = 80;
      stages.forEach((stage, i) => {
        timers.push(setTimeout(() => { if (runToken === token) stage.classList.add('is-in', 'is-current'); }, t));
        t += TIMING.numberIn + TIMING.hold;

        timers.push(setTimeout(() => { if (runToken === token) stage.classList.add('show-image'); }, t));
        t += TIMING.crossfade + TIMING.pause;

        timers.push(setTimeout(() => {
          if (runToken !== token) return;
          stage.classList.remove('is-current');
          if (list) list.style.setProperty('--progress', String((i + 1) / stages.length));
        }, t));
        t += TIMING.line;
      });
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) runSequence(); else reset(); });
    }, { threshold: 0.2, rootMargin: '0px 0px -60px 0px' });
    io.observe(jm);
  }

  /* ---------- Upcoming events: fade-up feature rows, staggered, run once ---------- */
  function initEvents() {
    const ev = $('[data-events]');
    if (!ev) return;
    const cards = $$('.event-feature', ev);
    if (!cards.length) return;

    if (reducedMotion || !('IntersectionObserver' in window)) {
      cards.forEach((c) => c.classList.add('is-in'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        cards.forEach((c) => c.classList.add('is-in'));
        io.unobserve(en.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    io.observe(ev);
  }

  /* ---------- Vision & Mission slide-in ---------- */
  function initVisionMission() {
    const vm = $('[data-vm]');
    if (!vm) return;
    const panels = $$('.vm__panel', vm);
    if (reducedMotion || !('IntersectionObserver' in window)) { panels.forEach((p) => p.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { panels.forEach((p) => p.classList.add('is-in')); io.disconnect(); } });
    }, { threshold: 0.3 });
    io.observe(vm);
  }

  /* ---------- Swiper carousels ---------- */
  function initCarousels() {
    if (typeof Swiper === 'undefined') return;
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
      const thumbs = thumbsEl ? new Swiper(thumbsEl, { slidesPerView: 'auto', spaceBetween: 10, watchSlidesProgress: true, freeMode: true }) : null;
      new Swiper(galleryEl, {
        slidesPerView: 1, spaceBetween: 16, loop: true, speed: 500, grabCursor: true,
        navigation: { nextEl: '.gallery__next', prevEl: '.gallery__prev' },
        thumbs: thumbs ? { swiper: thumbs } : undefined, a11y: { enabled: true }, keyboard: { enabled: true }
      });
    }
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
    initCustomCursor();
    initHeader(); initDropdowns(); initDrawer(); initReveal(); initBackToTop();
    initJourney(); initEvents(); initVisionMission(); initCarousels(); initMultiselect();
    initForms(); initModals(); initVideos(); initFilters(); initEventState(); initHubToggle(); initTabs();
    if ($('.mobile-bar') && !document.body.hasAttribute('data-status')) document.body.classList.add('has-mobile-bar');
  });
})();
