"use strict";

/**
 * Ελαφριά, χωρίς εξωτερική βιβλιοθήκη, SVG charts. Τα χρώματα διαβάζονται
 * από CSS custom properties (--chart-series-N κ.λπ.) μέσω inline style, ώστε
 * να ακολουθούν αυτόματα light/dark mode χωρίς re-render στο theme toggle.
 */

const SERIES_VARS = [
  "--chart-series-1",
  "--chart-series-2",
  "--chart-series-3",
  "--chart-series-4",
  "--chart-series-5",
  "--chart-series-6",
  "--chart-series-7",
  "--chart-series-8"
];

export function seriesColorVar(index) {
  return `var(${SERIES_VARS[index % SERIES_VARS.length]})`;
}

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);

  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "style") {
      el.setAttribute("style", value);
    } else {
      el.setAttribute(key, value);
    }
  });

  return el;
}

let tooltipEl = null;

function getTooltip() {
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.className = "chart-tooltip";
    tooltipEl.hidden = true;
    document.body.append(tooltipEl);
  }

  return tooltipEl;
}

function showTooltip(event, lines) {
  const tooltip = getTooltip();
  tooltip.innerHTML = "";

  lines.forEach((line) => {
    const row = document.createElement("div");
    row.className = "chart-tooltip-row";
    row.textContent = line;
    tooltip.append(row);
  });

  tooltip.hidden = false;
  positionTooltip(event);
}

function positionTooltip(event) {
  const tooltip = getTooltip();
  const padding = 14;
  let left = event.clientX + padding;
  let top = event.clientY + padding;

  const rect = tooltip.getBoundingClientRect();

  if (left + rect.width > window.innerWidth - 8) {
    left = event.clientX - rect.width - padding;
  }

  if (top + rect.height > window.innerHeight - 8) {
    top = event.clientY - rect.height - padding;
  }

  tooltip.style.left = `${Math.max(8, left)}px`;
  tooltip.style.top = `${Math.max(8, top)}px`;
}

function hideTooltip() {
  if (tooltipEl) {
    tooltipEl.hidden = true;
  }
}

function attachTooltipHandlers(el, lines) {
  el.addEventListener("mouseenter", (event) => showTooltip(event, lines));
  el.addEventListener("mousemove", positionTooltip);
  el.addEventListener("mouseleave", hideTooltip);
  el.addEventListener("focus", (event) => {
    const rect = el.getBoundingClientRect();
    showTooltip({ clientX: rect.left + rect.width / 2, clientY: rect.top }, lines);
  });
  el.addEventListener("blur", hideTooltip);
  el.setAttribute("tabindex", "0");
  el.setAttribute("aria-label", lines.join(", "));
}

function emptyState(container, message) {
  container.innerHTML = "";
  const empty = document.createElement("p");
  empty.className = "chart-empty";
  empty.textContent = message || "Δεν υπάρχουν δεδομένα ακόμα.";
  container.append(empty);
}

/* =========================
   Bar chart (κάθετες στήλες)
========================= */

export function renderBarChart(container, { labels, values, colors, formatValue, emptyMessage }) {
  container.innerHTML = "";

  if (!values.length || values.every((value) => !value)) {
    emptyState(container, emptyMessage);
    return;
  }

  const width = 560;
  const height = 220;
  const paddingLeft = 34;
  const paddingBottom = 28;
  const paddingTop = 16;
  const plotWidth = width - paddingLeft - 12;
  const plotHeight = height - paddingBottom - paddingTop;

  const maxValue = Math.max(...values, 1);
  const niceMax = maxValue <= 1 ? 1 : Math.ceil(maxValue * 1.15);

  const svg = svgEl("svg", {
    viewBox: `0 0 ${width} ${height}`,
    class: "chart-svg",
    role: "img",
    "aria-label": "Bar chart"
  });

  [0, 0.5, 1].forEach((fraction) => {
    const y = paddingTop + plotHeight * (1 - fraction);

    svg.append(
      svgEl("line", {
        x1: paddingLeft,
        x2: width - 8,
        y1: y,
        y2: y,
        class: "chart-gridline"
      })
    );

    const label = svgEl("text", { x: paddingLeft - 8, y: y + 4, class: "chart-axis-label", "text-anchor": "end" });
    label.textContent = formatValue ? formatValue(niceMax * fraction) : String(Math.round(niceMax * fraction));
    svg.append(label);
  });

  const bandWidth = plotWidth / values.length;
  const barWidth = Math.min(24, bandWidth * 0.55);

  values.forEach((value, index) => {
    const bandCenter = paddingLeft + bandWidth * index + bandWidth / 2;
    const barHeight = Math.max(2, (value / niceMax) * plotHeight);
    const y = paddingTop + plotHeight - barHeight;
    const color = colors ? colors[index % colors.length] : seriesColorVar(0);

    const rect = svgEl("rect", {
      x: bandCenter - barWidth / 2,
      y,
      width: barWidth,
      height: barHeight,
      rx: 4,
      class: "chart-bar",
      style: `fill:${color}`
    });

    attachTooltipHandlers(rect, [`${labels[index]}: ${formatValue ? formatValue(value) : value}`]);
    svg.append(rect);

    const labelEl = svgEl("text", {
      x: bandCenter,
      y: height - 8,
      class: "chart-axis-label",
      "text-anchor": "middle"
    });
    labelEl.textContent = labels[index];
    svg.append(labelEl);
  });

  container.append(svg);
}

/* =========================
   Line chart (μία σειρά + area wash)
========================= */

export function renderLineChart(container, { labels, values, color, formatValue, emptyMessage }) {
  container.innerHTML = "";

  if (!values.length) {
    emptyState(container, emptyMessage);
    return;
  }

  const width = 560;
  const height = 220;
  const paddingLeft = 34;
  const paddingBottom = 28;
  const paddingTop = 16;
  const plotWidth = width - paddingLeft - 12;
  const plotHeight = height - paddingBottom - paddingTop;

  const maxValue = Math.max(...values, 1);
  const niceMax = maxValue <= 1 ? 1 : Math.ceil(maxValue * 1.15);
  const seriesColor = color || seriesColorVar(0);

  const svg = svgEl("svg", {
    viewBox: `0 0 ${width} ${height}`,
    class: "chart-svg",
    role: "img",
    "aria-label": "Line chart"
  });

  [0, 0.5, 1].forEach((fraction) => {
    const y = paddingTop + plotHeight * (1 - fraction);

    svg.append(
      svgEl("line", { x1: paddingLeft, x2: width - 8, y1: y, y2: y, class: "chart-gridline" })
    );

    const label = svgEl("text", { x: paddingLeft - 8, y: y + 4, class: "chart-axis-label", "text-anchor": "end" });
    label.textContent = formatValue ? formatValue(niceMax * fraction) : String(Math.round(niceMax * fraction));
    svg.append(label);
  });

  const stepX = values.length > 1 ? plotWidth / (values.length - 1) : 0;

  const points = values.map((value, index) => ({
    x: paddingLeft + stepX * index,
    y: paddingTop + plotHeight - (value / niceMax) * plotHeight,
    value
  }));

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");

  const areaPath =
    `M${points[0].x},${paddingTop + plotHeight} ` +
    points.map((point) => `L${point.x},${point.y}`).join(" ") +
    ` L${points[points.length - 1].x},${paddingTop + plotHeight} Z`;

  svg.append(svgEl("path", { d: areaPath, class: "chart-area", style: `fill:${seriesColor}` }));
  svg.append(svgEl("path", { d: linePath, class: "chart-line", style: `stroke:${seriesColor}` }));

  points.forEach((point, index) => {
    const dot = svgEl("circle", {
      cx: point.x,
      cy: point.y,
      r: 4,
      class: "chart-dot",
      style: `fill:${seriesColor}`
    });

    attachTooltipHandlers(dot, [`${labels[index]}: ${formatValue ? formatValue(point.value) : point.value}`]);
    svg.append(dot);

    if (index === 0 || index === points.length - 1 || index % Math.ceil(points.length / 6) === 0) {
      const labelEl = svgEl("text", {
        x: point.x,
        y: height - 8,
        class: "chart-axis-label",
        "text-anchor": "middle"
      });
      labelEl.textContent = labels[index];
      svg.append(labelEl);
    }
  });

  container.append(svg);
}

/* =========================
   Donut chart (κατηγορίες = identity)
========================= */

export function renderDonutChart(container, { segments, formatValue, emptyMessage }) {
  container.innerHTML = "";

  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  if (!total) {
    emptyState(container, emptyMessage);
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "chart-donut-wrapper";

  const size = 180;
  const radius = 70;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius;

  const svg = svgEl("svg", {
    viewBox: `0 0 ${size} ${size}`,
    class: "chart-svg chart-donut",
    role: "img",
    "aria-label": "Donut chart"
  });

  let offset = 0;

  segments.forEach((segment, index) => {
    const fraction = segment.value / total;
    const dash = Math.max(0, fraction * circumference - 2);
    const gap = circumference - dash;
    const color = segment.color || seriesColorVar(index);

    const circle = svgEl("circle", {
      cx: size / 2,
      cy: size / 2,
      r: radius,
      fill: "none",
      style: `stroke:${color}`,
      "stroke-width": strokeWidth,
      "stroke-dasharray": `${dash} ${gap}`,
      "stroke-dashoffset": -offset,
      class: "chart-donut-segment",
      transform: `rotate(-90 ${size / 2} ${size / 2})`
    });

    attachTooltipHandlers(circle, [
      `${segment.label}: ${formatValue ? formatValue(segment.value) : segment.value} (${Math.round(fraction * 100)}%)`
    ]);

    svg.append(circle);
    offset += fraction * circumference;
  });

  const centerLabel = svgEl("text", {
    x: size / 2,
    y: size / 2 - 4,
    class: "chart-donut-total",
    "text-anchor": "middle"
  });
  centerLabel.textContent = formatValue ? formatValue(total) : String(total);

  const centerSub = svgEl("text", {
    x: size / 2,
    y: size / 2 + 16,
    class: "chart-donut-total-label",
    "text-anchor": "middle"
  });
  centerSub.textContent = "σύνολο";

  svg.append(centerLabel, centerSub);
  wrapper.append(svg);

  const legend = document.createElement("ul");
  legend.className = "chart-legend";

  segments.forEach((segment, index) => {
    const item = document.createElement("li");
    item.className = "chart-legend-item";

    const swatch = document.createElement("span");
    swatch.className = "chart-legend-swatch";
    swatch.style.background = segment.color || seriesColorVar(index);

    const label = document.createElement("span");
    label.textContent = `${segment.label} · ${formatValue ? formatValue(segment.value) : segment.value}`;

    item.append(swatch, label);
    legend.append(item);
  });

  wrapper.append(legend);
  container.append(wrapper);
}

/* =========================
   Heatmap (GitHub-style, sequential μία απόχρωση)
========================= */

export function renderHeatmap(container, { cells, formatValue, emptyMessage }) {
  container.innerHTML = "";

  if (!cells.length) {
    emptyState(container, emptyMessage);
    return;
  }

  const maxValue = Math.max(...cells.map((cell) => cell.value), 1);

  const weeks = [];
  let currentWeek = [];

  cells.forEach((cell, index) => {
    currentWeek.push(cell);

    if (currentWeek.length === 7 || index === cells.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const cellSize = 13;
  const gap = 3;
  const width = weeks.length * (cellSize + gap);
  const height = 7 * (cellSize + gap);

  const svg = svgEl("svg", {
    viewBox: `0 0 ${width} ${height}`,
    class: "chart-svg chart-heatmap",
    role: "img",
    "aria-label": "Activity heatmap"
  });

  weeks.forEach((week, weekIndex) => {
    week.forEach((cell, dayIndex) => {
      const intensity = cell.value <= 0 ? 0 : Math.min(1, cell.value / maxValue);
      const step = intensity === 0 ? 0 : Math.max(1, Math.ceil(intensity * 4));

      const rect = svgEl("rect", {
        x: weekIndex * (cellSize + gap),
        y: dayIndex * (cellSize + gap),
        width: cellSize,
        height: cellSize,
        rx: 3,
        class: `chart-heatmap-cell chart-heatmap-step-${step}`
      });

      attachTooltipHandlers(rect, [
        `${cell.label}: ${formatValue ? formatValue(cell.value) : cell.value}`
      ]);

      svg.append(rect);
    });
  });

  container.append(svg);
}

/* =========================
   Sparkline (μικρό trend σε KPI κάρτες)
========================= */

export function renderSparkline(container, values, color) {
  container.innerHTML = "";

  if (!values.length) {
    return;
  }

  const width = 100;
  const height = 28;
  const maxValue = Math.max(...values, 1);
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;

  const points = values.map((value, index) => ({
    x: index * stepX,
    y: height - (value / maxValue) * (height - 4) - 2
  }));

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");

  const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, class: "chart-sparkline" });
  svg.append(svgEl("path", { d: linePath, class: "chart-sparkline-path", style: `stroke:${color || seriesColorVar(0)}` }));

  const last = points[points.length - 1];
  svg.append(svgEl("circle", { cx: last.x, cy: last.y, r: 2.5, style: `fill:${color || seriesColorVar(0)}` }));

  container.append(svg);
}
