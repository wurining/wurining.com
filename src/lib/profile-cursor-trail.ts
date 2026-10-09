import type { ProfileCursorTrailGPU } from './profile-cursor-trail-gpu';
import { profileCursorTrailConfig as config, profileCursorTrailDurationMs as durationMs } from './profile-cursor-trail-config.ts';

export function mountProfileCursorTrail(element: HTMLElement): () => void {
  const canvas = element.querySelector<HTMLCanvasElement>('canvas');
  if (!canvas) return () => {};
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const smallScreen = window.matchMedia('(max-width: 920px), (hover: none), (pointer: coarse)');
  let gpu: ProfileCursorTrailGPU | undefined;
  let pending: AbortController | undefined;
  let loading = false;
  let failed = false;
  let disposed = false;
  let visible = inView();
  let settleTimer = 0;
  let lastMovement = -Infinity;
  let moving = false;
  let pointerInside = false;
  let lastPoint: { x: number; y: number } | undefined;

  function measure() {
    const sidebar = element.closest<HTMLElement>('.profile-sidebar');
    if (sidebar) {
      const height = `${Math.max(0, sidebar.getBoundingClientRect().height)}px`;
      if (element.style.getPropertyValue('--profile-trail-height') !== height) {
        element.style.setProperty('--profile-trail-height', height);
      }
    }
    element.style.setProperty('--profile-trail-bottom-fade', `${config.bottomFadePx}px`);
    element.style.setProperty('--profile-trail-mask', config.bottomFadePx > 0
      ? 'linear-gradient(to bottom, #000 calc(100% - var(--profile-trail-bottom-fade)), transparent 100%)' : 'none');
  }
  function inView() {
    const rect = element.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  }
  const active = () => !disposed && !failed && visible && !document.hidden && !preference.matches && !smallScreen.matches;
  function updateState() {
    element.dataset.trailState = preference.matches ? 'reduced' : smallScreen.matches ? 'static' : failed ? 'fallback' : !active() ? 'paused' : gpu ? 'webgpu' : 'fallback';
    element.dataset.trailAnimating = String(moving);
  }
  function stop() {
    window.clearTimeout(settleTimer);
    moving = false;
    if (active()) gpu?.sleep();
    updateState();
  }
  function fallback() {
    if (disposed) return;
    failed = true;
    pending?.abort();
    stop();
    gpu?.destroy();
    gpu = undefined;
    element.classList.remove('profile-cursor-trail-ready');
    updateState();
  }
  function animate() {
    if (!active() || !gpu) return;
    if (!moving) gpu.wake();
    moving = true;
    window.clearTimeout(settleTimer);
    // Wall-clock retirement is independent of the library's frame-capped history age.
    settleTimer = window.setTimeout(stop, durationMs);
    updateState();
  }
  function pointer(event: MouseEvent) {
    if (!active()) return;
    const rect = element.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
      pointerInside = false;
      lastPoint = undefined;
      gpu?.leave();
      return;
    }
    if (lastPoint?.x === event.clientX && lastPoint?.y === event.clientY) return;
    lastPoint = { x: event.clientX, y: event.clientY };
    lastMovement = performance.now();
    gpu?.pointer((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height, !pointerInside);
    pointerInside = true;
    animate();
  }
  function resize() {
    measure();
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || !gpu) return;
    gpu.resize(rect.width, rect.height);
    const boxes: { left: number; top: number; right: number; bottom: number }[] = [];
    const sidebar = element.closest('.profile-sidebar');
    sidebar?.querySelectorAll('.profile-name, .profile-role, .profile-bio, .profile-links .text-link').forEach((text) => {
      const nodes = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = nodes.nextNode())) {
        if (!node.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const line of range.getClientRects()) {
          boxes.push({
            left: (line.left - rect.left - 2) / rect.width,
            top: (line.top - rect.top - 2) / rect.height,
            right: (line.right - rect.left + 2) / rect.width,
            bottom: (line.bottom - rect.top + 2) / rect.height,
          });
        }
      }
    });
    gpu.protectText(boxes);
  }
  function theme() { gpu?.theme(document.body.classList.contains('dark')); }
  async function load() {
    if (loading || gpu || failed || !active() || !('gpu' in navigator)) return;
    loading = true;
    const controller = new AbortController();
    pending = controller;
    try {
      const { createProfileCursorTrailGPU } = await import('./profile-cursor-trail-gpu');
      if (!active() || controller.signal.aborted) return;
      const renderer = await createProfileCursorTrailGPU(canvas!, () => {
        if (!disposed && !failed && active()) element.classList.add('profile-cursor-trail-ready');
      }, fallback, controller.signal);
      if (!active() || controller.signal.aborted) { renderer.destroy(); return; }
      gpu = renderer;
      theme();
      resize();
      if (performance.now() - lastMovement < durationMs) animate();
    } catch {
      if (!disposed && !controller.signal.aborted) fallback();
    } finally {
      if (pending === controller) pending = undefined;
      loading = false;
      sync();
    }
  }
  function sync() {
    if (disposed) return;
    if (active()) {
      if (!gpu && !loading && 'gpu' in navigator) void load();
    } else {
      pending?.abort();
      stop();
      gpu?.destroy();
      gpu = undefined;
      lastMovement = -Infinity;
      pointerInside = false;
      lastPoint = undefined;
      element.classList.remove('profile-cursor-trail-ready');
    }
    updateState();
  }
  function scroll() {
    if (!intersection) {
      const next = inView();
      if (next !== visible) { visible = next; sync(); }
    }
  }
  const intersection = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? false;
    sync();
  }) : undefined;
  intersection?.observe(element);
  const sizing = 'ResizeObserver' in window ? new ResizeObserver(resize) : undefined;
  sizing?.observe(element);
  const sidebar = element.closest('.profile-sidebar');
  if (sidebar) sizing?.observe(sidebar);
  const appearance = new MutationObserver(theme);
  appearance.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  preference.addEventListener('change', sync);
  smallScreen.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('mousemove', pointer, { passive: true });
  window.addEventListener('scroll', scroll, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  measure();
  visible = inView();
  sync();
  return () => {
    disposed = true;
    pending?.abort();
    window.clearTimeout(settleTimer);
    gpu?.destroy();
    gpu = undefined;
    intersection?.disconnect();
    sizing?.disconnect();
    appearance.disconnect();
    preference.removeEventListener('change', sync);
    smallScreen.removeEventListener('change', sync);
    document.removeEventListener('visibilitychange', sync);
    window.removeEventListener('mousemove', pointer);
    window.removeEventListener('scroll', scroll);
    window.removeEventListener('resize', resize);
    element.classList.remove('profile-cursor-trail-ready');
  };
}
