// KW site.js v1 — hamburger menu + hero slider
(function () {
  var burger = document.querySelector('.nav-burger');
  var nav = document.querySelector('.nav');
  if (burger && nav) {
    burger.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (nav.classList.contains('open') && !nav.contains(e.target)) {
        nav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }
  var slides = document.querySelectorAll('.hero-slide');
  if (slides.length > 1) {
    var idx = 0, timer = null;
    var dotsBox = document.getElementById('heroDots');
    var dots = [];
    for (var i = 0; i < slides.length; i++) {
      var d = document.createElement('button');
      d.className = 'hero-dot' + (i === 0 ? ' active' : '');
      d.setAttribute('aria-label', 'Slide ' + (i + 1));
      d.setAttribute('type', 'button');
      (function (n) { d.addEventListener('click', function () { go(n); start(); }); })(i);
      dotsBox.appendChild(d);
      dots.push(d);
    }
    function go(n) {
      slides[idx].classList.remove('active'); dots[idx].classList.remove('active');
      idx = (n + slides.length) % slides.length;
      slides[idx].classList.add('active'); dots[idx].classList.add('active');
    }
    function start() { stop(); timer = setInterval(function () { go(idx + 1); }, 6000); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    start();
    var hero = document.querySelector('.hero');
    if (hero) { hero.addEventListener('mouseenter', stop); hero.addEventListener('mouseleave', start); }
  }
})();
