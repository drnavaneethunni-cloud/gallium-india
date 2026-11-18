// A decorative, finite introduction. No canvas or animation work remains when idle.
const hero = document.querySelector('.hero');
const canvas = hero?.querySelector('.filtration-canvas');
const photograph = hero?.querySelector('.hero-visual > img');
const toggle = hero?.querySelector('.filtration-toggle');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const context = canvas?.getContext('2d');
const DURATION = 4600;
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
    rx: image.clientWidth * 0.047,
    ry: image.clientHeight * 0.13,
  };
}

function createScene(width, height, inlet) {
  // Fixed seed keeps the composition and particle density consistent on every replay.
  let seed = 691;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const distance = Math.hypot(width, height);
  function mote(large = false) {
    const x = random() * width, y = random() * height;
    const angle = random() * Math.PI * 2;
    const spread = Math.sqrt(random());
    return {
      x, y,
      endX: inlet.x + Math.cos(angle) * inlet.rx * spread,
      endY: inlet.y + Math.sin(angle) * inlet.ry * spread,
      phase: random() * Math.PI * 2,
      bend: (random() - 0.5) * Math.min(width, height) * 0.8,
      delay: 340 + random() * 1150,
      travel: 1700 + Math.hypot(x - inlet.x, y - inlet.y) / distance * 1400 + random() * 200,
      radius: large ? 90 + random() * 170 : 0.9 + random() ** 2 * 4.1,
      alpha: large ? 0.2 + random() * 0.15 : 0.35 + random() * 0.4,
      warm: random() > 0.65,
    };
  }
  const particles = Array.from({length: width < 600 ? 130 : 230}, () => mote());
  const clouds = Array.from({length: 12}, () => mote(true));
  const fog = document.createElement('canvas');
  fog.width = 160; fog.height = 160;
  const brush = fog.getContext('2d');
  const gradient = brush.createRadialGradient(80, 80, 0, 80, 80, 80);
  gradient.addColorStop(0, 'rgba(83,83,74,.8)');
  gradient.addColorStop(0.45, 'rgba(106,103,91,.42)');
  gradient.addColorStop(1, 'rgba(106,103,91,0)');
  brush.fillStyle = gradient;
  brush.fillRect(0, 0, 160, 160);
  return {width, height, inlet, particles, clouds, fog, distance};
}

function position(particle, elapsed) {
  const progress = clamp((elapsed - particle.delay) / particle.travel);
  const pull = progress ** 1.7;
  const dx = particle.endX - particle.x, dy = particle.endY - particle.y;
  const length = Math.hypot(dx, dy) || 1;
  const bend = Math.sin(Math.PI * pull) * particle.bend;
  const drift = (1 - pull) * Math.min(elapsed / 650, 1);
  return {
    x: particle.x + dx * pull - dy / length * bend + Math.sin(elapsed / 700 + particle.phase) * 9 * drift,
    y: particle.y + dy * pull + dx / length * bend + Math.cos(elapsed / 850 + particle.phase) * 6 * drift,
    progress,
  };
}

function drawScene(ctx, scene, elapsed) {
  const {width, height, inlet, distance} = scene;
  const time = elapsed / DURATION;
  ctx.clearRect(0, 0, width, height);

  // The clear region grows outward from the intake as the haze is drawn in.
  const clearing = smooth((time - 0.12) / 0.77);
  const reach = Math.max(1, distance * clearing);
  const haze = ctx.createRadialGradient(inlet.x, inlet.y, 0, inlet.x, inlet.y, reach);
  const density = 0.56 * (1 - smooth((time - 0.52) / 0.41));
  haze.addColorStop(0, `rgba(99,100,90,${density * (1 - clearing)})`);
  haze.addColorStop(0.7, `rgba(104,103,94,${density})`);
  haze.addColorStop(1, `rgba(111,108,97,${density})`);
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, width, height);

  for (const cloud of scene.clouds) {
    const point = position(cloud, elapsed);
    if (point.progress >= 1) continue;
    const radius = cloud.radius * (1 - point.progress * 0.92);
    ctx.globalAlpha = cloud.alpha * (1 - smooth(point.progress));
    ctx.drawImage(scene.fog, point.x - radius, point.y - radius, radius * 2, radius * 2);
  }
  ctx.globalAlpha = 1;

  for (const particle of scene.particles) {
    const point = position(particle, elapsed);
    if (point.progress >= 1) continue;
    const fade = 1 - smooth((point.progress - 0.82) / 0.18);
    const radius = Math.max(0.25, particle.radius * (1 - point.progress * 0.8));
    const color = particle.warm ? '113,94,70' : '53,58,56';
    if (point.progress > 0.15) {
      const tail = position(particle, elapsed - 48);
      ctx.strokeStyle = `rgba(${color},${particle.alpha * fade * 0.5})`;
      ctx.lineWidth = Math.max(0.5, radius * 0.65);
      ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(point.x, point.y); ctx.stroke();
    }
    ctx.fillStyle = `rgba(${color},${particle.alpha * fade})`;
    ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.fill();
  }
}
