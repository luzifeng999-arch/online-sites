/* ═══════════════════════════════════════════
   report.js · 评测报告生成 & 导出
═══════════════════════════════════════════ */

const Reporter = (() => {

  const DIM_NAMES = {
    A: 'A · 视觉层级与信息架构',
    B: 'B · 色彩美学与情感调性',
    C: 'C · 版式规范与排版质量',
    D: 'D · 品牌一致性与风格稳定',
    E: 'E · 可访问性基线（强制）'
  };

  const DIM_COLORS = {
    A: '#2563EB', B: '#7C3AED', C: '#059669', D: '#D97706', E: '#DC2626'
  };

  const DIR_NAMES = {
    ui: '🖥 UI 生成 (DIR-01)',
    img: '🖼 图片生成 (DIR-02)',
    video: '🎬 视频动效 (DIR-03)',
    doc: '📄 文档/PPT (DIR-04)',
    eval: '📊 评测 (DIR-05)'
  };

  const VERDICT_LABELS = {
    PASS: { text: 'PASS · 允许上线', cls: 'pass', desc: '综合分 ≥ 7.5 且无维度 < 6.0，评测通过，允许上线。' },
    WATCH: { text: 'WATCH · 有条件上线', cls: 'watch', desc: '综合分 7.0–7.4，可上线，需在 2 周内完成修复后重走 AQE。' },
    FAIL: { text: 'FAIL · 打回修改', cls: 'fail', desc: '综合分 < 7.0 或存在维度 < 6.0，打回修改，从 Gate 0 重新开始。' },
    BLOCK: { text: 'BLOCK · 强制阻断', cls: 'block', desc: '可访问性 (AQE-E) 强制阻断项未达标，不可上线，修复 E 维度后重测。' }
  };

  /* ─── 收集失分项 ─── */
  function collectFailures() {
    const failures = [];
    const scores = AppState.scores;

    // 低分维度自动生成失分提示
    ['A','B','C','D','E'].forEach(dim => {
      const score = scores[dim] || 0;
      if (score < 6.0) {
        failures.push({
          dimension: `AQE-${dim}`,
          title: `${DIM_NAMES[dim]} 得分偏低（${score.toFixed(1)} 分）`,
          suggestion: score < 5.0
            ? `⚠️ 分数严重不足，需要全面重检 ${DIM_NAMES[dim]} 相关实现。`
            : `建议逐项检查 AQE-${dim} 的子维度，找出具体失分点。`,
          isBlock: dim === 'E' && score < 5.0
        });
      }
    });

    // 合并 AI 分析中的失分项
    if (AppState.aiAnalysis?.failures) {
      AppState.aiAnalysis.failures.forEach(f => {
        failures.push(f);
      });
    }

    return failures;
  }

  /* ─── 生成报告 HTML ─── */
  function generateReportHTML() {
    const session = buildSession();
    const scores = session.scores;
    const verdict = VERDICT_LABELS[scores.verdict] || VERDICT_LABELS.FAIL;
    const failures = session.failures;
    const date = new Date(session.date).toLocaleString('zh-CN');

    // 存储当前会话
    AppState.currentSession = session;
    Storage.saveSession(session);

    const html = `
    <!-- 报告头部 -->
    <div class="report-header-card">
      <div class="report-meta">
        <div class="report-meta-item">
          <span class="report-meta-label">Skill 名称</span>
          <span class="report-meta-value">${session.skillName || '未命名 Skill'}</span>
        </div>
        <div class="report-meta-item">
          <span class="report-meta-label">评测方向</span>
          <span class="report-meta-value">${DIR_NAMES[session.direction] || session.direction}</span>
        </div>
        <div class="report-meta-item">
          <span class="report-meta-label">评测人员</span>
          <span class="report-meta-value">${session.evaluator || '—'}</span>
        </div>
        <div class="report-meta-item">
          <span class="report-meta-label">评测时间</span>
          <span class="report-meta-value">${date}</span>
        </div>
        <div class="report-meta-item">
          <span class="report-meta-label">评测 ID</span>
          <span class="report-meta-value" style="font-family:monospace;font-size:12px">${session.id}</span>
        </div>
      </div>
      <div class="report-score-hero">
        <div class="report-score-number">${scores.composite?.toFixed(1) || '—'}</div>
        <div>
          <div class="report-verdict-large ${verdict.cls}">${verdict.text}</div>
          <div class="report-verdict-desc">${verdict.desc}</div>
        </div>
      </div>
    </div>

    <!-- 雷达图 + 维度详情 -->
    <div class="report-visual-row">
      <div class="radar-card">
        <div class="card-title" style="text-align:center;margin-bottom:12px">AQE 五维评分</div>
        <svg id="reportRadar" class="radar-svg"></svg>
      </div>
      <div class="dim-scores-card">
        <div class="card-title">各维度得分详情</div>
        ${['A','B','C','D','E'].map(dim => {
          const score = scores[dim] || 0;
          const pct = (score / 10) * 100;
          const isLow = score < 6.0;
          const isBlock = dim === 'E' && score < 5.0;
          return `
          <div class="dim-score-row">
            <div class="dim-score-icon" style="background:${DIM_COLORS[dim]}">${dim}</div>
            <div class="dim-score-info">
              <div class="dim-score-name" style="color:${isBlock?'var(--fail)':isLow?'var(--watch)':'inherit'}">
                ${DIM_NAMES[dim]}${isBlock?' 🚫 BLOCK':isLow?' ⚠️':''}
              </div>
              ${AppState.aiAnalysis?.analysis?.[dim] ? `<div style="font-size:11px;color:var(--text-tertiary);margin-top:3px;line-height:1.5">${AppState.aiAnalysis.analysis[dim]}</div>` : ''}
              <div class="dim-score-bar-track" style="margin-top:6px">
                <div class="dim-score-bar-fill" style="width:${pct}%;background:${DIM_COLORS[dim]}"></div>
              </div>
            </div>
            <div class="dim-score-value" style="color:${DIM_COLORS[dim]}">${score.toFixed(1)}</div>
          </div>`;
        }).join('')}
        ${AppState.aiAnalysis?.summary ? `
        <div style="margin-top:16px;padding:12px;background:var(--bg-app);border-radius:8px;font-size:12px;color:var(--text-secondary);line-height:1.6">
          <strong style="color:var(--text-primary)">AI 综合评价：</strong>${AppState.aiAnalysis.summary}
        </div>` : ''}
      </div>
    </div>

    <!-- 失分项 -->
    ${failures.length > 0 ? `
    <div class="failures-section">
      <div class="card-title" style="margin-bottom:16px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        失分项 & 修复建议（${failures.length} 项）
      </div>
      ${failures.map(f => `
      <div class="failure-item ${f.isBlock ? 'is-block' : ''}">
        <div class="failure-dim-tag" style="background:${DIM_COLORS[f.dimension?.replace('AQE-','')[0]] || '#64748B'}">
          ${f.dimension || 'AQE'}
        </div>
        <div class="failure-content">
          <div class="failure-title">${f.isBlock ? '🚫 ' : ''}${f.title}</div>
          <div class="failure-suggestion">${f.suggestion}</div>
        </div>
      </div>`).join('')}
    </div>` : `
    <div class="card" style="text-align:center;color:var(--pass);padding:24px">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom:8px"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <p style="font-weight:600">无明显失分项，表现优秀！</p>
    </div>`}

    <!-- Checklist 完成情况 -->
    <div class="card" style="margin-bottom:24px">
      <div class="card-title">Checklist 完成情况</div>
      ${renderChecklistSummary(session)}
    </div>

    <!-- 判定说明 -->
    <div class="card" style="background:${scores.verdict==='PASS'?'var(--pass-bg)':scores.verdict==='BLOCK'?'var(--block-bg)':scores.verdict==='WATCH'?'var(--watch-bg)':'var(--fail-bg)'}">
      <div style="display:flex;gap:16px;align-items:flex-start">
        <div style="font-size:32px">
          ${scores.verdict==='PASS'?'✅':scores.verdict==='WATCH'?'👀':scores.verdict==='BLOCK'?'🚫':'❌'}
        </div>
        <div>
          <div style="font-weight:700;font-size:16px;margin-bottom:4px">${verdict.text}</div>
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.6">${verdict.desc}</div>
          ${scores.verdict === 'WATCH' ? '<div style="margin-top:8px;font-size:12px;color:var(--watch)">请在 Skill 描述中注明「视觉质量持续优化中」，并在 2 周内完成修复。</div>' : ''}
          ${scores.verdict === 'FAIL' || scores.verdict === 'BLOCK' ? '<div style="margin-top:8px;font-size:12px;color:var(--fail)">本次评测记录已写入 Known Failures 库，请按失分项修复后重走 Gate 0。</div>' : ''}
        </div>
      </div>
    </div>`;

    return html;
  }

  /* ─── Checklist 完成情况汇总 ─── */
  function renderChecklistSummary(session) {
    const dir = session.direction || 'ui';
    const checks = AppState.checklist[dir] || {};
    const allItems = (Evaluator.CHECKLISTS[dir] || []).flatMap(s => s.items);
    const total = allItems.length;
    const done = allItems.filter(item => checks[item.id]).length;
    const pct = total > 0 ? Math.round(done / total * 100) : 0;

    return `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px">
      <div style="flex:1;height:8px;background:var(--bg-app);border-radius:99px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:var(--primary);border-radius:99px;transition:width 0.5s"></div>
      </div>
      <span style="font-size:13px;font-weight:700;color:var(--primary)">${done}/${total} (${pct}%)</span>
    </div>
    <div style="font-size:12px;color:var(--text-secondary)">
      ${done === total ? '✅ 所有 Checklist 项已确认' : `还有 ${total-done} 项未确认，建议完成后再上线`}
    </div>`;
  }

  /* ─── 构建 Session 对象 ─── */
  function buildSession() {
    const dir = AppState.direction || 'ui';
    const checks = AppState.checklist[dir] || {};
    const failures = collectFailures();

    return {
      id: AppState.sessionId || Storage.generateId(),
      skillName: document.getElementById('skillName')?.value || '未命名 Skill',
      evaluator: document.getElementById('evaluatorName')?.value || '—',
      direction: dir,
      date: new Date().toISOString(),
      scores: { ...AppState.scores },
      checklist: checks,
      failures,
      files: AppState.uploadedFiles?.map(f => ({ name: f.name, size: f.size })) || [],
      description: document.getElementById('skillDesc')?.value || ''
    };
  }

  /* ─── 渲染到页面 ─── */
  function render() {
    const container = document.getElementById('reportContent');
    container.innerHTML = generateReportHTML();

    // 绘制雷达图（等 DOM 渲染后执行）
    requestAnimationFrame(() => {
      const radarSvg = document.getElementById('reportRadar');
      if (radarSvg) {
        RadarChart.draw(radarSvg, AppState.scores, 240);
      }
    });

    // 切换到报告 Tab
    switchTab('report');
  }

  /* ─── 导出 Markdown ─── */
  function exportMarkdown() {
    const session = AppState.currentSession || buildSession();
    const s = session.scores;
    const date = new Date(session.date).toLocaleString('zh-CN');
    const verdict = VERDICT_LABELS[s.verdict] || VERDICT_LABELS.FAIL;

    const md = `# Skill AQE 评测报告

## 基本信息
| 字段 | 值 |
|------|-----|
| Skill 名称 | ${session.skillName} |
| 评测方向 | ${DIR_NAMES[session.direction] || session.direction} |
| 评测人员 | ${session.evaluator} |
| 评测时间 | ${date} |
| 评测 ID | \`${session.id}\` |

## 综合判定

> **${verdict.text}** — ${verdict.desc}

综合分：**${s.composite?.toFixed(1) || '—'}**

## AQE 五维评分

| 维度 | 得分 | 状态 |
|------|------|------|
| A · 视觉层级与信息架构 | ${s.A?.toFixed(1)} | ${s.A >= 7.5 ? '✅' : s.A >= 6 ? '⚠️' : '❌'} |
| B · 色彩美学与情感调性 | ${s.B?.toFixed(1)} | ${s.B >= 7.5 ? '✅' : s.B >= 6 ? '⚠️' : '❌'} |
| C · 版式规范与排版质量 | ${s.C?.toFixed(1)} | ${s.C >= 7.5 ? '✅' : s.C >= 6 ? '⚠️' : '❌'} |
| D · 品牌一致性与风格稳定 | ${s.D?.toFixed(1)} | ${s.D >= 7.5 ? '✅' : s.D >= 6 ? '⚠️' : '❌'} |
| E · 可访问性基线（强制） | ${s.E?.toFixed(1)} | ${s.E >= 5 ? (s.E >= 7.5 ? '✅' : '⚠️') : '🚫 BLOCK'} |

## 失分项 & 修复建议

${session.failures.length ? session.failures.map(f =>
  `### ${f.isBlock ? '🚫 ' : ''}${f.dimension}: ${f.title}\n\n${f.suggestion}`
).join('\n\n') : '无明显失分项，表现优秀！'}

---
*由 Skill AQE 评测平台生成 · ${date}*
`;

    downloadText(md, `AQE_Report_${session.skillName}_${Date.now()}.md`, 'text/markdown');
    showToast('Markdown 报告已下载');
  }

  /* ─── 导出 JSON ─── */
  function exportJson() {
    const session = AppState.currentSession || buildSession();
    downloadText(JSON.stringify(session, null, 2), `AQE_Session_${session.id}.json`, 'application/json');
    showToast('JSON 数据已下载');
  }

  /* ─── 打印 / PDF ─── */
  function print() {
    window.print();
  }

  /* ─── 工具 ─── */
  function downloadText(content, filename, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return { render, exportMarkdown, exportJson, print, buildSession };
})();
