<script>
  import { industrySlices } from '../lib/industries.js';

  let { companies, selected = null, onselect } = $props();

  const SIZE = 168;
  const R = SIZE / 2 - 2;
  const C = SIZE / 2;

  let slices = $derived(industrySlices(companies));
  let total = $derived(slices.reduce((n, s) => n + s.count, 0));

  let arcs = $derived.by(() => {
    let angle = -Math.PI / 2;
    return slices.map((s) => {
      const sweep = (s.count / total) * Math.PI * 2;
      const a0 = angle;
      const a1 = (angle += sweep);
      const pt = (a) => `${C + R * Math.cos(a)} ${C + R * Math.sin(a)}`;
      const d =
        slices.length === 1
          ? null
          : `M ${C} ${C} L ${pt(a0)} A ${R} ${R} 0 ${sweep > Math.PI ? 1 : 0} 1 ${pt(a1)} Z`;
      return { ...s, d, pct: Math.round((s.count / total) * 100) };
    });
  });

  let hovered = $state(null);
  let tip = $state({ x: 0, y: 0 });
  let wrap;

  function move(e, key) {
    const box = wrap.getBoundingClientRect();
    tip = { x: e.clientX - box.left, y: e.clientY - box.top };
    hovered = key;
  }

  let hoveredArc = $derived(arcs.find((a) => a.key === hovered));
  const pick = (key) => onselect?.(selected === key ? null : key);
  const dim = (key) => selected && selected !== key;
</script>

<section class="card pie-card" aria-labelledby="pie-title">
  <h2 id="pie-title">Companies by industry</h2>
  <div class="body">
    <div class="chart" bind:this={wrap}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox="0 0 {SIZE} {SIZE}"
        role="img"
        aria-label={arcs.map((a) => `${a.label}: ${a.count}`).join(', ')}
      >
        <defs>
          <pattern id="pie-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--surface-2)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--series-other)" stroke-width="2.5" />
          </pattern>
        </defs>
        {#each arcs as a (a.key)}
          <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
          <g
            class="slice"
            class:dim={dim(a.key)}
            class:hot={hovered === a.key}
            onmousemove={(e) => move(e, a.key)}
            onmouseleave={() => (hovered = null)}
            onclick={() => pick(a.key)}
          >
            {#if a.d}
              <path d={a.d} fill={a.color} />
            {:else}
              <circle cx={C} cy={C} r={R} fill={a.color} />
            {/if}
          </g>
        {/each}
      </svg>
      {#if hoveredArc}
        <div class="tip" style:left="{tip.x}px" style:top="{tip.y}px">
          <strong>{hoveredArc.label}</strong>
          <span>{hoveredArc.count} {hoveredArc.count === 1 ? 'company' : 'companies'} · {hoveredArc.pct}%</span>
        </div>
      {/if}
    </div>

    <ul class="legend">
      {#each arcs as a (a.key)}
        <li>
          <button
            class="row"
            class:dim={dim(a.key)}
            class:hot={hovered === a.key}
            aria-pressed={selected === a.key}
            onmouseenter={() => (hovered = a.key)}
            onmouseleave={() => (hovered = null)}
            onclick={() => pick(a.key)}
          >
            <span class="swatch" class:hatch={a.swatch === 'hatch'} style:background={a.swatch ? null : a.color}></span>
            <span class="name">{a.label}</span>
            <span class="count">{a.count}</span>
            <span class="pct">{a.pct}%</span>
          </button>
        </li>
      {/each}
    </ul>
  </div>
  <p class="hint-line">
    {total} {total === 1 ? 'company' : 'companies'}{selected ? '' : ' · click an industry to filter the table'}
  </p>
</section>

<style>
  .pie-card {
    margin-bottom: 16px;
  }
  h2 {
    font-size: 1rem;
    margin: 0 0 12px;
  }
  .body {
    display: flex;
    align-items: center;
    gap: 28px;
    flex-wrap: wrap;
  }
  .chart {
    position: relative;
    flex-shrink: 0;
  }
  svg {
    display: block;
    overflow: visible;
  }
  .slice {
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .slice path,
  .slice circle {
    stroke: var(--surface);
    stroke-width: 2;
    stroke-linejoin: round;
  }
  .slice.hot path,
  .slice.hot circle {
    filter: brightness(1.1);
  }
  .slice.dim,
  .row.dim {
    opacity: 0.35;
  }
  .tip {
    position: absolute;
    transform: translate(-50%, calc(-100% - 12px));
    pointer-events: none;
    background: var(--surface);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-lg);
    border-radius: var(--radius);
    padding: 6px 10px;
    font-size: 0.8rem;
    white-space: nowrap;
    display: flex;
    flex-direction: column;
    z-index: 5;
  }
  .tip span {
    color: var(--muted);
  }
  .legend {
    list-style: none;
    margin: 0;
    padding: 0;
    flex: 1;
    min-width: 220px;
    max-width: 420px;
  }
  .row {
    all: unset;
    box-sizing: border-box;
    display: grid;
    grid-template-columns: 12px 1fr auto 44px;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 6px 8px;
    border-radius: var(--radius);
    cursor: pointer;
    font-size: 0.875rem;
    transition: opacity 0.15s;
  }
  .row:hover,
  .row.hot {
    background: var(--surface-2);
  }
  .row:focus-visible {
    outline: 2px solid var(--accent);
  }
  .row[aria-pressed='true'] {
    font-weight: 600;
  }
  .swatch {
    width: 12px;
    height: 12px;
    border-radius: 3px;
  }
  .swatch.hatch {
    background: repeating-linear-gradient(
      45deg,
      var(--series-other) 0 2px,
      var(--surface-2) 2px 4px
    );
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .count,
  .pct {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .pct {
    color: var(--muted);
  }
  .hint-line {
    margin: 12px 0 0;
    font-size: 0.8rem;
    color: var(--muted);
  }
</style>
