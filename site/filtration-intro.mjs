// A decorative, finite introduction. No canvas or animation work remains when idle.
const hero = document.querySelector('.hero');
const canvas = hero?.querySelector('.filtration-canvas');
const photograph = hero?.querySelector('.hero-visual > img');
const toggle = hero?.querySelector('.filtration-toggle');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const context = canvas?.getContext('2d');
const DURATION = 4800;
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

if (hero && context && photograph && toggle) initialize();

function initialize() {
  let frame = 0, started = 0, scene = null, running = false, interacted = false;
  const label = toggle.querySelector('span');

  function finish() {
    running = false;
    cancelAnimationFrame(frame);
    frame = 0;
    scene = null;
    canvas.hidden = true;
    canvas.width = canvas.height = 1;
    hero.dataset.filtration = preference.matches ? 'reduced' : 'complete';
    toggle.hidden = preference.matches || !photograph.naturalWidth;
    label.textContent = 'Replay animation';
    toggle.setAttribute('aria-label', 'Replay filtration animation');
  }

  function paint(now) {
    if (!running) return;
    if (!started) started = now;
    const elapsed = now - started;
    if (elapsed >= DURATION) { finish(); return; }
    drawScene(context, scene, elapsed);
    frame = requestAnimationFrame(paint);
  }

  function play() {
    if (preference.matches || document.hidden || !photograph.naturalWidth) return;
    const bounds = hero.getBoundingClientRect();
    if (bounds.bottom < 120 || bounds.top > innerHeight) return;
    cancelAnimationFrame(frame);
    const scale = Math.min(devicePixelRatio || 1, 1.5);
    const width = bounds.width, height = bounds.height;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    scene = createScene(width, height, inletPosition(photograph, bounds));
    running = true;
    started = 0;
    hero.dataset.filtration = 'playing';
    label.textContent = 'Skip intro';
    toggle.setAttribute('aria-label', 'Skip filtration animation');
    toggle.hidden = false;
    canvas.hidden = false;
    drawScene(context, scene, 0);
    frame = requestAnimationFrame(paint);
  }

  toggle.addEventListener('click', () => running ? finish() : play());
  // Searching and navigating take priority over the decorative introduction.
  hero.addEventListener('focusin', event => {
    if (toggle.contains(event.target)) return;
    interacted = true;
    if (running) finish();
  });
  hero.addEventListener('pointerdown', event => {
    if (!event.target.closest('a, input, button') || toggle.contains(event.target)) return;
    interacted = true;
    if (running) finish();
  });
  window.addEventListener('resize', () => { if (running) finish(); }, {passive: true});
  window.addEventListener('scroll', () => {
    if (running && hero.getBoundingClientRect().bottom < 120) finish();
  }, {passive: true});
  document.addEventListener('visibilitychange', () => { if (document.hidden && running) finish(); });
  window.addEventListener('pagehide', finish);
  preference.addEventListener('change', finish);

  finish();
  // Never postpone access to the page while an image downloads, or replay on a deep link.
  const begin = () => {
    toggle.hidden = preference.matches || !photograph.naturalWidth;
    if (!interacted && scrollY < 80 && !location.hash && !document.hidden) play();
  };
  if (photograph.complete) begin();
  else photograph.addEventListener('load', begin, {once: true});
}

function inletPosition(image, heroBounds) {
  const rect = image.getBoundingClientRect();
  const transform = new DOMMatrixReadOnly(getComputedStyle(image).transform);
  // Centre of the visible opening in the original photograph, including its CSS rotation.
  const dx = image.clientWidth * (0.322 - 0.5);
  const dy = image.clientHeight * (0.565 - 0.5);
  return {
    x: rect.left + rect.width / 2 - heroBounds.left + transform.a * dx + transform.c * dy,
    y: rect.top + rect.height / 2 - heroBounds.top + transform.b * dx + transform.d * dy,
    rx: image.clientWidth * 0.057,
    ry: image.clientHeight * 0.173,
    angle: Math.atan2(transform.b, transform.a),
  };
}

function createScene(width, height, inlet) {
  // Fixed seed keeps the composition and particle density consistent on every replay.
  let seed = 691;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const mobile = width < 600;
  // A common approach direction makes the intake read as the source of suction.
  const reach = mobile ? Math.min(420, inlet.y * 0.7) : Math.min(650, inlet.x * 0.8);
  const front = mobile ? {x: -0.12, y: -0.993} : {x: -0.997, y: -0.075};
  const cross = {x: -front.y, y: front.x};
  function lane(offset, spread = 1) {
    const wide = mobile ? width * 0.44 : height * 0.43;
    return {
      a: {x: inlet.x + front.x * reach + cross.x * offset * wide,
          y: inlet.y + front.y * reach + cross.y * offset * wide},
      b: {x: inlet.x + front.x * reach * 0.62 + cross.x * offset * wide * 0.85,
          y: inlet.y + front.y * reach * 0.62 + cross.y * offset * wide * 0.85},
      c: {x: inlet.x + front.x * inlet.rx * 2.1 + cross.x * offset * inlet.ry * 0.6,
          y: inlet.y + front.y * inlet.rx * 2.1 + cross.y * offset * inlet.ry * 0.6},
      // Every path ends well inside the photograph's opening, never in the surrounding air.
      d: {x: inlet.x + offset * inlet.rx * 0.22 * spread,
          y: inlet.y + offset * inlet.ry * 0.5 * spread},
    };
  }
  function mote(stream = false, large = false) {
    const offset = random() * 2 - 1;
    const path = lane(offset);
    if (!stream) {
      path.a = {x: random() * width, y: random() * height};
      // Dust from behind the filter curls around to the front before entering.
      if (!mobile && path.a.x > inlet.x) {
        path.b.y = inlet.y + (path.a.y < inlet.y ? -1 : 1) * inlet.ry * 2.2;
      }
    }
    return {
      path, stream,
      delay: stream ? 600 + random() * 2350 : 350 + random() * 1000,
      travel: stream ? 1050 + random() * 650 : 1900 + random() * 1100,
      radius: large ? 110 + random() * 150 : (stream ? 2.5 : 1.4) + random() ** 2 * 4.2,
      alpha: large ? 0.28 : (stream ? 0.8 : 0.55) + random() * 0.18,
      warm: random() > 0.55,
    };
  }
  const ambient = Array.from({length: mobile ? 120 : 210}, () => mote());
  const stream = Array.from({length: mobile ? 130 : 220}, () => mote(true));
  const particles = [...ambient, ...stream];
  const clouds = Array.from({length: 16}, () => mote(false, true));
  const lanes = [-1, -0.65, -0.3, 0.3, 0.65, 1].map(offset => lane(offset));
  const fog = document.createElement('canvas');
  fog.width = 160; fog.height = 160;
  const brush = fog.getContext('2d');
  const gradient = brush.createRadialGradient(80, 80, 0, 80, 80, 80);
  gradient.addColorStop(0, 'rgba(83,83,74,.8)');
  gradient.addColorStop(0.45, 'rgba(106,103,91,.42)');
  gradient.addColorStop(1, 'rgba(106,103,91,0)');
  brush.fillStyle = gradient;
  brush.fillRect(0, 0, 160, 160);
  return {width, height, inlet, particles, ambient, clouds, fog, lanes};
}

function position(particle, elapsed) {
  const progress = clamp((elapsed - particle.delay) / particle.travel);
  // Increasing speed, followed by a short visible passage into the opening.
  return {...curvePoint(particle.path, progress ** 1.65), progress};
}

function curvePoint({a, b, c, d}, t) {
  const s = 1 - t;
  return {
    x: s*s*s*a.x + 3*s*s*t*b.x + 3*s*t*t*c.x + t*t*t*d.x,
    y: s*s*s*a.y + 3*s*s*t*b.y + 3*s*t*t*c.y + t*t*t*d.y,
  };
}

function traceLane(ctx, path, from = 0, to = 1) {
  ctx.beginPath();
  for (let step = 0; step <= 24; step++) {
    const p = curvePoint(path, from + (to - from) * step / 24);
    if (step === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
  }
}

function insideIntake(point, inlet) {
  const x = point.x - inlet.x, y = point.y - inlet.y;
  const cos = Math.cos(inlet.angle), sin = Math.sin(inlet.angle);
  return ((x*cos + y*sin)/inlet.rx)**2 + ((-x*sin + y*cos)/inlet.ry)**2 < 0.82;
}

function drawScene(ctx, scene, elapsed) {
  const {width, height, inlet} = scene;
  ctx.clearRect(0, 0, width, height);
  const active = smooth((elapsed - 400) / 600) * (1 - smooth((elapsed - 3900) / 650));
  const captured = scene.ambient.filter(p => elapsed >= p.delay + p.travel).length / scene.ambient.length;
  const density = 0.5 * (1 - smooth(captured));
  ctx.fillStyle = `rgba(105,103,94,${density})`;
  ctx.fillRect(0, 0, width, height);

  // Translucent streamlines form a visible funnel, with moving slugs of dusty air.
  ctx.lineCap = 'round';
  for (const [index, path] of scene.lanes.entries()) {
    traceLane(ctx, path);
    ctx.strokeStyle = `rgba(223,229,227,${active * 0.26})`;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = `rgba(85,102,105,${active * 0.18})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    const pulse = ((elapsed / 1150 + index * 0.17) % 1) ** 1.45;
    traceLane(ctx, path, Math.max(0, pulse - 0.19), pulse);
    ctx.strokeStyle = `rgba(247,249,246,${active * 0.75})`;
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }

  // A restrained highlight follows the actual tilted lip, grounding the effect in the product.
  ctx.save();
  ctx.translate(inlet.x, inlet.y); ctx.rotate(inlet.angle);
  ctx.beginPath(); ctx.ellipse(0, 0, inlet.rx, inlet.ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(22,30,29,${active * 0.18})`; ctx.fill();
  ctx.strokeStyle = `rgba(234,242,236,${active * 0.7})`;
  ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();

  for (const cloud of scene.clouds) {
    const point = position(cloud, elapsed);
    if (point.progress >= 1) continue;
    const radius = cloud.radius * (1 - point.progress ** 1.6) + 2;
    ctx.globalAlpha = cloud.alpha * (1 - smooth((point.progress - 0.92) / 0.08));
    ctx.drawImage(scene.fog, point.x - radius, point.y - radius, radius * 2, radius * 2);
  }
  ctx.globalAlpha = 1;

  for (const particle of scene.particles) {
    if (particle.stream && elapsed < particle.delay) continue;
    const point = position(particle, elapsed);
    if (point.progress >= 1) continue;
    // No fading in open air: shrink and disappear only after entering the visible intake.
    const swallowed = insideIntake(point, inlet) ? smooth((point.progress - 0.93) / 0.07) : 0;
    const appear = particle.stream ? smooth((elapsed - particle.delay) / 100) : 1;
    const opacity = particle.alpha * appear * (1 - swallowed);
    const radius = Math.max(0.25, particle.radius * (1 - swallowed * 0.95));
    const color = particle.warm ? '133,91,44' : '40,46,43';
    if (point.progress > 0.08) {
      ctx.strokeStyle = `rgba(${color},${opacity * 0.55})`;
      ctx.lineWidth = Math.max(0.8, radius * 0.52);
      ctx.beginPath();
      for (let step = 0; step <= 5; step++) {
        const tail = position(particle, elapsed - 85 + step * 17);
        if (step === 0) ctx.moveTo(tail.x, tail.y); else ctx.lineTo(tail.x, tail.y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = `rgba(${color},${opacity})`;
    ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.fill();
  }
}
