// ===== NUCLEAR FISSION REACTION =====
// A full U-235 fission cycle: neutron capture → U-236* excitation → deformation
// → scission into two fragments → release of prompt neutrons + gamma + energy → reset.
(function () {
  const canvas = document.getElementById('atom-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const CW = canvas.width, CH = canvas.height;
  const cx = CW / 2, cy = CH / 2;
  const TAU = Math.PI * 2;

  const ACCENT   = '224, 57, 43';    // protons
  const NEUT_NUC = '120, 150, 180';  // bound neutrons (grey-blue)
  const CHEREN   = '54, 194, 255';   // free neutrons (Cherenkov blue)
  const GAMMA    = '210, 235, 255';  // gamma flash

  const PHASE = { APPROACH: 0, EXCITE: 1, DEFORM: 2, SPLIT: 3, COOL: 4 };
  const DUR   = { 0: 1.1, 1: 1.3, 2: 0.95, 3: 1.9, 4: 0.9 };
  const LABEL = {
    0: 'incoming neutron',
    1: 'U-236*  ·  excited & vibrating',
    2: 'deformation  ·  necking',
    3: 'scission  ·  ≈ 200 MeV released',
    4: '—'
  };

  let phase, phaseT, splitAxis, incoming, nucleons, freeNeutrons, gammas, sepDist, energy, born;

  function buildNucleus(count) {
    const arr = [];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const r = Math.pow(Math.random(), 0.5) * 27;
      arr.push({
        ox: Math.cos(a) * r, oy: Math.sin(a) * r * 0.92,
        proton: i % 2 === 0,
        size: 4.8 + Math.random() * 1.6,
        jit: Math.random() * TAU,
        jitSp: 0.04 + Math.random() * 0.06
      });
    }
    return arr;
  }

  function reset() {
    phase = PHASE.APPROACH; phaseT = 0;
    splitAxis = Math.random() * TAU;
    const ang = Math.random() * TAU;
    incoming = { sx: cx + Math.cos(ang) * 250, sy: cy + Math.sin(ang) * 250,
                 x: 0, y: 0, dir: ang + Math.PI };
    nucleons = buildNucleus(18);
    const ax = Math.cos(splitAxis), ay = Math.sin(splitAxis);
    nucleons.forEach(n => { n.lobe = (n.ox * ax + n.oy * ay) >= 0 ? 1 : -1; });
    freeNeutrons = []; gammas = []; sepDist = 0; energy = null; born = 0;
  }

  function nextPhase() {
    if (phase === PHASE.APPROACH) {
      // neutron captured → nucleus becomes U-236*
      nucleons.push({ ox: 0, oy: 0, proton: false, size: 5.4,
                      jit: 0, jitSp: 0.08, lobe: Math.random() < 0.5 ? 1 : -1 });
      gammas.push({ x: cx, y: cy, r: 0, max: 60, a: 0.7, w: 2 });
      phase = PHASE.EXCITE; phaseT = 0;
    } else if (phase === PHASE.EXCITE) {
      phase = PHASE.DEFORM; phaseT = 0;
    } else if (phase === PHASE.DEFORM) {
      // SCISSION — release neutrons, gamma burst, energy
      const ax = Math.cos(splitAxis), ay = Math.sin(splitAxis);
      const emit = 2 + Math.floor(Math.random() * 2); // 2-3 prompt neutrons
      for (let i = 0; i < emit; i++) {
        const spread = (Math.random() - 0.5) * 2.4;
        const a = splitAxis + (i % 2 ? Math.PI : 0) + spread;
        const sp = 95 + Math.random() * 60;
        freeNeutrons.push({ x: cx + ax * sepDist * (i % 2 ? -1 : 1),
                            y: cy + ay * sepDist * (i % 2 ? -1 : 1),
                            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 1.6 });
      }
      gammas.push({ x: cx, y: cy, r: 0, max: 230, a: 0.9, w: 3 });
      gammas.push({ x: cx, y: cy, r: 0, max: 150, a: 0.6, w: 2 });
      energy = { t: 0 };
      phase = PHASE.SPLIT; phaseT = 0;
    } else if (phase === PHASE.SPLIT) {
      phase = PHASE.COOL; phaseT = 0;
    } else {
      reset();
    }
  }

  function drawNucleon(x, y, n, alpha, glow) {
    const col = n.proton ? ACCENT : NEUT_NUC;
    ctx.beginPath();
    ctx.arc(x, y, n.size, 0, TAU);
    const g = ctx.createRadialGradient(x - n.size * 0.3, y - n.size * 0.3, 0, x, y, n.size);
    g.addColorStop(0, `rgba(255,228,218,${0.95 * alpha})`);
    g.addColorStop(0.5, `rgba(${col},${0.95 * alpha})`);
    g.addColorStop(1, `rgba(${col},${0.45 * alpha})`);
    ctx.fillStyle = g;
    ctx.shadowBlur = glow; ctx.shadowColor = `rgba(${n.proton ? ACCENT : CHEREN},${0.6 * alpha})`;
    ctx.fill(); ctx.shadowBlur = 0;
  }

  function drawNucleus(alpha, wobble, glow) {
    const ax = Math.cos(splitAxis), ay = Math.sin(splitAxis);
    // neck connector (bright bridge that thins as the two lobes pull apart)
    if (sepDist > 1 && sepDist < 46) {
      const f = 1 - sepDist / 46;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(splitAxis);
      ctx.beginPath();
      ctx.ellipse(0, 0, sepDist + 14, 13 * f + 4, 0, 0, TAU);
      ctx.fillStyle = `rgba(255,180,120,${0.35 * f * alpha})`;
      ctx.shadowBlur = 22; ctx.shadowColor = `rgba(255,170,90,${0.5 * f})`;
      ctx.fill(); ctx.shadowBlur = 0;
      ctx.restore();
    }
    for (const n of nucleons) {
      n.jit += n.jitSp;
      const jx = Math.cos(n.jit) * wobble;
      const jy = Math.sin(n.jit * 1.3) * wobble;
      const x = cx + n.ox + n.lobe * ax * sepDist + jx;
      const y = cy + n.oy + n.lobe * ay * sepDist + jy;
      drawNucleon(x, y, n, alpha, glow);
    }
  }

  function drawFreeNeutron(p) {
    const fade = 1 - p.life / p.max;
    // trail
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - p.vx * 0.06, p.y - p.vy * 0.06);
    ctx.strokeStyle = `rgba(${CHEREN},${0.5 * fade})`;
    ctx.lineWidth = 2; ctx.stroke();
    // head
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, TAU);
    ctx.fillStyle = `rgba(${CHEREN},${fade})`;
    ctx.shadowBlur = 12; ctx.shadowColor = `rgba(${CHEREN},${fade})`;
    ctx.fill(); ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.6, 0, TAU);
    ctx.fillStyle = `rgba(255,255,255,${fade})`;
    ctx.fill();
  }

  function drawLabel() {
    const txt = LABEL[phase];
    if (!txt || txt === '—') return;
    ctx.font = '600 14px "Fira Code", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(${CHEREN}, 0.85)`;
    ctx.fillText(txt, cx, CH - 22);
  }

  reset();
  let last = performance.now();
  function draw(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    phaseT += dt; born = Math.min(1, born + dt * 2.2);
    ctx.clearRect(0, 0, CW, CH);

    let alpha = 1, wobble = 1.2, glow = 8;

    if (phase === PHASE.APPROACH) {
      const p = Math.min(1, phaseT / DUR[0]);
      const e = p * p; // ease-in toward the nucleus
      incoming.x = incoming.sx + (cx - incoming.sx) * e;
      incoming.y = incoming.sy + (cy - incoming.sy) * e;
      alpha = born;
    } else if (phase === PHASE.EXCITE) {
      const p = phaseT / DUR[1];
      wobble = 1.2 + p * 4.5 + Math.sin(phaseT * 22) * 1.6;
      glow = 10 + Math.sin(phaseT * 14) * 8 + p * 10;
    } else if (phase === PHASE.DEFORM) {
      const p = Math.min(1, phaseT / DUR[2]);
      sepDist = p * p * 36;
      wobble = 3.5; glow = 16;
    } else if (phase === PHASE.SPLIT) {
      sepDist += 78 * dt;        // fragments fly apart
      const p = phaseT / DUR[3];
      alpha = Math.max(0, 1 - p * 0.85);
      wobble = 2.2; glow = 10;
    } else if (phase === PHASE.COOL) {
      alpha = Math.max(0, 0.15 - phaseT * 0.3);
    }

    // gamma rings
    for (let i = gammas.length - 1; i >= 0; i--) {
      const g = gammas[i];
      g.r += (g.max) * dt * 1.6; g.a -= dt * 1.3;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r, 0, TAU);
      ctx.strokeStyle = `rgba(${GAMMA}, ${Math.max(0, g.a)})`;
      ctx.lineWidth = g.w; ctx.stroke();
      if (g.a <= 0 || g.r > g.max) gammas.splice(i, 1);
    }

    // nucleus / fragments
    if (phase !== PHASE.COOL || alpha > 0) drawNucleus(alpha, wobble, glow);

    // incoming neutron
    if (phase === PHASE.APPROACH) drawFreeNeutron({
      x: incoming.x, y: incoming.y,
      vx: Math.cos(incoming.dir) * 90, vy: Math.sin(incoming.dir) * 90, life: 0, max: 1
    });

    // emitted neutrons
    for (let i = freeNeutrons.length - 1; i >= 0; i--) {
      const p = freeNeutrons[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.life += dt;
      drawFreeNeutron(p);
      if (p.life > p.max) freeNeutrons.splice(i, 1);
    }

    // energy callout
    if (energy) {
      energy.t += dt;
      const a = Math.max(0, 1 - energy.t / 1.6);
      ctx.font = '700 26px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(255,210,120,${a})`;
      ctx.shadowBlur = 18; ctx.shadowColor = `rgba(255,170,60,${a})`;
      ctx.fillText('≈ 200 MeV', cx, cy - 70 - energy.t * 26);
      ctx.shadowBlur = 0;
      if (energy.t > 1.6) energy = null;
    }

    drawLabel();

    if (phaseT >= DUR[phase]) nextPhase();
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
