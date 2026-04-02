/* ═════════════════════════════════════
   radar-chart.js · 纯 SVG 五边形雷达图
═════════════════════════════════════ */

const RadarChart = (() => {

  const LABELS = ['A', 'B', 'C', 'D', 'E'];
  const COLORS  = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626'];
  const DIM_NAMES = ['视觉层级', '色彩美学', '版式规范', '品牌一致', '可访问性'];

  /**
   * draw(svgEl, scores, size)
   * scores: { A, B, C, D, E } 均为 1-10 的数字
   * size: SVG 宽高（正方形）
   */
  function draw(svgEl, scores, size = 220) {
    if (!svgEl) return;
    svgEl.innerHTML = '';
    svgEl.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svgEl.setAttribute('width', size);
    svgEl.setAttribute('height', size);

    const cx = size / 2;
    const cy = size / 2;
    const R  = size * 0.35;  // 外圈半径
    const N  = 5;

    // 各顶点角度（从正上方开始，顺时针）
    const angles = Array.from({ length: N }, (_, i) =>
      (i * 2 * Math.PI / N) - Math.PI / 2
    );

    const pt = (r, i) => ({
      x: cx + r * Math.cos(angles[i]),
      y: cy + r * Math.sin(angles[i])
    });

    const ns = 'http://www.w3.org/2000/svg';

    // ── 背景辅助线（5级）
    const defs = document.createElementNS(ns, 'defs');
    const grad = document.createElementNS(ns, 'radialGradient');
    grad.setAttribute('id', `rg_${size}`);
    const s1 = document.createElementNS(ns, 'stop');
    s1.setAttribute('offset', '0%'); s1.setAttribute('stop-color', '#EFF6FF'); s1.setAttribute('stop-opacity', '0.9');
    const s2 = document.createElementNS(ns, 'stop');
    s2.setAttribute('offset', '100%'); s2.setAttribute('stop-color', '#DBEAFE'); s2.setAttribute('stop-opacity', '0.3');
    grad.appendChild(s1); grad.appendChild(s2);
    defs.appendChild(grad);
    svgEl.appendChild(defs);

    for (let level = 1; level <= 5; level++) {
      const r = R * level / 5;
      const pts = angles.map((_, i) => {
        const p = pt(r, i);
        return `${p.x},${p.y}`;
      }).join(' ');
      const poly = document.createElementNS(ns, 'polygon');
      poly.setAttribute('points', pts);
      poly.setAttribute('fill', level === 5 ? `url(#rg_${size})` : 'none');
      poly.setAttribute('stroke', '#E2E8F0');
      poly.setAttribute('stroke-width', level === 5 ? '1.5' : '0.8');
      poly.setAttribute('opacity', level === 5 ? '1' : '0.8');
      svgEl.appendChild(poly);
    }

    // ── 轴线
    angles.forEach((_, i) => {
      const outer = pt(R, i);
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', cx); line.setAttribute('y1', cy);
      line.setAttribute('x2', outer.x); line.setAttribute('y2', outer.y);
      line.setAttribute('stroke', '#CBD5E1');
      line.setAttribute('stroke-width', '0.8');
      svgEl.appendChild(line);
    });

    // ── 数据多边形
    const vals = LABELS.map(l => (parseFloat(scores[l]) || 0) / 10);  // 归一化
    const dataPoints = vals.map((v, i) => pt(R * v, i));
    const dataPts = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

    const dataArea = document.createElementNS(ns, 'polygon');
    dataArea.setAttribute('points', dataPts);
    dataArea.setAttribute('fill', 'rgba(37,99,235,0.15)');
    dataArea.setAttribute('stroke', '#2563EB');
    dataArea.setAttribute('stroke-width', '2');
    dataArea.setAttribute('stroke-linejoin', 'round');
    svgEl.appendChild(dataArea);

    // ── 数据点
    dataPoints.forEach((p, i) => {
      const circle = document.createElementNS(ns, 'circle');
      circle.setAttribute('cx', p.x);
      circle.setAttribute('cy', p.y);
      circle.setAttribute('r', '4');
      circle.setAttribute('fill', COLORS[i]);
      circle.setAttribute('stroke', 'white');
      circle.setAttribute('stroke-width', '1.5');
      svgEl.appendChild(circle);
    });

    // ── 标签（在外圈顶点外侧）
    const labelOffset = 20;
    angles.forEach((_, i) => {
      const outer = pt(R + labelOffset, i);
      const text = document.createElementNS(ns, 'text');
      text.setAttribute('x', outer.x);
      text.setAttribute('y', outer.y);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('font-size', '11');
      text.setAttribute('font-weight', '700');
      text.setAttribute('fill', COLORS[i]);
      text.setAttribute('font-family', '-apple-system,BlinkMacSystemFont,sans-serif');
      text.textContent = LABELS[i];
      svgEl.appendChild(text);

      // 分数
      const scoreText = document.createElementNS(ns, 'text');
      const sp = pt(R + labelOffset + 12, i);
      scoreText.setAttribute('x', sp.x);
      scoreText.setAttribute('y', sp.y);
      scoreText.setAttribute('text-anchor', 'middle');
      scoreText.setAttribute('dominant-baseline', 'middle');
      scoreText.setAttribute('font-size', '9');
      scoreText.setAttribute('fill', '#94A3B8');
      scoreText.setAttribute('font-family', '-apple-system,BlinkMacSystemFont,sans-serif');
      scoreText.textContent = (parseFloat(scores[LABELS[i]]) || 0).toFixed(1);
      svgEl.appendChild(scoreText);
    });
  }

  return { draw };
})();
