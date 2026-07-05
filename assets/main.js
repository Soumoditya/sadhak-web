/* Sadhak site — handcrafted vanilla motion (no framework, no CDN dependency) */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---- Preloader → hero reveal ---- */
  function boot() {
    document.body.classList.add('loaded');
    var pre = $('#preloader');
    if (pre) setTimeout(function () { pre.classList.add('done'); }, reduce ? 200 : 1500);
  }
  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);
  // Safety: never trap the visitor behind the loader
  setTimeout(boot, 3200);

  /* ---- Year ---- */
  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* ---- Map data-accent → --acc custom property ---- */
  $$('[data-accent]').forEach(function (el) { el.style.setProperty('--acc', el.getAttribute('data-accent')); });

  /* ---- Nav ---- */
  var nav = $('#nav');
  var onScrollNav = function () { if (nav) nav.classList.toggle('scrolled', window.scrollY > 40); };
  onScrollNav();

  var toggle = $('#navToggle'), links = $('.nav__links');
  if (toggle && links) {
    toggle.addEventListener('click', function () { links.classList.toggle('open'); });
    $$('.nav__links a').forEach(function (a) { a.addEventListener('click', function () { links.classList.remove('open'); }); });
  }

  /* ---- Scroll progress sun bar ---- */
  var fill = $('#sunfill');
  var onScrollBar = function () {
    var h = document.documentElement;
    var p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
    if (fill) fill.style.width = (p * 100).toFixed(2) + '%';
  };
  onScrollBar();

  /* ---- Reveal on scroll ---- */
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- Counters ---- */
  function countUp(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduce) { el.textContent = target; return; }
    var start = null, dur = 1400;
    function step(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    $$('.value__num').forEach(function (el) { cio.observe(el); });
  } else {
    $$('.value__num').forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
  }

  /* ---- Manifesto word lighting ---- */
  var words = $$('.manifesto__text .word');
  function litManifesto() {
    if (!words.length) return;
    var vh = window.innerHeight;
    words.forEach(function (w) {
      var r = w.getBoundingClientRect();
      if (r.top < vh * 0.72) w.classList.add('lit');
    });
  }

  /* ---- Parallax (hero layers) ---- */
  var layers = $$('[data-parallax]');
  function parallax() {
    if (reduce) return;
    var sy = window.scrollY;
    layers.forEach(function (l) {
      var f = parseFloat(l.getAttribute('data-parallax')) || 0;
      l.style.transform = 'translate3d(0,' + (sy * f).toFixed(1) + 'px,0)';
    });
  }

  /* ---- Unified rAF scroll loop ---- */
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      onScrollNav(); onScrollBar(); litManifesto(); parallax();
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { litManifesto(); });
  litManifesto();

  /* ---- Magnetic buttons ---- */
  if (!reduce && window.matchMedia('(hover:hover)').matches) {
    $$('.magnetic').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var mx = e.clientX - r.left - r.width / 2;
        var my = e.clientY - r.top - r.height / 2;
        btn.style.transform = 'translate(' + mx * 0.25 + 'px,' + my * 0.35 + 'px)';
      });
      btn.addEventListener('mouseleave', function () { btn.style.transform = ''; });
    });

    /* ---- Custom cursor ---- */
    var cur = $('#cursor');
    if (cur) {
      var cx = 0, cy = 0, tx = 0, ty = 0;
      window.addEventListener('mousemove', function (e) { tx = e.clientX; ty = e.clientY; });
      (function loop() {
        cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
        cur.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)';
        requestAnimationFrame(loop);
      })();
      $$('a,button,.fcard,.magnetic').forEach(function (el) {
        el.addEventListener('mouseenter', function () { cur.classList.add('hot'); });
        el.addEventListener('mouseleave', function () { cur.classList.remove('hot'); });
      });
    }
  }
})();
