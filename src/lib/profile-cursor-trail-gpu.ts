import { createGpuUniformsMap, rootPassthrough, shaderRendererGPU } from 'shaders/core';
import CursorTrail from 'shaders/core/CursorTrail';
import Liquify from 'shaders/core/Liquify';
import { defineShader, wgsl } from 'shaders/std';
import { profileCursorTrailConfig as config, profileCursorTrailDurationMs as durationMs } from './profile-cursor-trail-config.ts';

const TEXT_SHIELDS = 24;
const textShieldProps = Object.fromEntries(Array.from({ length: TEXT_SHIELDS }, (_, index) =>
  ['L', 'T', 'R', 'B'].map((edge) => [`text${index}${edge}`, { default: 2 }])).flat());
const textShieldCoordinates = Array.from({ length: TEXT_SHIELDS }, (_, index) =>
  `vec4f(text${index}L, text${index}T, text${index}R, text${index}B)`).join(', ');

const halftoneTrail = defineShader({
  name: 'ProfileHalftoneTrail',
  props: {
    cellX: { default: 0.025 },
    cellY: { default: 0.015 },
    darkness: { default: 0 },
    cursorU: { default: 0.5 },
    cursorV: { default: 0.5 },
    retirement: { default: 1 },
    cellSizePx: { default: config.cellSizePx },
    maxRadius: { default: config.dotRadiusPx / config.cellSizePx },
    headRadiusPx: { default: config.headRadiusPx },
    holdPart: { default: config.holdMs / durationMs },
    fadePart: { default: config.fadeMs / durationMs },
    flickerAmount: { default: config.flicker.amount },
    flickerRateLow: { default: config.flicker.minHz * 2 * Math.PI },
    flickerRateHigh: { default: config.flicker.maxHz * 2 * Math.PI },
    lightOpacity: { default: config.lightOpacity },
    darkOpacity: { default: config.darkOpacity },
  },
  effect: wgsl`
    let cell = vec2f(cellX, cellY);
    let grid = uv / cell;
    let index = floor(grid);
    let center = (index + 0.5) * cell;
    let seed = fract(sin(dot(index, vec2f(127.1, 311.7))) * 43758.5453);
    let shadeSeed = fract(sin(dot(index, vec2f(269.5, 183.3))) * 43758.5453);
    let cursorDistance = length((center - vec2f(cursorU, cursorV)) / cell) * cellSizePx;
    let recorded = clamp(textureSampleLevel(childTexture, childSampler, center, 0.0).a, 0.0, 1.0);
    // Keep a continuous head at the actual cursor even below the recorder's .001 drag
    // threshold. Wall-clock retirement also clears this field after hold + fade.
    let head = 0.92 * exp(-cursorDistance * cursorDistance / (headRadiusPx * headRadiusPx))
      * (1.0 - smoothstep(headRadiusPx * 1.4, headRadiusPx * 2.1, cursorDistance));
    let strength = max(recorded, head);
    let proximity = exp(-cursorDistance * cursorDistance / pow(headRadiusPx * 1.6, 2.0));
    let density = smoothstep(seed * 0.26, seed * 0.26 + 0.12, strength);
    let radius = sqrt(strength) * mix(maxRadius * (0.3 / 0.49), maxRadius, proximity) * mix(0.8, 1.0, seed);
    // All dots keep the complete hold; small dots fade sooner during the fade period.
    let lifetime = holdPart + fadePart * mix(0.3, 1.0, clamp(radius / maxRadius, 0.0, 1.0));
    let remaining = 1.0 - smoothstep(holdPart, lifetime, retirement);
    let distance = length(fract(grid) - 0.5);
    let circle = 1.0 - smoothstep(max(0.0, radius - 0.055), radius + 0.055, distance);
    let pulse = sin(time * mix(flickerRateLow, flickerRateHigh, seed) + shadeSeed * 6.283185);
    let grey = clamp(0.2 + shadeSeed * 0.45 + pulse * flickerAmount, 0.1, 0.86);
    let ink = vec3f(mix(grey, 0.4 + grey * 0.6, darkness));
    let alpha = circle * density * pow(strength, 0.3) * remaining * mix(lightOpacity, darkOpacity, darkness);
    return vec4f(ink * alpha, alpha);
  `,
});

const trailFringe = defineShader({
  name: 'ProfileTrailFringe',
  props: {
    pixelX: { default: 0.0025 }, pixelY: { default: 0.0015 },
    cursorU: { default: 0.5 }, cursorV: { default: 0.5 },
    darkness: { default: 0 },
    fringeX: { default: config.fringePx.x }, fringeY: { default: config.fringePx.y },
    headRadiusPx: { default: config.headRadiusPx },
    ...textShieldProps,
  },
  effect: wgsl(`
    let pixels = vec2f(pixelX, pixelY);
    let cursorDelta = (uv - vec2f(cursorU, cursorV)) / pixels;
    let nearby = 1.0 - smoothstep(headRadiusPx * 0.4, headRadiusPx * 2.1, length(cursorDelta));
    let offset = vec2f(fringeX * pixelX, fringeY * pixelY) * nearby;
    let c = textureSampleLevel(childTexture, childSampler, uv, 0.0);
    let left = textureSampleLevel(childTexture, childSampler, uv - offset, 0.0);
    let right = textureSampleLevel(childTexture, childSampler, uv + offset, 0.0);
    let alpha = max(c.a, max(left.a, right.a));
    let strongest = select(select(c, left, left.a > c.a), right, right.a > max(c.a, left.a));
    let ink = strongest.rgb / max(strongest.a, 0.0001);
    let coverage = vec3f(left.a, c.a, right.a) / max(alpha, 0.0001);
    let separatedInk = mix(vec3f(1.0) - (vec3f(1.0) - ink) * coverage, ink * coverage, darkness);
    // Overlapping channels retain a grey core; actual displaced coverage forms the colour rim.
    let chromaticInk = mix(ink, separatedInk, nearby * 0.9);
    // Protect rendered text line boxes, leaving the surrounding trail clearly visible.
    let textBoxes = array<vec4f, ${TEXT_SHIELDS}>(${textShieldCoordinates});
    var shield = 0.0;
    for (var index = 0; index < ${TEXT_SHIELDS}; index = index + 1) {
      let box = textBoxes[index];
      let outside = max(max((box.x - uv.x) / pixelX, (uv.x - box.z) / pixelX),
        max((box.y - uv.y) / pixelY, (uv.y - box.w) / pixelY));
      shield = max(shield, 1.0 - smoothstep(0.0, 6.0, outside));
    }
    let visibleAlpha = alpha * mix(1.0, mix(0.12, 0.2, darkness), shield);
    return vec4f(chromaticInk * visibleAlpha, visibleAlpha);
  `),
});

export interface ProfileCursorTrailGPU {
  resize(width: number, height: number): void;
  protectText(rects: { left: number; top: number; right: number; bottom: number }[]): void;
  pointer(x: number, y: number, entering: boolean): void;
  leave(): void;
  wake(): void;
  sleep(): void;
  theme(dark: boolean): void;
  destroy(): void;
}

export async function createProfileCursorTrailGPU(canvas: HTMLCanvasElement, ready: () => void, unavailable: () => void, signal: AbortSignal): Promise<ProfileCursorTrailGPU> {
  const renderer = shaderRendererGPU();
  let destroyed = false;
  let announced = false;
  let readyTimeout = 0;
  let input = { x: 0.5, y: 0.5, seen: false };
  let inputRevision = 0;
  let lastInputTime = -Infinity;
  let sentRetirement = 1;
  type Frame = { deltaTime: number; pointer: { x: number; y: number; seen?: boolean }; pointerActive: boolean; dimensions: { width: number; height: number } };
  const scopedFrame = (frame: Frame): Frame => ({ ...frame, pointer: { ...input }, pointerActive: input.seen });
  // Public callback wrappers retain the official recorder/spring lattice while bypassing
  // their global mouse listeners. Only this homepage region supplies coordinates.
  const scopedTrail = {
    ...CursorTrail,
    usesPointer: false,
    fragment: (params: Parameters<typeof CursorTrail.fragment>[0]) => {
      let primed = false;
      let previousRevision = -1;
      return CursorTrail.fragment({
        ...params,
        onBeforeRender: (callback) => params.onBeforeRender((frame) => {
          const current = scopedFrame(frame);
          if (!primed) { current.pointer.seen = false; primed = true; }
          // Freeze recorder aging between actual inputs; wall-clock retirement handles
          // idle hold/fade while the liquid lattice and per-dot grey variation stay live.
          if (inputRevision === previousRevision) current.deltaTime = 0;
          previousRevision = inputRevision;
          callback(current);
        }),
      });
    },
  };
  const scopedLiquid = {
    ...Liquify,
    usesPointer: false,
    compute: (params: Parameters<NonNullable<typeof Liquify.compute>>[0]) => {
      const computation = Liquify.compute!(params);
      return computation && {
        ...computation,
        getComputeNodes: (frame: unknown) => computation.getComputeNodes(scopedFrame(frame as Frame)),
      };
    },
  };
  const retiringHalftone = {
    ...halftoneTrail,
    fragment: (params: Parameters<typeof halftoneTrail.fragment>[0]) => {
      params.onBeforeRender(() => {
        // Wall time drives retirement even if GPU frames are sparse or capped.
        const next = Math.min(1, Math.max(0, (performance.now() - lastInputTime) / durationMs));
        if (next !== sentRetirement) {
          sentRetirement = next;
          renderer.updateUniformValue('profile-trail-dots', 'retirement', next);
        }
      });
      return halftoneTrail.fragment(params);
    },
  };
  const destroy = () => {
    destroyed = true;
    window.clearTimeout(readyTimeout);
    signal.removeEventListener('abort', destroy);
    renderer.cleanup();
  };
  signal.addEventListener('abort', destroy, { once: true });
  renderer.setOnReady(() => {
    if (!announced && !destroyed && !signal.aborted) {
      announced = true;
      window.clearTimeout(readyTimeout);
      ready();
    }
  });
  renderer.setOnUnavailable(() => { if (!destroyed && !signal.aborted) unavailable(); });
  renderer.setOnDeviceLost(() => { if (!destroyed && !signal.aborted) unavailable(); });
  try {
    signal.throwIfAborted();
    await renderer.initialize({ canvas, observeElement: false, colorSpace: 'srgb', toneMapping: 'linear' });
    renderer.stopAnimation();
    signal.throwIfAborted();
    if (renderer.getFailureReason()) throw new Error('The profile cursor trail renderer is unavailable.');
    renderer.registerNode('profile-trail-root', rootPassthrough.fragment, null, null, {}, rootPassthrough);
    function layer(id: string, parent: string, definition: Parameters<typeof renderer.registerNode>[5], props: Record<string, unknown>) {
      const bridge = definition as unknown as Parameters<typeof createGpuUniformsMap>[0];
      renderer.registerNode(id, definition!.fragment, parent, null, createGpuUniformsMap(bridge, props, id), definition);
    }
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    layer('profile-trail-fringe', 'profile-trail-root', trailFringe, { pixelX: 1 / width, pixelY: 1 / height, cursorU: 0.5, cursorV: 0.5, darkness: 0 });
    layer('profile-trail-liquid', 'profile-trail-fringe', scopedLiquid, { intensity: config.liquify.intensity, stiffness: 4, damping: 3, radius: config.liquify.radiusPx / (height * 0.08), edges: 'transparent' });
    layer('profile-trail-dots', 'profile-trail-liquid', retiringHalftone, {
      cellX: config.cellSizePx / width, cellY: config.cellSizePx / height, darkness: 0, cursorU: 0.5, cursorV: 0.5, retirement: 1,
    });
    const strokeProps = {
      colorA: '#ffffff', colorB: '#ffffff00', colorSpace: 'linear', radius: config.trailRadiusPx / (height * 0.1), length: durationMs / 1000, shrink: 0.6, softness: 0.8,
    };
    layer('profile-trail-stroke', 'profile-trail-dots', scopedTrail, strokeProps);
    renderer.setFrameRateCap(config.frameRate);
    readyTimeout = window.setTimeout(() => {
      if (!announced && !destroyed && !signal.aborted) unavailable();
    }, 12000);
    return {
      resize: (w, h) => {
        renderer.resize(w, h);
        renderer.updateUniformValue('profile-trail-dots', 'cellX', config.cellSizePx / Math.max(1, w));
        renderer.updateUniformValue('profile-trail-dots', 'cellY', config.cellSizePx / Math.max(1, h));
        renderer.updateUniformValue('profile-trail-fringe', 'pixelX', 1 / Math.max(1, w));
        renderer.updateUniformValue('profile-trail-fringe', 'pixelY', 1 / Math.max(1, h));
        strokeProps.radius = config.trailRadiusPx / (Math.max(1, h) * 0.1);
        renderer.updateUniformValue('profile-trail-stroke', 'radius', strokeProps.radius);
        renderer.updateUniformValue('profile-trail-liquid', 'radius', config.liquify.radiusPx / (Math.max(1, h) * 0.08));
      },
      protectText: (rects) => {
        for (let index = 0; index < TEXT_SHIELDS; index++) {
          const box = rects[index];
          const values = box ? [box.left, box.top, box.right, box.bottom] : [2, 2, 2, 2];
          ['L', 'T', 'R', 'B'].forEach((edge, coordinate) =>
            renderer.updateUniformValue('profile-trail-fringe', `text${index}${edge}`, values[coordinate]));
        }
      },
      pointer: (x, y, entering) => {
        input = { x, y, seen: true };
        inputRevision++;
        lastInputTime = performance.now();
        for (const id of ['profile-trail-dots', 'profile-trail-fringe']) {
          renderer.updateUniformValue(id, 'cursorU', x);
          renderer.updateUniformValue(id, 'cursorV', y);
        }
        if (entering) {
          // A fresh recorder prevents a new gesture from joining an old parked endpoint.
          renderer.removeNode('profile-trail-stroke');
          layer('profile-trail-stroke', 'profile-trail-dots', scopedTrail, strokeProps);
        }
      },
      leave: () => { input.seen = false; },
      wake: () => renderer.startAnimation(),
      sleep: () => {
        renderer.stopAnimation();
        input.seen = false;
        lastInputTime = -Infinity;
        sentRetirement = 1;
        renderer.updateUniformValue('profile-trail-dots', 'retirement', 1);
        // Frame-capped/throttled GPU time can lag wall time. Clear the recorder and draw
        // a final empty frame so an expired gesture cannot remain or return on wake.
        renderer.removeNode('profile-trail-stroke');
        layer('profile-trail-stroke', 'profile-trail-dots', scopedTrail, strokeProps);
        void renderer.renderAndWait({ waitForGpu: true }).catch(() => {
          if (!destroyed && !signal.aborted) unavailable();
        });
      },
      theme: (dark) => {
        renderer.updateUniformValue('profile-trail-dots', 'darkness', dark ? 1 : 0);
        renderer.updateUniformValue('profile-trail-fringe', 'darkness', dark ? 1 : 0);
      },
      destroy,
    };
  } catch (error) {
    destroy();
    throw error;
  }
}
