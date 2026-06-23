// ===== 3D ATOM =====
(function () {
  const canvas = document.getElementById('atom-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const CW = canvas.width, CH = canvas.height;
  const cx = CW / 2, cy = CH / 2;

  const ACCENT = '224, 57, 43';
  const ACCENT_SOFT = '255, 90, 77';
  const CHEREN = '54, 194, 255';
  const CHEREN_SOFT = '122, 216, 255';

  // --- Nucleus: cluster of nucleons (protons + neutrons) ---
  const nucleons = [];
  const NUCLEON_COUNT = 16;
  for (let i = 0; i < NUCLEON_COUNT; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = Math.pow(Math.random(), 0.5) * 17;
    nucleons.push({
      ang: a, rad: rr,
      baseX: Math.cos(a) * rr, baseY: Math.sin(a) * rr,
      proton: i % 2 === 0,
      jit: Math.random() * Math.PI * 2,
      jitSpeed: 0.04 + Math.random() * 0.04,
      size: 5.5 + Math.random() * 1.5
    });
  }

  // --- Electron orbits (3D ellipses) ---
  // Each orbit defined by radius, tilt (rotation about X axis), and yaw (rotation about Y/Z)
  const orbits = [
    { rx: 200, ry: 200, tilt: 1.15, yaw: 0.0,  speed: 0.022, phase: 0,           col: CHEREN },
    { rx: 200, ry: 200, tilt: 1.15, yaw: 2.09, speed: 0.026, phase: 2.0,         col: CHEREN },
    { rx: 200, ry: 200, tilt: 1.15, yaw: 4.18, speed: 0.019, phase: 4.0,         col: ACCENT_SOFT },
    { rx: 150, ry: 150, tilt: 0.4,  yaw: 1.0,  speed: 0.030, phase: 1.0,         col: CHEREN },
  ];

  let globalRot = 0;

  // project a 3D point (already rotated) — simple perspective
  function project(x, y, z) {
    const persp = 380 / (380 + z);
    return { x: cx + x * persp, y: cy + y * persp, scale: persp, z };
  }

  // rotate point around X then Y axis
  function rotate3d(x, y, z, ax, ay) {
    // around X
    let y1 = y * Math.cos(ax) - z * Math.sin(ax);
    let z1 = y * Math.sin(ax) + z * Math.cos(ax);
    // around Y
    let x2 = x * Math.cos(ay) + z1 * Math.sin(ay);
    let z2 = -x * Math.sin(ay) + z1 * Math.cos(ay);
    return { x: x2, y: y1, z: z2 };
  }

  function orbitPoint(o, theta) {
    // ellipse in its own plane
    const ex = Math.cos(theta) * o.rx;
    const ey = Math.sin(theta) * o.ry;
    const ez = 0;
    // apply orbit tilt (about X) and yaw (about Y), plus slow global yaw
    return rotate3d(ex, ey, ez, o.tilt, o.yaw + globalRot);
  }

  function drawOrbitPath(o) {
    const steps = 80;
    // draw in two halves for depth (behind nucleus dimmer)
    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= steps; i++) {
        const th = (i / steps) * Math.PI * 2;
        const p = orbitPoint(o, th);
        const front = p.z >= 0;
        if ((pass === 0 && front) || (pass === 1 && !front)) {
          const pr = project(p.x, p.y, p.z);
          if (!started) { ctx.moveTo(pr.x, pr.y); started = true; }
          else ctx.lineTo(pr.x, pr.y);
        } else {
          started = false;
        }
      }
      ctx.strokeStyle = `rgba(${o.col}, ${pass === 0 ? 0.32 : 0.1})`;
      ctx.lineWidth = pass === 0 ? 1.4 : 1;
      ctx.stroke();
    }
  }

  function drawElectron(o, t) {
    const theta = o.phase + t * o.speed * 60;
    const p = orbitPoint(o, theta);
    const pr = project(p.x, p.y, p.z);
    const depth = (p.z + 200) / 400;              // 0 (back) .. 1 (front)
    const size = 4 + depth * 5;
    const alpha = 0.45 + depth * 0.55;

    // trail
    for (let k = 1; k <= 6; k++) {
      const tp = orbitPoint(o, theta - k * 0.10);
      const tpr = project(tp.x, tp.y, tp.z);
      ctx.beginPath();
      ctx.arc(tpr.x, tpr.y, size * (1 - k / 7), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${o.col}, ${alpha * (1 - k / 7) * 0.4})`;
      ctx.fill();
    }
    // glow head
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${o.col}, ${alpha})`;
    ctx.shadowBlur = 16 * depth + 6; ctx.shadowColor = `rgba(${o.col}, ${alpha})`;
    ctx.fill();
    ctx.shadowBlur = 0;
    // white hot center
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, size * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.9})`;
    ctx.fill();
    return p.z;
  }

  function drawNucleus(t) {
    // pulsing scale
    const pulse = 1 + Math.sin(t * 2) * 0.06;
    for (const n of nucleons) {
      n.jit += n.jitSpeed;
      const jx = Math.cos(n.jit) * 1.6;
      const jy = Math.sin(n.jit * 1.3) * 1.6;
      const x = cx + (n.baseX + jx) * pulse;
      const y = cy + (n.baseY + jy) * pulse;
      const col = n.proton ? ACCENT : ACCENT_SOFT;
      ctx.beginPath();
      ctx.arc(x, y, n.size, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(x - n.size * 0.3, y - n.size * 0.3, 0, x, y, n.size);
      g.addColorStop(0, `rgba(255,200,190,0.95)`);
      g.addColorStop(0.5, `rgba(${col}, 0.95)`);
      g.addColorStop(1, `rgba(${col}, 0.5)`);
      ctx.fillStyle = g;
      ctx.shadowBlur = 8; ctx.shadowColor = `rgba(${ACCENT}, 0.6)`;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  let start = performance.now();
  function draw(now) {
    const t = (now - start) / 1000;
    globalRot += 0.0016;
    ctx.clearRect(0, 0, CW, CH);

    // 1. back halves of orbit paths + back electrons, 2. nucleus, 3. front
    // Draw orbit paths (handles depth internally)
    for (const o of orbits) drawOrbitPath(o);

    // Collect electron z to layer around nucleus
    const back = [], front = [];
    for (const o of orbits) {
      const theta = o.phase + t * o.speed * 60;
      const p = orbitPoint(o, theta);
      (p.z < 0 ? back : front).push(o);
    }
    back.forEach(o => drawElectron(o, t));
    drawNucleus(t);
    front.forEach(o => drawElectron(o, t));

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

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
