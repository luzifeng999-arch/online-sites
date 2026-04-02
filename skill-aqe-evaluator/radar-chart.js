/* ═══════════════════════════════════════════
   radar-chart.js · 纯 SVG 雷达图
═══════════════════════════════════════════ */

const RadarChart = (() => {
  const DIMS = [
    { key: 'A', label: 'A·视觉层级', color: '#2563EB' },
    { key: 'B', label: 'B·色彩美学', color: '#7C3AED' },
    { key: 'C', label: 'C·版式规范', color: '#059669' },
    { key: 'D', label: 'D·品牌一致', color: '#D97706' },
    { key: 'E', label: 'E·可访问性', color: '#DC2626' },
  ];

  /**
   * 绘制雷达图
   * @param {SVGElement} svgEl  - 目标 SVG 元素
   * @param {Object} scores     - { A, B, C, D, E } 每项 1-10
   * @param {number} size       - SVG 宽高
   */
  function draw(svgEl, scores, size = 240) {
    svgEl.innerHTML = '';
    svgEl.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svgEl.setAttribute('width', size);
    svgEl.setAttribute('height', size);

    const cx = size / 2;
    const cy = size / 2;
    const maxR = size * 0.38;
    const n = DIMS.length;
    const levels = 5; // 同心多边形层数

    // 计算各顶点角度（从顶部顺时针）
    const angle = i => (i * 2 * Math.PI / n) - Math.PI / 2;
    const point = (r, i) => ({
      x: cx + r * Math.cos(angle(i)),
      y: cy + r * Math.sin(angle(i))
    });
    const pointStr = pts => pts.map(p => `${p.x},${p.y}`).join(' ');

    // ── 画背景同心多边形 ──
    for (let l = levels; l >= 1; l--) {
      const r = (l / levels) * maxR;
      const pts = DIMS.map((_, i) => point(r, i));
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', pointStr(pts));
      poly.setAttribute('fill', l % 2 === 0 ? '#F8FAFC' : '#FFFFFF');
      poly.setAttribute('stroke', '#E2E8F0');
      poly.setAttribute('stroke-width', '1');
      svgEl.appendChild(poly);
    }

    // ── 画轴线 ──
    DIMS.forEach((_, i) => {
      const p = point(maxR, i);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', cx);
      line.setAttribute('y1', cy);
      line.setAttribute('x2', p.x);
      line.setAttribute('y2', p.y);
      line.setAttribute('stroke', '#E2E8F0');
      line.setAttribute('stroke-width', '1');
      svgEl.appendChild(line);
    });

    // ── 画数据区域 ──
    const dataPoints = DIMS.map((d, i) => {
      const val = Math.max(0, Math.min(10, scores[d.key] || 0));
      const r = (val / 10) * maxR;
      return point(r, i);
    });

    // 填充区域（用主色）
    const area = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    area.setAttribute('points', pointStr(dataPoints));
    area.setAttribute('fill', '#2563EB');
    area.setAttribute('fill-opacity', '0.15');
    area.setAttribute('stroke', '#2563EB');
    area.setAttribute('stroke-width', '2');
    area.setAttribute('stroke-linejoin', 'round');
    svgEl.appendChild(area);

    // 数据点（彩色）
    dataPoints.forEach((p, i) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', p.x);
      circle.setAttribute('cy', p.y);
      circle.setAttribute('r', '4');
      circle.setAttribute('fill', DIMS[i].color);
      circle.setAttribute('stroke', 'white');
      circle.setAttribute('stroke-width', '2');
      svgEl.appendChild(circle);
    });

    // ── 标签 ──
    DIMS.forEach((d, i) => {
      const labelR = maxR + 22;
      const p = point(labelR, i);
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', p.x);
      text.setAttribute('y', p.y);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('fill', d.color);
      text.setAttribute('font-size', '10');
      text.setAttribute('font-weight', '700');
      text.setAttribute('font-family', '-apple-system, sans-serif');
      text.textContent = d.label;
      svgEl.appendChild(text);

      // 分值标签
      const val = scores[d.key] || 0;
      const vp = point(maxR * (val / 10) + 12, i);
      const vText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      vText.setAttribute('x', vp.x);
      vText.setAttribute('y', vp.y);
      vText.setAttribute('text-anchor', 'middle');
      vText.setAttribute('dominant-baseline', 'middle');
      vText.setAttribute('fill', d.color);
      vText.setAttribute('font-size', '9');
      vText.setAttribute('font-weight', '800');
      vText.setAttribute('font-family', '-apple-system, sans-serif');
      vText.textContent = val.toFixed(1);
      svgEl.appendChild(vText);
    });

    // ── 刻度数字（1,5,10）──
    [1, 5, 10].forEach(v => {
      const r = (v / 10) * maxR;
      const tp = point(r, 0); // 顶部轴上
      const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lbl.setAttribute('x', cx + 4);
      lbl.setAttribute('y', cy - r + 3);
      lbl.setAttribute('fill', '#94A3B8');
      lbl.setAttribute('font-size', '8');
      lbl.setAttribute('font-family', '-apple-system, sans-serif');
      lbl.textContent = v;
      svgEl.appendChild(lbl);
    });
  }

  /**
   * 绘制趋势折线图
   * @param {SVGElement} svgEl
   * @param {Array} trend - [{date, score, verdict, name}]
   */
  function drawTrend(svgEl, trend) {
    svgEl.innerHTML = '';
    if (!trend || trend.length < 2) {
      return false;
    }

    const W = svgEl.parentElement?.clientWidth || 700;
    const H = 160;
    const padL = 40, padR = 20, padT = 20, padB = 30;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svgEl.setAttribute('width', '100%');
    svgEl.setAttribute('height', H);

    const scores = trend.map(t => t.score || 0);
    const minScore = Math.max(0, Math.min(...scores) - 0.5);
    const maxScore = Math.min(10, Math.max(...scores) + 0.5);
    const yScale = v => padT + chartH - ((v - minScore) / (maxScore - minScore)) * chartH;
    const xScale = i => padL + (i / (trend.length - 1)) * chartW;

    // 参考线：7.5（PASS线）
    const passY = yScale(7.5);
    if (passY >= padT && passY <= padT + chartH) {
      const refLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      refLine.setAttribute('x1', padL);
      refLine.setAttribute('y1', passY);
      refLine.setAttribute('x2', padL + chartW);
      refLine.setAttribute('y2', passY);
      refLine.setAttribute('stroke', '#16A34A');
      refLine.setAttribute('stroke-width', '1');
      refLine.setAttribute('stroke-dasharray', '4,3');
      refLine.setAttribute('opacity', '0.5');
      svgEl.appendChild(refLine);

      const refLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      refLabel.setAttribute('x', padL - 4);
      refLabel.setAttribute('y', passY + 1);
      refLabel.setAttribute('text-anchor', 'end');
      refLabel.setAttribute('dominant-baseline', 'middle');
      refLabel.setAttribute('fill', '#16A34A');
      refLabel.setAttribute('font-size', '9');
      refLabel.textContent = '7.5';
      svgEl.appendChild(refLabel);
    }

    // Y轴刻度
    [0, 5, 10].forEach(v => {
      const y = yScale(v);
      if (y < padT || y > padT + chartH) return;
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', padL - 6);
      label.setAttribute('y', y);
      label.setAttribute('text-anchor', 'end');
      label.setAttribute('dominant-baseline', 'middle');
      label.setAttribute('fill', '#94A3B8');
      label.setAttribute('font-size', '9');
      label.textContent = v;
      svgEl.appendChild(label);
    });

    // 折线路径
    const pathD = trend.map((t, i) => {
      const x = xScale(i);
      const y = yScale(t.score || 0);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    // 填充区域
    const fillD = pathD + ` L ${xScale(trend.length-1)} ${padT+chartH} L ${xScale(0)} ${padT+chartH} Z`;
    const fill = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    fill.setAttribute('d', fillD);
    fill.setAttribute('fill', '#2563EB');
    fill.setAttribute('fill-opacity', '0.08');
    svgEl.appendChild(fill);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#2563EB');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-linecap', 'round');
    svgEl.appendChild(path);

    // 数据点
    trend.forEach((t, i) => {
      const x = xScale(i);
      const y = yScale(t.score || 0);
      const verdictColors = { PASS: '#16A34A', WATCH: '#D97706', FAIL: '#DC2626', BLOCK: '#7C3AED' };
      const color = verdictColors[t.verdict] || '#2563EB';

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', y);
      circle.setAttribute('r', '4');
      circle.setAttribute('fill', color);
      circle.setAttribute('stroke', 'white');
      circle.setAttribute('stroke-width', '2');
      svgEl.appendChild(circle);

      // X轴标签（日期，每隔几个显示）
      if (i === 0 || i === trend.length - 1 || trend.length <= 6) {
        const dateStr = t.date ? t.date.split('T')[0].slice(5) : '';
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', x);
        label.setAttribute('y', padT + chartH + 14);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('fill', '#94A3B8');
        label.setAttribute('font-size', '9');
        label.textContent = dateStr;
        svgEl.appendChild(label);
      }
    });

    return true;
  }

  return { draw, drawTrend, DIMS };
})();
