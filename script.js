// ===== FISSION CHAIN REACTION BACKGROUND =====
(function () {
  const canvas = document.getElementById('reactor-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, nuclei, neutrons;

  const ACCENT = '224, 57, 43';
  const CHEREN = '54, 194, 255';

  function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }

  function makeNuclei() {
    const count = Math.floor((w * h) / 26000);
    nuclei = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2.5 + 2.5,
      fissile: true,
      cooldown: 0,
      drift: Math.random() * Math.PI * 2
    }));
  }

  function makeNeutron(x, y, angle, speed) {
    return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0, maxLife: 180 + Math.random() * 80 };
  }

  function init() {
    makeNuclei();
    neutrons = [];
    // seed a few neutrons
    for (let i = 0; i < 3; i++) {
      neutrons.push(makeNeutron(Math.random() * w, Math.random() * h, Math.random() * Math.PI * 2, 1.6));
    }
  }

  // spontaneous emission so the reaction never dies
  function spontaneous() {
    if (Math.random() < 0.025 && neutrons.length < 90) {
      const n = nuclei[Math.floor(Math.random() * nuclei.length)];
      if (n) neutrons.push(makeNeutron(n.x, n.y, Math.random() * Math.PI * 2, 1.4 + Math.random()));
    }
  }

  const flashes = [];

  function fission(nucleus) {
    nucleus.fissile = false;
    nucleus.cooldown = 220 + Math.random() * 160; // regenerates (control-rod moderated)
    flashes.push({ x: nucleus.x, y: nucleus.y, r: 0, max: 26, alpha: 1 });
    const emit = 2 + Math.floor(Math.random() * 2); // 2-3 neutrons
    for (let i = 0; i < emit; i++) {
      if (neutrons.length > 120) break;
      const a = Math.random() * Math.PI * 2;
      neutrons.push(makeNeutron(nucleus.x, nucleus.y, a, 1.4 + Math.random() * 1.2));
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    spontaneous();

    // nuclei
    for (const n of nuclei) {
      if (n.cooldown > 0) { n.cooldown--; if (n.cooldown <= 0) n.fissile = true; }
      n.drift += 0.005;
      const px = n.x + Math.sin(n.drift) * 0.3;
      const py = n.y + Math.cos(n.drift) * 0.3;
      ctx.beginPath();
      ctx.arc(px, py, n.r, 0, Math.PI * 2);
      if (n.fissile) {
        ctx.fillStyle = `rgba(${ACCENT}, 0.5)`;
        ctx.shadowBlur = 6; ctx.shadowColor = `rgba(${ACCENT}, 0.5)`;
      } else {
        ctx.fillStyle = `rgba(120, 130, 145, 0.18)`;
        ctx.shadowBlur = 0;
      }
      ctx.fill(); ctx.shadowBlur = 0;
    }

    // neutrons
    for (let i = neutrons.length - 1; i >= 0; i--) {
      const p = neutrons[i];
      p.x += p.vx; p.y += p.vy; p.life++;

      // wrap around edges
      if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;

      // trail
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 4, p.y - p.vy * 4);
      ctx.strokeStyle = `rgba(${CHEREN}, 0.5)`;
      ctx.lineWidth = 1.4; ctx.stroke();

      // head
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${CHEREN}, 0.95)`;
      ctx.shadowBlur = 8; ctx.shadowColor = `rgba(${CHEREN}, 0.9)`;
      ctx.fill(); ctx.shadowBlur = 0;

      // collision check
      let absorbed = false;
      for (const n of nuclei) {
        if (!n.fissile) continue;
        const dx = p.x - n.x, dy = p.y - n.y;
        if (dx * dx + dy * dy < (n.r + 4) * (n.r + 4)) {
          fission(n); absorbed = true; break;
        }
      }
      if (absorbed || p.life > p.maxLife) { neutrons.splice(i, 1); }
    }

    // fission flashes
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.r += 1.6; f.alpha -= 0.045;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${ACCENT}, ${Math.max(0, f.alpha)})`;
      ctx.lineWidth = 2; ctx.stroke();
      if (f.alpha <= 0 || f.r > f.max) flashes.splice(i, 1);
    }

    requestAnimationFrame(draw);
  }

  resize(); init(); draw();
  window.addEventListener('resize', () => { resize(); init(); });
})();

// ===== CURSOR SPOTLIGHT =====
(function () {
  const spot = document.getElementById('spotlight');
  if (!spot) return;
  window.addEventListener('mousemove', e => {
    spot.style.opacity = '1';
    spot.style.left = e.clientX + 'px';
    spot.style.top = e.clientY + 'px';
  });
  window.addEventListener('mouseout', () => spot.style.opacity = '0');
})();

// ===== SCROLL PROGRESS =====
(function () {
  const bar = document.getElementById('scroll-progress');
  window.addEventListener('scroll', () => {
    const st = document.documentElement.scrollTop;
    const sh = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    bar.style.width = (st / sh * 100) + '%';
  });
})();

// ===== TYPING EFFECT =====
const phrases = [
  "Nuclear Engineering @ Hacettepe University",
  "Reactor Physics | Thermal-Hydraulics | CFD",
  "Python | Fortran | ANSYS Fluent | Star-CCM+",
  "Computational Engineering & Simulation"
];
const typedEl = document.getElementById('typed-text');
let pi = 0, ci = 0, del = false;
function type() {
  const cur = phrases[pi];
  typedEl.textContent = del ? cur.substring(0, ci - 1) : cur.substring(0, ci + 1);
  del ? ci-- : ci++;
  let t = del ? 35 : 80;
  if (!del && ci === cur.length) { t = 1700; del = true; }
  else if (del && ci === 0) { del = false; pi = (pi + 1) % phrases.length; t = 350; }
  setTimeout(type, t);
}
document.addEventListener('DOMContentLoaded', type);

// ===== NAVBAR SCROLL =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 40));

// ===== ANIMATED STAT COUNTERS =====
(function () {
  const stats = document.querySelectorAll('.stat-num');
  const animate = (el) => {
    const target = +el.dataset.target;
    const suffix = el.dataset.suffix || '';
    let cur = 0;
    const step = Math.max(1, target / 50);
    const tick = () => {
      cur += step;
      if (cur >= target) { el.textContent = target + suffix; }
      else { el.textContent = Math.floor(cur) + suffix; requestAnimationFrame(tick); }
    };
    tick();
  };
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { animate(e.target); obs.unobserve(e.target); } });
  }, { threshold: 0.5 });
  stats.forEach(s => obs.observe(s));
})();

// ===== CARD 3D TILT + SHINE =====
(function () {
  const cards = document.querySelectorAll('.project-card[data-tilt]');
  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const rx = ((y / r.height) - 0.5) * -7;
      const ry = ((x / r.width) - 0.5) * 7;
      card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
      card.style.setProperty('--mx', x + 'px');
      card.style.setProperty('--my', y + 'px');
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(900px) rotateX(0) rotateY(0) translateY(0)';
    });
  });
})();

// ===== SCROLL REVEAL =====
(function () {
  const targets = document.querySelectorAll('.stack-card, .project-card, .project-group, .section-title');
  targets.forEach(el => el.classList.add('reveal'));
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.12 });
  targets.forEach(el => obs.observe(el));
})();
