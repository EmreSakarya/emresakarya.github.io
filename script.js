// ===== ATOM + NUCLEAR FISSION (nucleus actually splits) =====
// Electron shells keep orbiting while the nucleus runs a full fission cycle:
// calm → incoming neutron → excitation/vibration → deformation/necking →
// SCISSION (splits into two fragments that fly apart) → neutron + energy burst →
// fragments fade → a fresh nucleus reforms → calm again.
(function () {
  const canvas = document.getElementById('atom-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const CW = canvas.width, CH = canvas.height;
  const cx = CW / 2, cy = CH / 2;
  const TAU = Math.PI * 2;

  const ACCENT      = '224, 57, 43';
  const ACCENT_SOFT = '255, 90, 77';
  const CHEREN      = '54, 194, 255';
  const GAMMA       = '210, 235, 255';
  const ENERGY      = '255, 205, 110';

  // ---- Nucleus nucleons ----
  const nucleons = [];
  for (let i = 0; i < 20; i++) {
    const a = Math.random() * TAU;
    const r = Math.pow(Math.random(), 0.5) * 20;
    nucleons.push({
      bx: Math.cos(a) * r, by: Math.sin(a) * r,
      proton: i % 2 === 0,
      jit: Math.random() * TAU,
      jitSp: 0.035 + Math.random() * 0.04,
      size: 5.0 + Math.random() * 1.7,
      lobe: 1
    });
  }

  // ---- Electron orbits ----
  const orbits = [
    { rx: 195, ry: 195, tilt: 1.15, yaw: 0.0,  speed: 0.022, phase: 0,   col: CHEREN },
    { rx: 195, ry: 195, tilt: 1.15, yaw: 2.09, speed: 0.026, phase: 2.0, col: CHEREN },
    { rx: 195, ry: 195, tilt: 1.15, yaw: 4.18, speed: 0.019, phase: 4.0, col: CHEREN },
    { rx: 148, ry: 148, tilt: 0.40, yaw: 1.0,  speed: 0.030, phase: 1.0, col: CHEREN },
  ];
  let globalRot = 0;

  function project(x, y, z) {
    const s = 380 / (380 + z);
    return { x: cx + x * s, y: cy + y * s, s, z };
  }
  function rotate3d(x, y, z, ax, ay) {
    const y1 = y * Math.cos(ax) - z * Math.sin(ax);
    const z1 = y * Math.sin(ax) + z * Math.cos(ax);
    const x2 = x * Math.cos(ay) + z1 * Math.sin(ay);
    const z2 = -x * Math.sin(ay) + z1 * Math.cos(ay);
    return { x: x2, y: y1, z: z2 };
  }
  function orbitPt(o, theta) {
    return rotate3d(Math.cos(theta) * o.rx, Math.sin(theta) * o.ry, 0, o.tilt, o.yaw + globalRot);
  }

  // ---- Fission state machine ----
  const PH = { CALM: 0, INCOMING: 1, EXCITE: 2, DEFORM: 3, SPLIT: 4, REFORM: 5 };
  let phase = PH.CALM, phaseT = 0, phaseDur = 1.8;
  let splitAxis = 0, sepDist = 0, nucAlpha = 1;
  let incoming = null;
  const freeN = [], gammas = [], sparks = [];

  function assignLobes() {
    splitAxis = Math.random() * TAU;
    const ax = Math.cos(splitAxis), ay = Math.sin(splitAxis);
    nucleons.forEach(n => { n.lobe = (n.bx * ax + n.by * ay) >= 0 ? 1 : -1; });
  }

  function durFor(p) {
    if (p === PH.CALM)     return 1.6 + Math.random() * 1.6;
    if (p === PH.INCOMING) return 0.65;
    if (p === PH.EXCITE)   return 0.95;
    if (p === PH.DEFORM)   return 0.7;
    if (p === PH.SPLIT)    return 1.7;
    return 0.75; // REFORM
  }

  function enter(p) {
    phase = p; phaseT = 0; phaseDur = durFor(p);
    if (p === PH.INCOMING) {
      assignLobes();
      const a = Math.random() * TAU;
      incoming = { sx: cx + Math.cos(a) * 245, sy: cy + Math.sin(a) * 245, dir: a + Math.PI };
    } else if (p === PH.SPLIT) {
      // scission burst: prompt neutrons, gamma rings, energy sparks
      const ax = Math.cos(splitAxis), ay = Math.sin(splitAxis);
      const cnt = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < cnt; i++) {
        const side = i % 2 ? -1 : 1;
        const a = splitAxis + (side < 0 ? Math.PI : 0) + (Math.random() - 0.5) * 2.0;
        const sp = 120 + Math.random() * 70;
        freeN.push({ x: cx + ax * sepDist * side, y: cy + ay * sepDist * side,
                     vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 1.5 });
      }
      gammas.push({ r: 0, max: 240, a: 0.9, w: 3 });
      gammas.push({ r: 0, max: 150, a: 0.55, w: 1.5 });
      for (let i = 0; i < 26; i++) {
        const a = Math.random() * TAU, sp = 40 + Math.random() * 150;
        sparks.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 0.9 + Math.random() * 0.6 });
      }
    } else if (p === PH.REFORM) {
      assignLobes(); // fresh nucleus
    }
  }

  // ---- Drawing helpers ----
  function drawNeutron(x, y, vx, vy, fade) {
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x - vx * 0.055, y - vy * 0.055);
    ctx.strokeStyle = `rgba(${CHEREN},${0.5 * fade})`; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU);
    ctx.fillStyle = `rgba(${CHEREN},${fade})`;
    ctx.shadowBlur = 11; ctx.shadowColor = `rgba(${CHEREN},${fade})`;
    ctx.fill(); ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(x, y, 1.6, 0, TAU);
    ctx.fillStyle = `rgba(255,255,255,${fade})`; ctx.fill();
  }

  function drawOrbitPath(o) {
    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath(); let started = false;
      for (let i = 0; i <= 80; i++) {
        const p = orbitPt(o, (i / 80) * TAU);
        const front = p.z >= 0;
        if ((pass === 0 && front) || (pass === 1 && !front)) {
          const pr = project(p.x, p.y, p.z);
          if (!started) { ctx.moveTo(pr.x, pr.y); started = true; }
          else ctx.lineTo(pr.x, pr.y);
        } else started = false;
      }
      ctx.strokeStyle = `rgba(${o.col},${pass === 0 ? 0.30 : 0.09})`;
      ctx.lineWidth = pass === 0 ? 1.3 : 0.9; ctx.stroke();
    }
  }

  function drawElectron(o, t) {
    const theta = o.phase + t * o.speed * 60;
    const p = orbitPt(o, theta);
    const pr = project(p.x, p.y, p.z);
    const depth = (p.z + 200) / 400;
    const size = 3.8 + depth * 5;
    const alpha = 0.44 + depth * 0.56;
    for (let k = 1; k <= 6; k++) {
      const tp = orbitPt(o, theta - k * 0.10);
      const tpr = project(tp.x, tp.y, tp.z);
      ctx.beginPath(); ctx.arc(tpr.x, tpr.y, size * (1 - k / 7), 0, TAU);
      ctx.fillStyle = `rgba(${o.col},${alpha * (1 - k / 7) * 0.38})`; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(pr.x, pr.y, size, 0, TAU);
    ctx.fillStyle = `rgba(${o.col},${alpha})`;
    ctx.shadowBlur = 14 * depth + 5; ctx.shadowColor = `rgba(${o.col},${alpha})`;
    ctx.fill(); ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(pr.x, pr.y, size * 0.38, 0, TAU);
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.88})`; ctx.fill();
  }

  function drawNucleus(wobble, glowBoost) {
    if (nucAlpha <= 0.01) return;
    const ax = Math.cos(splitAxis), ay = Math.sin(splitAxis);
    // necking bridge between the two lobes while deforming
    if (sepDist > 1 && sepDist < 48 && phase === PH.DEFORM) {
      const f = 1 - sepDist / 48;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(splitAxis);
      ctx.beginPath(); ctx.ellipse(0, 0, sepDist + 16, 14 * f + 5, 0, 0, TAU);
      ctx.fillStyle = `rgba(255,180,120,${0.32 * f * nucAlpha})`;
      ctx.shadowBlur = 24; ctx.shadowColor = `rgba(255,170,90,${0.5 * f})`;
      ctx.fill(); ctx.shadowBlur = 0; ctx.restore();
    }
    const w = 1.4 + wobble * 4.8;
    for (const n of nucleons) {
      n.jit += n.jitSp;
      const jx = Math.cos(n.jit) * w;
      const jy = Math.sin(n.jit * 1.3) * w;
      const x = cx + n.bx + n.lobe * ax * sepDist + jx;
      const y = cy + n.by + n.lobe * ay * sepDist + jy;
      const col = n.proton ? ACCENT : ACCENT_SOFT;
      ctx.beginPath(); ctx.arc(x, y, n.size, 0, TAU);
      const g = ctx.createRadialGradient(x - n.size * 0.3, y - n.size * 0.3, 0, x, y, n.size);
      g.addColorStop(0, wobble > 0.3 ? `rgba(255,242,205,${0.95 * nucAlpha})` : `rgba(255,205,195,${0.95 * nucAlpha})`);
      g.addColorStop(0.5, `rgba(${col},${0.95 * nucAlpha})`);
      g.addColorStop(1, `rgba(${col},${0.45 * nucAlpha})`);
      ctx.fillStyle = g;
      ctx.shadowBlur = 7 + glowBoost; ctx.shadowColor = `rgba(${ACCENT},${(0.5 + wobble * 0.4) * nucAlpha})`;
      ctx.fill(); ctx.shadowBlur = 0;
    }
  }

  // ---- Main loop ----
  let start = performance.now(), last = start;
  function draw(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    const t  = (now - start) / 1000;
    last = now;
    globalRot += 0.0015;
    phaseT += dt;

    // phase-dependent nucleus parameters
    let wobble = 0, glowBoost = 0;
    if (phase === PH.CALM) {
      sepDist = 0; nucAlpha = 1;
    } else if (phase === PH.INCOMING) {
      sepDist = 0; nucAlpha = 1;
    } else if (phase === PH.EXCITE) {
      const p = phaseT / phaseDur;
      wobble = Math.min(1, p * 1.2) ; glowBoost = 6 + p * 14 + Math.sin(phaseT * 26) * 5;
      sepDist = 0;
    } else if (phase === PH.DEFORM) {
      const p = Math.min(1, phaseT / phaseDur);
      sepDist = p * p * 38; wobble = 0.7; glowBoost = 18;
    } else if (phase === PH.SPLIT) {
      sepDist += 90 * dt;                 // fragments fly apart
      const p = phaseT / phaseDur;
      nucAlpha = Math.max(0, 1 - p * 1.05);
      wobble = 0.35; glowBoost = 10;
    } else if (phase === PH.REFORM) {
      const p = Math.min(1, phaseT / phaseDur);
      sepDist = 0; nucAlpha = p; wobble = 0; glowBoost = 4;
    }

    ctx.clearRect(0, 0, CW, CH);

    // orbit paths
    for (const o of orbits) drawOrbitPath(o);

    // back electrons
    const back = [], front = [];
    for (const o of orbits) {
      const p = orbitPt(o, o.phase + t * o.speed * 60);
      (p.z < 0 ? back : front).push(o);
    }
    back.forEach(o => drawElectron(o, t));

    // gamma rings (under nucleus)
    for (let i = gammas.length - 1; i >= 0; i--) {
      const g = gammas[i];
      g.r += g.max * dt * 1.5; g.a -= dt * 1.1;
      ctx.beginPath(); ctx.arc(cx, cy, g.r, 0, TAU);
      ctx.strokeStyle = `rgba(${GAMMA},${Math.max(0, g.a)})`;
      ctx.lineWidth = g.w; ctx.stroke();
      if (g.a <= 0) gammas.splice(i, 1);
    }

    // energy sparks
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.life += dt;
      s.vx *= 0.96; s.vy *= 0.96;
      const fade = Math.max(0, 1 - s.life / s.max);
      ctx.beginPath(); ctx.arc(s.x, s.y, 2.2 * fade + 0.6, 0, TAU);
      ctx.fillStyle = `rgba(${ENERGY},${fade})`;
      ctx.shadowBlur = 8 * fade; ctx.shadowColor = `rgba(${ENERGY},${fade})`;
      ctx.fill(); ctx.shadowBlur = 0;
      if (s.life > s.max) sparks.splice(i, 1);
    }

    // incoming neutron
    if (phase === PH.INCOMING && incoming) {
      const p = phaseT / phaseDur, e = p * p;
      const nx = incoming.sx + (cx - incoming.sx) * e;
      const ny = incoming.sy + (cy - incoming.sy) * e;
      drawNeutron(nx, ny, Math.cos(incoming.dir) * 90, Math.sin(incoming.dir) * 90, 1);
    }

    // nucleus / fragments
    drawNucleus(wobble, glowBoost);

    // free (prompt) neutrons
    for (let i = freeN.length - 1; i >= 0; i--) {
      const p = freeN[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.life += dt;
      drawNeutron(p.x, p.y, p.vx, p.vy, 1 - p.life / p.max);
      if (p.life > p.max) freeN.splice(i, 1);
    }

    // front electrons
    front.forEach(o => drawElectron(o, t));

    // advance phase
    if (phaseT >= phaseDur) {
      const order = [PH.CALM, PH.INCOMING, PH.EXCITE, PH.DEFORM, PH.SPLIT, PH.REFORM];
      const idx = order.indexOf(phase);
      enter(order[(idx + 1) % order.length]);
    }

    requestAnimationFrame(draw);
  }
  enter(PH.CALM);
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
