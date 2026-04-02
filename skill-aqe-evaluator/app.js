/* ═══════════════════════════════════════════
   app.js · 主入口：状态管理 + 事件绑定
═══════════════════════════════════════════ */

/* ─── 全局应用状态 ─── */
const AppState = {
  currentTab: 'upload',
  direction: 'ui',
  uploadedFiles: [],
  checklist: {},
  scores: { A: 7, B: 7, C: 7, D: 7, E: 7, composite: 7, verdict: 'PASS' },
  currentSession: null,
  sessionId: null,
  aiAnalysis: null,
  apiConfig: {}
};

/* ─── Tab 切换 ─── */
function switchTab(tabId) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));

  const panel = document.getElementById(`tab-${tabId}`);
  const tab = document.querySelector(`[data-tab="${tabId}"]`);
  if (panel) panel.classList.add('active');
  if (tab) tab.classList.add('active');

  AppState.currentTab = tabId;

  if (tabId === 'failures') renderFailuresTab();
  if (tabId === 'evaluate') Evaluator.renderScoreSliders();
}

/* ─── 通知 Toast ─── */
function showToast(msg, type = 'default', duration = 2800) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.className = `toast${type !== 'default' ? ' ' + type : ''}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

/* ─── Tab 导航 ─── */
function initNavigation() {
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

/* ─── 方向 Tab ─── */
function initDirectionTabs() {
  document.querySelectorAll('.dir-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dir-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.direction = btn.dataset.dir;

      // 同步下拉选择器
      const sel = document.getElementById('skillDirection');
      if (sel) sel.value = AppState.direction;

      Evaluator.renderChecklist(AppState.direction);
      Evaluator.updateCompositeScore();
    });
  });

  // 方向选择器同步
  const dirSelect = document.getElementById('skillDirection');
  if (dirSelect) {
    dirSelect.addEventListener('change', () => {
      AppState.direction = dirSelect.value || 'ui';
      document.querySelectorAll('.dir-tab').forEach(b => {
        b.classList.toggle('active', b.dataset.dir === AppState.direction);
      });
      Evaluator.renderChecklist(AppState.direction);
      Evaluator.updateCompositeScore();
    });
  }
}

/* ─── 开始评测按钮 ─── */
function initStartEvalBtn() {
  const btn = document.getElementById('btnStartEval');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const dir = document.getElementById('skillDirection')?.value || 'ui';
    AppState.direction = dir || 'ui';
    AppState.sessionId = Storage.generateId();

    // 同步方向 Tab
    document.querySelectorAll('.dir-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.dir === AppState.direction);
    });

    switchTab('evaluate');
    Evaluator.renderChecklist(AppState.direction);
    Evaluator.renderScoreSliders();

    // 如果配置了 API，自动分析
    const apiConfig = Storage.getApiConfig();
    if (apiConfig.apiKey && apiConfig.autoAnalyze) {
      btn.disabled = true;
      btn.textContent = '⏳ AI 分析中...';
      try {
        const desc = document.getElementById('skillDesc')?.value || '';
        const result = await ApiService.analyze({ direction: AppState.direction, description: desc });
        if (result.success) {
          Evaluator.applyAiScores(result.data);
          showToast('✨ AI 自动分析完成，已填入参考分数', 'success');
        } else {
          showToast(`AI 分析失败：${result.message}`, 'error');
        }
      } catch (e) {
        showToast('AI 分析出错，请手动评分', 'error');
      }
      btn.disabled = false;
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> 开始 AQE 评测`;
    }
  });
}

/* ─── 生成报告按钮 ─── */
function initReportBtn() {
  document.getElementById('btnGenReport')?.addEventListener('click', () => {
    Reporter.render();
    showToast('评测报告已生成', 'success');
  });

  document.getElementById('btnExportMd')?.addEventListener('click', Reporter.exportMarkdown);
  document.getElementById('btnExportJson')?.addEventListener('click', Reporter.exportJson);
  document.getElementById('btnExportPrint')?.addEventListener('click', Reporter.print);
}

/* ─── 写入 Known Failures ─── */
function initSaveFailuresBtn() {
  document.getElementById('btnSaveFailures')?.addEventListener('click', () => {
    const session = Reporter.buildSession();
    AppState.currentSession = session;
    Storage.saveSession(session);
    showToast('✅ 已写入 Known Failures 库', 'success');
  });
}

/* ─── Known Failures Tab ─── */
function renderFailuresTab() {
  renderFailureStats();
  renderTrendChart();
  renderFailureList();
}

function renderFailureStats() {
  const stats = Storage.getStats();
  const container = document.getElementById('failureStats');
  if (!container) return;

  const cards = [
    { label: '历史评测总数', value: stats.total, color: 'var(--primary)' },
    { label: 'PASS', value: stats.byVerdict.PASS || 0, color: 'var(--pass)' },
    { label: 'WATCH', value: stats.byVerdict.WATCH || 0, color: 'var(--watch)' },
    { label: 'FAIL + BLOCK', value: (stats.byVerdict.FAIL || 0) + (stats.byVerdict.BLOCK || 0), color: 'var(--fail)' },
    { label: '综合分均值', value: stats.avgComposite, color: 'var(--primary)' },
  ];

  container.innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="stat-value" style="color:${c.color}">${c.value}</div>
      <div class="stat-label">${c.label}</div>
    </div>`).join('');
}

function renderTrendChart() {
  const stats = Storage.getStats();
  const svg = document.getElementById('trendChart');
  const empty = document.getElementById('trendEmpty');
  if (!svg || !stats.trend.length) return;

  const hasData = RadarChart.drawTrend(svg, stats.trend);
  if (empty) empty.style.display = hasData ? 'none' : '';
}

function renderFailureList() {
  const container = document.getElementById('failuresList');
  if (!container) return;

  const dir = document.getElementById('filterDirection')?.value || '';
  const dim = document.getElementById('filterDimension')?.value || '';
  const verdict = document.getElementById('filterVerdict')?.value || '';

  const sessions = Storage.filterSessions({ direction: dir, dimension: dim, verdict });

  if (!sessions.length) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <p>暂无评测记录${dir || dim || verdict ? '（符合筛选条件）' : ''}</p>
      </div>`;
    return;
  }

  const verdictColors = { PASS:'var(--pass)', WATCH:'var(--watch)', FAIL:'var(--fail)', BLOCK:'var(--block)' };
  const dirLabels = { ui:'🖥 UI', img:'🖼 图片', video:'🎬 视频', doc:'📄 文档', eval:'📊 评测' };

  container.innerHTML = sessions.map(s => {
    const vColor = verdictColors[s.scores?.verdict] || 'var(--text-secondary)';
    const date = s.date ? new Date(s.date).toLocaleString('zh-CN', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}) : '—';
    const score = s.scores?.composite?.toFixed(1) || '—';

    return `
    <div class="failure-record-card">
      <div class="failure-record-header">
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <div style="font-size:22px;font-weight:900;color:${vColor};line-height:1">${score}</div>
          <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;background:${vColor}20;color:${vColor}">${s.scores?.verdict || '—'}</span>
        </div>
        <div class="failure-record-meta">
          <div class="failure-record-title">${s.skillName || '未命名 Skill'}</div>
          <div class="failure-record-sub">${dirLabels[s.direction]||s.direction} · ${s.evaluator||'—'} · ${date}</div>
        </div>
        <button class="btn-danger-outline" style="padding:4px 10px;font-size:11px" onclick="deleteRecord('${s.id}')">删除</button>
      </div>
      ${s.failures && s.failures.length ? `
      <div class="failure-record-body" style="grid-template-columns:1fr">
        <div class="failure-field">
          <label>失分项</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
            ${s.failures.slice(0,5).map(f => `
              <span style="padding:2px 8px;border-radius:4px;background:var(--fail-bg);color:var(--fail);font-size:11px;font-weight:600">
                ${f.isBlock?'🚫':''}${f.dimension}
              </span>`).join('')}
            ${s.failures.length > 5 ? `<span style="font-size:11px;color:var(--text-tertiary)">+${s.failures.length-5}项</span>` : ''}
          </div>
          ${s.failures[0]?.suggestion ? `<p style="margin-top:6px">${s.failures[0].suggestion}</p>` : ''}
        </div>
      </div>` : ''}
    </div>`;
  }).join('');
}

function deleteRecord(id) {
  if (!confirm('确定删除这条评测记录吗？')) return;
  Storage.deleteSession(id);
  renderFailureList();
  renderFailureStats();
  renderTrendChart();
  showToast('记录已删除');
}

/* ─── 筛选器事件 ─── */
function initFilters() {
  ['filterDirection','filterDimension','filterVerdict'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', renderFailureList);
  });
  document.getElementById('btnClearAll')?.addEventListener('click', () => {
    if (confirm('确定清空所有 Known Failures 记录？此操作不可恢复。')) {
      Storage.clearAllSessions();
      renderFailuresTab();
      showToast('已清空所有记录');
    }
  });
}

/* ─── API 配置弹窗 ─── */
function initApiModal() {
  const modal = document.getElementById('apiModal');
  const btnOpen = document.getElementById('btnApiConfig');
  const btnClose = document.getElementById('closeApiModal');
  const btnCancel = document.getElementById('btnCancelApi');
  const btnSave = document.getElementById('btnSaveApi');
  const btnTest = document.getElementById('btnTestApi');

  if (!modal) return;

  // 打开
  btnOpen?.addEventListener('click', () => {
    syncModalStatus(); // 刷新弹窗内状态
    modal.style.display = 'flex';
  });

  // 关闭
  const closeModal = () => modal.style.display = 'none';
  btnClose?.addEventListener('click', closeModal);
  btnCancel?.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  // 重新检测
  btnTest?.addEventListener('click', async () => {
    btnTest.disabled = true;
    btnTest.textContent = '检测中…';
    await doConnectionTest();
    btnTest.disabled = false;
    btnTest.textContent = '重新检测';
    syncModalStatus();
  });

  // 保存（高级覆盖）
  btnSave?.addEventListener('click', () => {
    const overrides = {
      baseUrl: document.getElementById('apiBaseUrl')?.value.trim() || '',
      model:   document.getElementById('apiModel')?.value.trim() || '',
      autoAnalyze: document.getElementById('autoAnalyze')?.checked ?? true,
    };
    ApiService.saveApiConfig(overrides);
    closeModal();
    showToast('✅ 设置已保存', 'success');
  });
}

/* 同步弹窗内状态显示 */
function syncModalStatus() {
  const s = ApiService.getStatus();
  const dot   = document.getElementById('apiModalDot');
  const title = document.getElementById('apiModalTitle');
  const sub   = document.getElementById('apiModalSub');

  const map = {
    unknown: { color:'#94A3B8', t:'检测中…',      s:'正在连接内网 API' },
    online:  { color:'#16A34A', t:'✅ 已连接',     s:'内网 API 正常，可使用 AI 自动打分' },
    offline: { color:'#DC2626', t:'❌ 无法连接',   s:'请确认在快手内网 / VPN 已开启' },
  };
  const cfg = map[s] || map.unknown;
  if (dot)   { dot.style.background = cfg.color; }
  if (title) { title.textContent = cfg.t; title.style.color = cfg.color; }
  if (sub)   { sub.textContent = cfg.s; }

  // 同时还原高级覆盖字段
  const stored = ApiService.getConfig();
  const baseEl = document.getElementById('apiBaseUrl');
  const modelEl = document.getElementById('apiModel');
  const autoEl  = document.getElementById('autoAnalyze');
  // 只填用户自己覆盖的值（不显示内置值，保持 placeholder 提示）
  try {
    const raw = JSON.parse(localStorage.getItem('aqe_api_config') || '{}');
    if (baseEl)  baseEl.value  = raw.baseUrl  || '';
    if (modelEl) modelEl.value = raw.model    || '';
    if (autoEl)  autoEl.checked = raw.autoAnalyze != null ? raw.autoAnalyze : true;
  } catch { /* ignore */ }
}

/* 执行连接测试 */
async function doConnectionTest() {
  const result = await ApiService.testConnection();
  return result;
}

/* ─── 键盘快捷键 ─── */
function initKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('apiModal');
      if (modal && modal.style.display !== 'none') modal.style.display = 'none';
    }
  });
}

/* ─── 初始化 ─── */
function init() {
  initNavigation();
  initDirectionTabs();
  initStartEvalBtn();
  initReportBtn();
  initSaveFailuresBtn();
  initFilters();
  initApiModal();
  initKeyboard();
  Uploader.init();

  // 初始化评测页
  Evaluator.renderChecklist(AppState.direction);
  Evaluator.renderScoreSliders();

  // 启动时自动检测 API 连接（后台静默运行，不阻塞 UI）
  setTimeout(() => {
    ApiService.testConnection().then(result => {
      if (result.success) {
        showToast('✅ 内网 API 已连接，AI 自动分析可用', 'success', 3000);
      }
      // 离线时不弹提示，状态指示器已显示红色
    });
  }, 800); // 稍延迟，等页面渲染完成

  console.log('%c🎨 Skill AQE 评测平台', 'font-size:16px;font-weight:bold;color:#2563EB');
  console.log('%c内网 API 已内置，无需手动配置', 'color:#16A34A');
}

// DOM 加载完成后启动
document.addEventListener('DOMContentLoaded', init);
