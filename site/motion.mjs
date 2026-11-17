const preference = matchMedia('(prefers-reduced-motion: reduce)');
export const reducedMotion = () => preference.matches;

// The flow moves continuously while visible, without scroll-driven jumps.
export function initMotion() {
  const flow = document.querySelector('.flow-demo');
  const button = document.querySelector('#flow-toggle');
  if (!flow || !button) return;
  let visible = false, paused = false;
  function sync() {
    const running = visible && !paused && !preference.matches && !document.hidden;
    flow.classList.toggle('is-running', running);
    button.disabled = preference.matches;
    button.textContent = preference.matches ? 'Reduced motion enabled' : paused ? 'Play flow →' : 'Pause flow Ⅱ';
    button.setAttribute('aria-pressed', String(!paused && !preference.matches));
  }
  button.addEventListener('click', () => {paused = !paused; sync();});
  new IntersectionObserver(([entry]) => {visible = entry.isIntersecting; sync();}, {threshold: .15}).observe(flow);
  preference.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  sync();
}
