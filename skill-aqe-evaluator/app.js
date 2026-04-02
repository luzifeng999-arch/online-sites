/* ═══════════════════════════════════════════
   app.js · 自动化流水线主控
   流程：上传 → 解析 → AI 评测 → 报告
═══════════════════════════════════════════ */

/* ── 状态 ── */
let currentFiles = [];
let currentResult = null;
let cancelFlag = false;

/* ── 工具 ── */
function formatBytes(b) {
  if (!b) return '0B';
  if (b < 1024) return b + 'B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + 'KB';
  return (b / 1024 / 1024).toFixed(1) + 'MB';
}

function esc(str) {
  return String(str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ── 视图切换 ── */
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

/* ── 步骤动画 ── */
function setStep(stepId, state) {
  // state: 'active' | 'done' | 'error' | ''
  const el = document.getElementById(stepId);
  if (!el) return;
  el.className = 'pipe-step ' + state;
}

function setStepDesc(stepId, text) {
  const el = document.getElementById(stepId + 'Desc');
  if (el) el.textContent = text;
}

/* ═══════════════════════════════════════════
   文件读取
═══════════════════════════════════════════ */
async function readAsText(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result || '');
    reader.onerror = () => resolve('');
    reader.readAsText(file, 'UTF-8');
  });
}

function inferDirection(files) {
  const names = files.map(f => (f.name + (f.webkitRelativePath || '')).toLowerCase()).join(' ');
  const ext   = files.map(f => f.name.split('.').pop().toLowerCase());

  const htmlCount = ext.filter(e => e === 'html').length;
  const imgCount  = ext.filter(e => ['png','jpg','jpeg','svg','webp'].includes(e)).length;
  const vidCount  = ext.filter(e => ['mp4','webm','lottie','json'].includes(e)).length;

  const score = {
    ui: 0, img: 0, video: 0, doc: 0, eval: 0
  };

  if (htmlCount > 0) score.ui += htmlCount * 3;
  if (names.includes('component') || names.includes('dashboard') || names.includes('layout')) score.ui += 5;
  if (names.includes('react') || names.includes('vue') || names.includes('tailwind')) score.ui += 3;
  if (imgCount > 0) score.img += imgCount;
  if (names.includes('illustration') || names.includes('poster') || names.includes('banner')) score.img += 4;
  if (vidCount > 0) score.video += vidCount * 2;
  if (names.includes('animation') || names.includes('motion') || names.includes('lottie')) score.video += 4;
  if (names.includes('ppt') || names.includes('slide') || names.includes('presentation')) score.doc += 6;
  if (ext.includes('pptx') || ext.includes('pdf')) score.doc += 6;
  if (names.includes('eval') || names.includes('judge') || names.includes('score')) score.eval += 6;

  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : 'ui';
}

/* ═══════════════════════════════════════════
   核心：自动化评测流水线
═══════════════════════════════════════════ */
async function runPipeline(files) {
  cancelFlag = false;
  showView('viewRunning');

  /* 更新标题 */
  const nameEl = document.getElementById('fpName');
  const metaEl = document.getElementById('fpMeta');
  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const skillGuess = guessSkillName(files);
  if (nameEl) nameEl.textContent = skillGuess;
  if (metaEl) metaEl.textContent = `${files.length} 个文件 · ${formatBytes(totalSize)}`;

  /* ─── STEP 1: 解析文件结构 ─── */
  setStep('step1', 'active');
  setStepDesc('step1', '扫描文件类型与结构…');
  await delay(400);

  if (cancelFlag) return resetToUpload();

  const extMap = {};
  files.forEach(f => {
    const ext = f.name.split('.').pop().toLowerCase();
    extMap[ext] = (extMap[ext] || 0) + 1;
  });
  const fileList = files.map(f => ({ name: f.name, sizeStr: formatBytes(f.size) }));
  setStepDesc('step1', `识别到 ${Object.keys(extMap).map(e => `.${e} ×${extMap[e]}`).join(' · ')}`);
  setStep('step1', 'done');

  /* ─── STEP 2: 推断方向 ─── */
  setStep('step2', 'active');
  setStepDesc('step2', '分析文件特征…');
  await delay(300);

  if (cancelFlag) return resetToUpload();

  const direction = inferDirection(files);
  const dirNames = { ui:'UI生成', img:'图片生成', video:'视频动效', doc:'文档/PPT', eval:'评测' };
  setStepDesc('step2', `推断方向：${dirNames[direction] || direction}`);
  setStep('step2', 'done');

  /* ─── STEP 3: 读取核心内容 ─── */
  setStep('step3', 'active');
  setStepDesc('step3', '提取主文件内容…');

  if (cancelFlag) return resetToUpload();

  // 找主 HTML 文件（选最大的）
  const htmlFiles = files
    .filter(f => f.name.toLowerCase().endsWith('.html'))
    .sort((a, b) => b.size - a.size);
  const cssFiles  = files.filter(f => f.name.toLowerCase().endsWith('.css')).sort((a,b) => b.size - a.size);
  const mdFiles   = files.filter(f => f.name.toLowerCase().endsWith('.md'));

  let htmlContent = '';
  let description = '';

  if (htmlFiles[0]) htmlContent = await readAsText(htmlFiles[0]);
  if (cssFiles[0]) {
    const css = await readAsText(cssFiles[0]);
    htmlContent += '\n\n/* CSS */\n' + css;
  }
  if (mdFiles[0]) description = await readAsText(mdFiles[0]);

  setStepDesc('step3', `已读取 ${Math.min(htmlContent.length, 6000)} 字符内容`);
  setStep('step3', 'done');

  /* ─── STEP 4: AI 评测 ─── */
  setStep('step4', 'active');
  setStepDesc('step4', '发送到 AI 分析中…');

  if (cancelFlag) return resetToUpload();

  // 检查是否在线
  const online = ApiService.getStatus() === 'online';

  let result;
  if (online) {
    const res = await ApiService.evaluate({
      direction,
      htmlContent,
      fileList,
      description: description || ''
    });

    if (!res.ok) {
      setStep('step4', 'error');
      setStepDesc('step4', 'AI 分析失败：' + (res.error || '未知错误'));
      await delay(1500);
      // 降级到手动模式
      showManualModal(direction, skillGuess, files);
      return;
    }

    result = res.data;
  } else {
    // 离线降级
    setStep('step4', 'error');
    setStepDesc('step4', '未连接内网，切换为手动评分');
    await delay(1000);
    showManualModal(direction, skillGuess, files);
    return;
  }

  setStepDesc('step4', `评测完成 · ${result.verdict} · 综合分 ${result.composite}`);
  setStep('step4', 'done');

  /* ─── STEP 5: 生成报告 ─── */
  setStep('step5', 'active');
  setStepDesc('step5', '渲染评测报告…');
  await delay(200);

  if (cancelFlag) return resetToUpload();

  // 补充 meta
  result._skillName = result.skillName || skillGuess;
  result._date = new Date().toLocaleString('zh-CN');
  result._id = Storage.genId();
  result._direction = direction;
  result._directionName = dirNames[direction] || direction;

  // 持久化
  Storage.save({
    id: result._id,
    skillName: result._skillName,
    date: result._date,
    direction,
    composite: result.composite,
    verdict: result.verdict,
    data: result
  });

  currentResult = result;

  setStep('step5', 'done');
  setStepDesc('step5', '报告已生成');

  await delay(400);
  renderReport(result);
}

/* ── 延迟 ── */
function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/* ── 猜测 Skill 名称 ── */
function guessSkillName(files) {
  // 从路径/文件名中猜
  if (files[0]?.webkitRelativePath) {
    const parts = files[0].webkitRelativePath.split('/');
    if (parts.length > 1) return parts[0];
  }
  // 找 SKILL.md 或 README.md
  const md = files.find(f => /skill\.md|readme\.md/i.test(f.name));
  if (md) return md.name.replace(/\.md$/i, '');
  // 用 HTML 文件名
  const html = files.find(f => f.name.endsWith('.html'));
  if (html) return html.name.replace('.html', '');
  return '未命名 Skill';
}

/* ── 重置到上传页 ── */
function resetToUpload() {
  currentFiles = [];
  cancelFlag = false;
  // 重置步骤状态
  ['step1','step2','step3','step4','step5'].forEach(s => setStep(s, ''));
  showView('viewUpload');
}

/* ═══════════════════════════════════════════
   报告渲染
═══════════════════════════════════════════ */
const DIM_COLORS = { A:'#2563EB', B:'#7C3AED', C:'#059669', D:'#D97706', E:'#DC2626' };
const DIM_NAMES  = {
  A: 'A · 视觉层级与信息架构',
  B: 'B · 色彩美学与情感调性',
  C: 'C · 版式规范与排版质量',
  D: 'D · 品牌一致性与风格稳定',
  E: 'E · 可访问性基线（强制）'
};
const VERDICT_CFG = {
  PASS:  { cls:'pass',  emoji:'✅', label:'PASS · 允许上线',     desc:'综合分 ≥ 7.5 且无维度 < 6.0，评测通过。' },
  WATCH: { cls:'watch', emoji:'👀', label:'WATCH · 有条件上线',   desc:'综合分 7.0–7.4，建议 2 周内完成修复后重测。' },
  FAIL:  { cls:'fail',  emoji:'❌', label:'FAIL · 打回修改',      desc:'综合分 < 7.0 或存在维度 < 6.0，需要修复。' },
  BLOCK: { cls:'block', emoji:'🚫', label:'BLOCK · 强制阻断',     desc:'可访问性（AQE-E）严重不达标，禁止上线。' },
};

function renderReport(r) {
  const vc = VERDICT_CFG[r.verdict] || VERDICT_CFG.FAIL;
  const s = r.scores || {};
  const dims = r.dimensions || {};
  const failures = r.failures || [];
  const strengths = r.strengths || [];

  /* 失分项 HTML */
  const failuresHtml = failures.length > 0
    ? `<div class="rpt-card" style="padding:0;overflow:hidden;margin-bottom:20px">
        <div style="padding:16px 20px;border-bottom:1px solid var(--border)">
          <div class="rpt-card-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            失分项 & 修复建议（${failures.length} 项）
          </div>
        </div>
        <div class="failures-list">
          ${failures.map(f => `
          <div class="failure-item ${f.isBlock ? 'is-block' : ''}">
            <div class="failure-dim-tag" style="background:${DIM_COLORS[f.dim?.replace('AQE-','')[0]] || '#64748B'}">
              ${esc(f.dim || 'AQE')}
            </div>
            <div class="failure-right">
              <div class="failure-title">
                ${f.isBlock ? '🚫 ' : f.severity === 'p0' ? '⚠️ ' : ''}${esc(f.title)}
                <span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;margin-left:6px;background:${f.severity==='block'||f.isBlock ? '#FEF2F2' : f.severity==='p0' ? '#FFFBEB' : '#F1F5F9'};color:${f.severity==='block'||f.isBlock ? '#DC2626' : f.severity==='p0' ? '#D97706' : '#64748B'}">${(f.severity || f.priority || 'P2').toUpperCase()}</span>
              </div>
              <div class="failure-suggestion">${esc(f.detail || f.problem || '')}</div>
              ${f.fix ? `<div style="margin-top:6px;font-size:12px;color:#2563EB;line-height:1.5">💡 ${esc(f.fix)}</div>` : ''}
            </div>
          </div>`).join('')}
        </div>
      </div>`
    : '';

  /* 维度分析列表 */
  const dimListHtml = ['A','B','C','D','E'].map(d => {
    const dim = dims[d] || {};
    const score = s[d] || 5;
    const isLow = score < 6.0;
    const isBlock = d === 'E' && (dim.blockFlag || score < 5.0);
    const pct = (score / 10) * 100;
    const issues = (dim.issues || []).filter(Boolean);
    return `
    <div class="dim-row">
      <div class="dim-badge" style="background:${DIM_COLORS[d]}">${d}</div>
      <div class="dim-info">
        <div class="dim-name" style="color:${isBlock ? 'var(--red)' : isLow ? 'var(--amber)' : 'inherit'}">
          ${DIM_NAMES[d]}${isBlock ? ' 🚫' : isLow ? ' ⚠️' : ''}
        </div>
        <div class="dim-bar-track">
          <div class="dim-bar-fill" style="width:${pct}%;background:${DIM_COLORS[d]}"></div>
        </div>
        ${dim.summary ? `<div class="dim-analysis">${esc(dim.summary)}</div>` : ''}
        ${issues.map(i => `<div style="font-size:11px;color:var(--red);margin-top:2px">• ${esc(i)}</div>`).join('')}
      </div>
      <div class="dim-score-val" style="color:${DIM_COLORS[d]}">${score.toFixed ? score.toFixed(1) : score}</div>
    </div>`;
  }).join('');

  /* 亮点 */
  const strengthsHtml = strengths.length
    ? `<div class="rpt-card" style="margin-bottom:20px">
        <div class="rpt-card-title">🌟 亮点</div>
        ${strengths.map(s => `<div style="font-size:13px;color:var(--text-2);padding:4px 0;line-height:1.5">✓ ${esc(s)}</div>`).join('')}
      </div>`
    : '';

  const reportHtml = `
    <!-- 英雄区 -->
    <div class="rpt-hero">
      <div class="rpt-meta-row">
        <div class="rpt-meta-item">
          <span class="rpt-meta-label">Skill 名称</span>
          <span class="rpt-meta-value">${esc(r._skillName || r.skillName || '未命名')}</span>
        </div>
        <div class="rpt-meta-item">
          <span class="rpt-meta-label">评测方向</span>
          <span class="rpt-meta-value">${esc(r._directionName || r.directionName || r.direction)}</span>
        </div>
        <div class="rpt-meta-item">
          <span class="rpt-meta-label">评测时间</span>
          <span class="rpt-meta-value">${esc(r._date || '—')}</span>
        </div>
        <div class="rpt-meta-item">
          <span class="rpt-meta-label">报告 ID</span>
          <span class="rpt-meta-value" style="font-family:var(--mono);font-size:11px">${esc(r._id || '—')}</span>
        </div>
      </div>
      <div class="rpt-score-row">
        <div class="rpt-score-num">${r.composite?.toFixed ? r.composite.toFixed(1) : r.composite || '—'}</div>
        <div class="rpt-verdict-wrap">
          <div class="rpt-verdict-badge ${vc.cls}">${vc.emoji} ${r.verdict}</div>
          <div class="rpt-verdict-desc">${vc.desc}</div>
          ${r.verdictReason ? `<div style="font-size:11px;opacity:.65;margin-top:4px">${esc(r.verdictReason)}</div>` : ''}
        </div>
      </div>
    </div>

    <!-- AI 总评 -->
    ${r.overall || r.summary ? `
    <div class="rpt-summary">
      <strong>AI 评价：</strong>${esc(r.overall || r.summary)}
    </div>` : ''}

    <!-- 雷达图 + 维度分 -->
    <div class="rpt-2col">
      <div class="rpt-card">
        <div class="rpt-card-title">AQE 五维雷达图</div>
        <div class="radar-card-inner">
          <svg id="reportRadarSvg" width="200" height="200"></svg>
        </div>
      </div>
      <div class="rpt-card">
        <div class="rpt-card-title">各维度详情</div>
        <div class="dim-list">${dimListHtml}</div>
      </div>
    </div>

    <!-- 失分项 -->
    ${failuresHtml}

    <!-- 亮点 -->
    ${strengthsHtml}

    <!-- 判定结论 -->
    <div class="verdict-card ${vc.cls}">
      <div class="verdict-emoji">${vc.emoji}</div>
      <div>
        <div class="verdict-text-title">${vc.label}</div>
        <div class="verdict-text-desc">${vc.desc}</div>
        ${r.onlineAdvice ? `<div style="margin-top:8px;font-size:12px;font-style:italic">${esc(r.onlineAdvice)}</div>` : ''}
      </div>
    </div>
  `;

  const bodyEl = document.getElementById('reportBody');
  if (bodyEl) bodyEl.innerHTML = reportHtml;

  showView('viewReport');

  /* 绘制雷达图 */
  requestAnimationFrame(() => {
    const svgEl = document.getElementById('reportRadarSvg');
    if (svgEl && typeof drawRadar === 'function') {
      drawRadar(svgEl, s, 200);
    }
  });
}

/* ═══════════════════════════════════════════
   手动评分弹窗（离线降级）
═══════════════════════════════════════════ */
function showManualModal(direction, skillName, files) {
  const modal = document.getElementById('manualModal');
  const body  = document.getElementById('manualScoreBody');
  if (!modal || !body) { showView('viewError'); return; }

  const dims = ['A','B','C','D','E'];
  const dimNames = {
    A: 'A · 视觉层级', B: 'B · 色彩美学',
    C: 'C · 版式规范', D: 'D · 品牌一致性', E: 'E · 可访问性'
  };

  body.innerHTML = dims.map(d => `
    <div style="margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <label style="font-size:13px;font-weight:600;color:${DIM_COLORS[d]}">${dimNames[d]}</label>
        <span style="font-size:18px;font-weight:800;color:${DIM_COLORS[d]}" id="mv_${d}">7.0</span>
      </div>
      <div style="position:relative;height:8px;background:#E2E8F0;border-radius:99px">
        <div style="position:absolute;left:0;top:0;bottom:0;width:60%;background:${DIM_COLORS[d]};border-radius:99px;transition:width .15s" id="mf_${d}"></div>
        <input type="range" min="1" max="10" step="0.5" value="7" style="position:absolute;inset:0;opacity:0;width:100%;cursor:pointer"
          oninput="document.getElementById('mv_${d}').textContent=parseFloat(this.value).toFixed(1);document.getElementById('mf_${d}').style.width=((this.value-1)/9*100)+'%'">
      </div>
    </div>`).join('');

  modal.classList.remove('hidden');

  document.getElementById('btnConfirmManual').onclick = () => {
    const scores = {};
    dims.forEach(d => {
      const input = body.querySelector(`input[oninput*="mv_${d}"]`);
      scores[d] = input ? parseFloat(input.value) : 7;
    });

    // 计算综合分
    const WEIGHTS = {
      ui:    {A:.30,B:.25,C:.25,D:.10,E:.10},
      img:   {A:.20,B:.45,C:.15,D:.10,E:.10},
      video: {A:.25,B:.30,C:.20,D:.15,E:.10},
      doc:   {A:.25,B:.15,C:.30,D:.15,E:.15},
      eval:  {A:.00,B:.30,C:.00,D:.40,E:.30},
    };
    const w = WEIGHTS[direction] || WEIGHTS.ui;
    let comp = 0;
    dims.forEach(d => { comp += scores[d] * (w[d] || 0); });
    scores.composite = Math.round(comp * 10) / 10;

    const hasBlock = scores.E < 5.0;
    const hasLow = dims.some(d => scores[d] < 6.0);
    let verdict = 'FAIL';
    if (hasBlock) verdict = 'BLOCK';
    else if (comp >= 7.5 && !hasLow) verdict = 'PASS';
    else if (comp >= 7.0) verdict = 'WATCH';

    const result = {
      skillName: skillName,
      direction,
      directionName: { ui:'UI生成',img:'图片生成',video:'视频动效',doc:'文档/PPT',eval:'评测' }[direction] || direction,
      scores,
      composite: scores.composite,
      verdict,
      verdictReason: '手动评分（离线模式）',
      dimensions: {},
      failures: [],
      strengths: [],
      overall: '（手动评分模式，未进行 AI 分析）',
      _skillName: skillName,
      _date: new Date().toLocaleString('zh-CN'),
      _id: Storage.genId(),
      _direction: direction,
      _directionName: { ui:'UI生成',img:'图片生成',video:'视频动效',doc:'文档/PPT',eval:'评测' }[direction] || direction,
    };

    modal.classList.add('hidden');
    Storage.save({ id:result._id, skillName, date:result._date, direction, composite:result.composite, verdict, data:result });
    currentResult = result;
    renderReport(result);
  };
}

/* ═══════════════════════════════════════════
   雷达图（内联 SVG）
═══════════════════════════════════════════ */
function drawRadar(svg, scores, size) {
  svg.innerHTML = '';
  const cx = size / 2, cy = size / 2;
  const maxR = size * 0.36;
  const n = 5;
  const angle = i => (i * 2 * Math.PI / n) - Math.PI / 2;
  const pt = (r, i) => ({ x: cx + r * Math.cos(angle(i)), y: cy + r * Math.sin(angle(i)) });
  const pts = arr => arr.map(p => `${p.x},${p.y}`).join(' ');
  const ns = 'http://www.w3.org/2000/svg';

  const dims = ['A','B','C','D','E'];

  // 背景网
  for (let l = 5; l >= 1; l--) {
    const r = (l / 5) * maxR;
    const poly = document.createElementNS(ns, 'polygon');
    poly.setAttribute('points', pts(dims.map((_, i) => pt(r, i))));
    poly.setAttribute('fill', l % 2 === 0 ? '#F8FAFC' : '#FFFFFF');
    poly.setAttribute('stroke', '#E2E8F0');
    poly.setAttribute('stroke-width', '1');
    svg.appendChild(poly);
  }

  // 轴线
  dims.forEach((_, i) => {
    const p = pt(maxR, i);
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', cx); line.setAttribute('y1', cy);
    line.setAttribute('x2', p.x); line.setAttribute('y2', p.y);
    line.setAttribute('stroke', '#E2E8F0'); line.setAttribute('stroke-width', '1');
    svg.appendChild(line);
  });

  // 数据区域
  const dataPoints = dims.map((d, i) => {
    const v = Math.max(0, Math.min(10, scores[d] || 0));
    return pt((v / 10) * maxR, i);
  });
  const area = document.createElementNS(ns, 'polygon');
  area.setAttribute('points', pts(dataPoints));
  area.setAttribute('fill', '#2563EB');
  area.setAttribute('fill-opacity', '0.15');
  area.setAttribute('stroke', '#2563EB');
  area.setAttribute('stroke-width', '2');
  area.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(area);

  // 数据点
  dataPoints.forEach((p, i) => {
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', p.x); c.setAttribute('cy', p.y);
    c.setAttribute('r', '4');
    c.setAttribute('fill', DIM_COLORS[dims[i]] || '#2563EB');
    c.setAttribute('stroke', 'white'); c.setAttribute('stroke-width', '2');
    svg.appendChild(c);
  });

  // 标签
  dims.forEach((d, i) => {
    const lp = pt(maxR + 20, i);
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', lp.x); text.setAttribute('y', lp.y);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('fill', DIM_COLORS[d]);
    text.setAttribute('font-size', '10');
    text.setAttribute('font-weight', '700');
    text.setAttribute('font-family', '-apple-system,sans-serif');
    text.textContent = d;
    svg.appendChild(text);
  });
}

/* ═══════════════════════════════════════════
   导出功能
═══════════════════════════════════════════ */
function exportMarkdown(r) {
  if (!r) return;
  const vc = VERDICT_CFG[r.verdict] || VERDICT_CFG.FAIL;
  const s = r.scores || {};
  const dims = r.dimensions || {};

  const md = `# Skill AQE 评测报告

## 基本信息

| 字段 | 值 |
|------|------|
| Skill 名称 | ${r._skillName || r.skillName || '未命名'} |
| 评测方向 | ${r._directionName || r.directionName || ''} |
| 评测时间 | ${r._date || ''} |
| 报告 ID | ${r._id || ''} |

## 综合评定

> **${vc.emoji} ${r.verdict}**  ${vc.desc}

**综合分：${r.composite?.toFixed ? r.composite.toFixed(1) : r.composite} / 10**

## AQE 五维评分

| 维度 | 得分 |
|------|------|
| A · 视觉层级与信息架构 | ${s.A?.toFixed ? s.A.toFixed(1) : s.A || '—'} |
| B · 色彩美学与情感调性 | ${s.B?.toFixed ? s.B.toFixed(1) : s.B || '—'} |
| C · 版式规范与排版质量 | ${s.C?.toFixed ? s.C.toFixed(1) : s.C || '—'} |
| D · 品牌一致性与风格稳定 | ${s.D?.toFixed ? s.D.toFixed(1) : s.D || '—'} |
| E · 可访问性基线（强制） | ${s.E?.toFixed ? s.E.toFixed(1) : s.E || '—'} |

## 维度分析

${['A','B','C','D','E'].map(d => {
  const dim = dims[d] || {};
  return `### AQE-${d}\n**得分**：${s[d]}\n\n${dim.summary || '（无分析）'}\n${dim.issues?.length ? '\n**问题**：\n' + dim.issues.map(i => `- ${i}`).join('\n') : ''}`;
}).join('\n\n')}

## 失分项 & 修复建议

${(r.failures || []).map(f => `### ${f.dim}: ${f.title}\n\n${f.detail || ''}\n\n**修复方案**：${f.fix || '—'}`).join('\n\n') || '无明显失分项'}

## 整体评价

${r.overall || r.summary || '（无 AI 评价）'}

---
*由 Skill AQE 评测平台自动生成 · ${r._date}*
`;

  const blob = new Blob([md], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `AQE_${r._skillName || 'report'}_${Date.now()}.md`;
  a.click();
}

function exportJson(r) {
  if (!r) return;
  const blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `AQE_${r._id || Date.now()}.json`;
  a.click();
}

/* ═══════════════════════════════════════════
   历史记录
═══════════════════════════════════════════ */
function renderHistory() {
  const records = Storage.getAll();
  const container = document.getElementById('drawerBody');
  if (!container) return;

  if (!records.length) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#94A3B8;font-size:13px">暂无历史记录</div>';
    return;
  }

  const vc2cls = { PASS:'pass', WATCH:'watch', FAIL:'fail', BLOCK:'block' };
  const vc2clr = { PASS:'#16A34A', WATCH:'#D97706', FAIL:'#DC2626', BLOCK:'#7C3AED' };

  container.innerHTML = records.map(r => `
    <div style="padding:14px 16px;border-bottom:1px solid #E2E8F0;cursor:pointer" onclick="loadHistoryRecord('${r.id}')">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:13px;font-weight:600;color:#0F172A">${esc(r.skillName || '未命名')}</span>
        <span style="font-size:12px;font-weight:700;color:${vc2clr[r.verdict] || '#94A3B8'}">${r.verdict || '—'}</span>
      </div>
      <div style="font-size:11px;color:#94A3B8;margin-top:3px">${esc(r.date || '')} · 综合分 ${r.composite?.toFixed ? r.composite.toFixed(1) : r.composite || '—'}</div>
    </div>
  `).join('');
}

function loadHistoryRecord(id) {
  const records = Storage.getAll();
  const rec = records.find(r => r.id === id);
  if (!rec?.data) return;
  currentResult = rec.data;
  closeDrawer();
  renderReport(rec.data);
}

function openDrawer() {
  renderHistory();
  document.getElementById('drawerOverlay').style.display = 'flex';
  document.getElementById('drawerOverlay').classList.add('active');
}

function closeDrawer() {
  const el = document.getElementById('drawerOverlay');
  el.style.display = 'none';
  el.classList.remove('active');
}

/* ═══════════════════════════════════════════
   错误视图
═══════════════════════════════════════════ */
function showError(title, desc) {
  document.getElementById('errorTitle').textContent = title || 'AI 分析失败';
  document.getElementById('errorDesc').textContent = desc || '请检查连接后重试';
  showView('viewError');
}

/* ═══════════════════════════════════════════
   初始化
═══════════════════════════════════════════ */
function handleFiles(files) {
  const arr = Array.from(files);
  if (!arr.length) return;
  currentFiles = arr;
  runPipeline(arr);
}

function initDragDrop() {
  const zone = document.getElementById('dropZone');
  if (!zone) return;

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('dragover');
  });

  zone.addEventListener('dragleave', e => {
    if (!zone.contains(e.relatedTarget)) zone.classList.remove('dragover');
  });

  zone.addEventListener('drop', async e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const items = e.dataTransfer.items;
    const files = [];

    if (items) {
      const promises = [];
      for (const item of items) {
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry?.();
          if (entry) promises.push(readEntry(entry, files));
          else { const f = item.getAsFile(); if (f) files.push(f); }
        }
      }
      await Promise.all(promises);
    } else {
      files.push(...Array.from(e.dataTransfer.files));
    }

    if (files.length) handleFiles(files);
  });
}

async function readEntry(entry, files) {
  if (entry.isFile) {
    await new Promise(res => entry.file(f => { files.push(f); res(); }, res));
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    await new Promise(res => {
      const batch = () => reader.readEntries(async entries => {
        if (!entries.length) { res(); return; }
        await Promise.all(entries.map(e => readEntry(e, files)));
        batch();
      }, res);
      batch();
    });
  }
}

function init() {
  /* 拖拽 */
  initDragDrop();

  /* 文件选择 */
  document.getElementById('btnPickFolder').addEventListener('click', () => {
    document.getElementById('folderInput').click();
  });
  document.getElementById('btnPickFiles').addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('fileInput').click();
  });
  document.getElementById('folderInput').addEventListener('change', e => handleFiles(e.target.files));
  document.getElementById('fileInput').addEventListener('change', e => handleFiles(e.target.files));

  /* 取消 */
  document.getElementById('btnCancel').addEventListener('click', resetToUpload);

  /* 重新评测 */
  document.getElementById('btnBack').addEventListener('click', resetToUpload);

  /* 导出 */
  document.getElementById('btnExportMd').addEventListener('click', () => exportMarkdown(currentResult));
  document.getElementById('btnExportJson').addEventListener('click', () => exportJson(currentResult));
  document.getElementById('btnPrint').addEventListener('click', () => window.print());

  /* 历史 */
  document.getElementById('btnHistory').addEventListener('click', openDrawer);
  document.getElementById('drawerClose').addEventListener('click', closeDrawer);
  document.getElementById('drawerOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('drawerOverlay')) closeDrawer();
  });
  document.getElementById('btnClearAll').addEventListener('click', () => {
    if (confirm('确认清空所有历史记录？')) {
      Storage.clearAll();
      renderHistory();
    }
  });

  /* 错误页重试 */
  document.getElementById('btnRetry').addEventListener('click', () => {
    if (currentFiles.length) runPipeline(currentFiles);
    else resetToUpload();
  });
  document.getElementById('btnManual').addEventListener('click', () => {
    if (currentFiles.length) showManualModal(inferDirection(currentFiles), guessSkillName(currentFiles), currentFiles);
    else showView('viewUpload');
  });

  /* 手动弹窗关闭 */
  document.getElementById('manualModal').addEventListener('click', e => {
    if (e.target === document.getElementById('manualModal')) {
      document.getElementById('manualModal').classList.add('hidden');
      resetToUpload();
    }
  });

  /* 启动时检测连接（异步，不阻塞UI）*/
  showView('viewUpload');
  setTimeout(() => ApiService.testConnection(), 600);
}

document.addEventListener('DOMContentLoaded', init);
