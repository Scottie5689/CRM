<script>
  // Small 8-bit firework show: three rockets on a loop, drawn on a tiny canvas
  // and scaled up with crisp pixels. Decorative only.
  let { color = '#ff3b30' } = $props();

  const W = 120; // canvas size in "8-bit" pixels (scaled up by CSS to the card's width)
  const H = 28;
  const FPS = 12; // low frame rate for the retro feel
  const LAUNCH = 7; // ticks spent rising
  const BURST = 12; // ticks spent exploding
  const CYCLE = 33; // ticks per firework loop (includes a pause)
  const SPARKS = 12;

  // x position, burst height and start offset for each firework (evenly spaced, centred)
  const SHOW = [
    { x: W / 6, y: 9, offset: 0 },
    { x: W / 2, y: 6, offset: 11 },
    { x: (W * 5) / 6, y: 10, offset: 22 }
  ];

  let canvas;

  function px(ctx, x, y, alpha) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    ctx.globalAlpha = alpha;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  function drawFirework(ctx, fw, tick) {
    const t = (((tick - fw.offset) % CYCLE) + CYCLE) % CYCLE;
    if (t < LAUNCH) {
      // Rocket rising with a short trail
      const y = H - 1 - ((H - 1 - fw.y) * (t + 1)) / LAUNCH;
      px(ctx, fw.x, y, 1);
      px(ctx, fw.x, y + 1, 0.55);
      px(ctx, fw.x, y + 2, 0.25);
      return;
    }
    const f = t - LAUNCH;
    if (f >= BURST) return;
    // Stepped fade: full, then dimmer, then sparkling out
    const alpha = f < 5 ? 1 : f < 8 ? 0.6 : 0.3;
    if (f === 0) {
      px(ctx, fw.x, fw.y, 1);
      return;
    }
    const r = Math.min(f, 6) * 1.25;
    const drop = Math.max(0, f - 5) * 0.5; // gravity once it slows
    for (let i = 0; i < SPARKS; i++) {
      if (f >= 8 && (i + f) % 2) continue; // twinkle out
      const a = (i / SPARKS) * Math.PI * 2;
      const x = fw.x + Math.cos(a) * r;
      const y = fw.y + Math.sin(a) * r + drop;
      px(ctx, x, y, alpha);
      if (f < 6) px(ctx, fw.x + Math.cos(a) * (r - 1.25), fw.y + Math.sin(a) * (r - 1.25), alpha * 0.4);
    }
  }

  function render(ctx, tick) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = color;
    for (const fw of SHOW) drawFirework(ctx, fw, tick);
    ctx.globalAlpha = 1;
  }

  $effect(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reduced motion: one still frame with all three bursts open.
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = color;
      for (const fw of SHOW) drawFirework(ctx, { ...fw, offset: 0 }, LAUNCH + 4);
      return;
    }

    let raf;
    let start;
    const frame = (now) => {
      start ??= now;
      render(ctx, Math.floor(((now - start) / 1000) * FPS));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  });
</script>

<canvas bind:this={canvas} width={W} height={H} aria-hidden="true"></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 120 / 28;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
</style>
