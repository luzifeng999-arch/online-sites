/* ═══════════════════════════════════════════
   app.js · AQE Evaluator 主流程控制器
   状态机：viewInput → viewRunning → viewReport
═══════════════════════════════════════════ */

/* ═══════════════════════════════
   全局状态
═══════════════════════════════ */
let _state = 'input';       // 'input' | 'running' | 'report'
let _currentData = null;    // 最新评测结果
let _currentHtml = null;    // 最新生成的报告 HTML
let _aborted    = false;    // 是否已取消

/* ═══════════════════════════════
   DOM 快捷引用
═══════════════════════════════ */
const $ = id => document.getElementById(id);

/* ═══════════════════════════════
   初始化
═══════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initConnStatus();
  initPipelineSteps();
  bindEvents();
  showView('viewInput');
});

/* ── 连接状态检测 ── */
function initConnStatus() {
  const pill = $('connPill');
  const dot  = $('connDot');
  const lbl  = $('connLabel');

  setConnUI('checking');

  ApiService.checkStatus().then(status => {
    setConnUI(status);
  });

  function setConnUI(s) {
    const map = {
      checking: { c: '#94A3B8', t: '检测中', pulse: false },
      online:   { c: '#16A34A', t: '已连接', pulse: true  },
      offline:  { c: '#EF4444', t: '离线·演示模式', pulse: false },
    };
    const m = map[s] || map.checking;
    if (dot) { dot.style.background = m.c; dot.classList.toggle('pulse', m.pulse); }
    if (lbl) { lbl.textContent = m.t; lbl.style.color = m.c; }
  }
}

/* ═══════════════════════════════
   视图切换
═══════════════════════════════ */
function showView(viewId) {
  ['viewInput', 'viewRunning', 'viewReport'].forEach(id => {
    const el = $(id);
    if (el) el.classList.toggle('hidden', id !== viewId);
  });
  _state = viewId.replace('view', '').toLowerCase();
}

/* ═══════════════════════════════
   流水线步骤
═══════════════════════════════ */
const STEPS = [
  { id: 'step1', label: '解析 Skill 信息', desc: '识别方向、输入输出格式…' },
  { id: 'step2', label: '构造测试用例',    desc: '生成典型 / 边界 / 缺省输入…' },
  { id: 'step3', label: 'SQE-5 工程评测', desc: '触发率 · 意图 · 产出质量 · 边界 · 文档' },
  { id: 'step4', label: 'AQE 美学评测',   desc: '视觉 · 色彩 · 版式 · 品牌 · 可访问性' },
  { id: 'step5', label: '生成评测报告',   desc: '综合判定 · Checklist · 修复建议…' },
];

function initPipelineSteps() {
  // index.html 已有静态流水线步骤，无需重新生成
  // 确认步骤容器存在即可
  const pipeEl = $('pipeline');
  if (!pipeEl) return;
  // 补充 pipe-content 容器（如不存在）
  STEPS.forEach(s => {
    const el = $(s.id);
    if (!el) {
      const stepEl = document.createElement('div');
      stepEl.className = 'pipe-step';
      stepEl.id = s.id;
      stepEl.innerHTML = `<div class="pipe-dot"></div>
        <div class="pipe-content">
          <div class="pipe-label">${s.label}</div>
          <div class="pipe-desc" id="${s.id}Desc">${s.desc}</div>
        </div>`;
      pipeEl.appendChild(stepEl);
    }
  });
}

function setStep(stepIdx, status, desc) {
  // status: 'waiting' | 'running' | 'done' | 'error'
  // CSS classes: '' | 'active' | 'done' | 'error'
  const cssMap = { running: 'active', done: 'done', error: 'error', waiting: '' };
  STEPS.forEach((s, i) => {
    const el = $(s.id);
    if (!el) return;
    el.classList.remove('active', 'done', 'error');
    if (i < stepIdx)  el.classList.add('done');
    if (i === stepIdx) {
      const cls = cssMap[status] || '';
      if (cls) el.classList.add(cls);
    }
    if (i === stepIdx && desc) {
      const descEl = $(`${s.id}Desc`);
      if (descEl) descEl.textContent = desc;
    }
  });
}

function markAllDone() {
  STEPS.forEach((_, i) => {
    const el = $(STEPS[i].id);
    if (el) { el.classList.remove('active','error'); el.classList.add('done'); }
  });
}

/* ═══════════════════════════════
   表单输入收集
═══════════════════════════════ */
function getFormValues() {
  return {
    skillName:   ($('inputSkillName')?.value || '').trim(),
    direction:   ($('inputDirection')?.value || ''),
    description: ($('inputDescription')?.value || '').trim(),
    samples:     ($('inputSamples')?.value || '').trim(),
    competitor:  ($('inputCompetitor')?.value || '').trim(),
    notes:       ($('inputNotes')?.value || '').trim(),
  };
}

function validateForm(vals) {
  if (!vals.skillName) {
    shakeInput('inputSkillName');
    showTip('❌ 请填写被测 Skill 名称');
    return false;
  }
  if (!vals.description) {
    shakeInput('inputDescription');
    showTip('❌ 请填写 Skill 描述 / SKILL.md 内容');
    return false;
  }
  if (vals.description.length < 20) {
    shakeInput('inputDescription');
    showTip('⚠️ Skill 描述太短，至少 20 字才能得到准确评测');
    return false;
  }
  return true;
}

function shakeInput(id) {
  const el = $(id);
  if (!el) return;
  el.style.border = '1.5px solid var(--red)';
  el.classList.add('shake');
  setTimeout(() => { el.style.border = ''; el.classList.remove('shake'); }, 800);
}

function showTip(text) {
  const tip = $('inputTip');
  if (!tip) return;
  tip.textContent = text;
  tip.style.color = text.startsWith('❌') ? '#DC2626' : text.startsWith('⚠️') ? '#D97706' : '#64748B';
}

/* ═══════════════════════════════
   评测主流程
═══════════════════════════════ */
async function startEvaluation() {
  const vals = getFormValues();
  if (!validateForm(vals)) return;

  _aborted = false;

  // 更新 Skill 预览卡
  const fpName = $('fpName');
  const fpMeta = $('fpMeta');
  if (fpName) fpName.textContent = vals.skillName;
  if (fpMeta) fpMeta.textContent = vals.direction
    ? `${ApiService.DIRECTIONS[vals.direction]?.name || vals.direction} · 准备评测`
    : '自动推断方向 · 准备评测';

  showView('viewRunning');

  /* ─── Step 1：解析 ─── */
  setStep(0, 'running', '正在分析 Skill 基本信息…');
  await sleep(400);
  if (_aborted) return;
  setStep(0, 'done', '✅ Skill 信息解析完成');

  /* ─── Step 2：构造用例 ─── */
  setStep(1, 'running', vals.samples ? '已提供输出样本，构建评测场景…' : '未提供样本，构造推断测试用例…');
  await sleep(600);
  if (_aborted) return;
  setStep(1, 'done', '✅ 测试用例构造完成');

  /* ─── Step 3：SQE-5 ─── */
  setStep(2, 'running', '执行 SQE-5 工程侧评测：D1/D2/D3/D4/D5…');

  /* ─── Step 4：AQE ─── */
  const stepTimer = setTimeout(() => {
    if (!_aborted) setStep(3, 'running', '执行 AQE 美学侧评测：A/B/C/D/E 五维…');
  }, 2000);

  /* ─── 调用 AI 评测 ─── */
  const result = await ApiService.evaluate(vals);

  clearTimeout(stepTimer);
  if (_aborted) return;

  if (!result.ok) {
    setStep(2, 'error', `❌ 评测失败：${result.error}`);
    await sleep(1500);
    showEvalError(result.error);
    return;
  }

  setStep(2, 'done', `✅ SQE-5 综合分：${result.data.sqe5?.composite?.toFixed(1) || '—'}`);
  setStep(3, 'done', `✅ AQE 综合分：${result.data.aqe?.composite?.toFixed(1) || '—'}`);

  /* ─── Step 5：生成报告 ─── */
  setStep(4, 'running', '生成 HTML 评测报告…');
  await sleep(400);

  if (_aborted) return;

  // 生成报告 HTML
  const html = ApiService.generateHtmlReport(result.data);
  _currentData = result.data;
  _currentHtml = html;

  // 保存历史
  Storage.save({
    skillName: result.data.skillName,
    direction: result.data.direction,
    directionName: result.data.directionName || ApiService.DIRECTIONS[result.data.direction]?.name || result.data.direction,
    verdict: result.data.overallVerdict,
    sqeScore: result.data.sqe5?.composite,
    aqeScore: result.data.aqe?.composite,
    data: result.data,
    html,
  });

  markAllDone();
  await sleep(500);

  // 显示报告
  showReport(html, result.data);
}

function showEvalError(errMsg) {
  showView('viewInput');
  showTip(`❌ 评测失败：${errMsg || '请检查网络后重试'}`);
}

/* ═══════════════════════════════
   报告展示
═══════════════════════════════ */
function showReport(html, data) {
  const reportBody = $('reportBody');
  if (!reportBody) return;

  // 使用 iframe 沙箱渲染完整 HTML 报告
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:100%;border:none;min-height:600px;border-radius:8px;';
  iframe.setAttribute('title', 'AQE 评测报告');
  iframe.setAttribute('sandbox', 'allow-scripts allow-popups');
  reportBody.innerHTML = '';
  reportBody.appendChild(iframe);

  // 写入完整 HTML
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  // 动态调整高度
  const resizeObs = new ResizeObserver(() => {
    const bodyH = doc.body?.scrollHeight || 0;
    if (bodyH > 200) iframe.style.height = bodyH + 32 + 'px';
  });
  setTimeout(() => {
    if (doc.body) resizeObs.observe(doc.body);
  }, 200);

  showView('viewReport');
}

/* ═══════════════════════════════
   导出 / 操作按钮
═══════════════════════════════ */
function downloadReportHtml() {
  if (!_currentHtml) return;
  const skillName = _currentData?.skillName || 'skill';
  const date = new Date().toISOString().slice(0, 10);
  const safeName = (skillName + '-' + date).replace(/[^a-zA-Z0-9\-_\u4e00-\u9fff]/g, '-');
  const blob = new Blob([_currentHtml], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `aqe-report-${safeName}.html`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function downloadReportJson() {
  if (!_currentData) return;
  const skillName = _currentData.skillName || 'skill';
  const date = new Date().toISOString().slice(0, 10);
  const safeName = (skillName + '-' + date).replace(/[^a-zA-Z0-9\-_\u4e00-\u9fff]/g, '-');
  const blob = new Blob([JSON.stringify(_currentData, null, 2)], { type: 'application/json;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `aqe-data-${safeName}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function printReport() {
  const iframe = document.querySelector('#reportBody iframe');
  if (iframe?.contentWindow) {
    iframe.contentWindow.print();
  } else {
    window.print();
  }
}

/* ═══════════════════════════════
   历史记录抽屉
═══════════════════════════════ */
function openHistoryDrawer() {
  const overlay = $('drawerOverlay');
  const body = $('drawerBody');
  if (!overlay || !body) return;

  const records = Storage.loadAll();
  if (records.length === 0) {
    body.innerHTML = '<div style="text-align:center;padding:40px 0;color:#94A3B8;font-size:14px">暂无历史记录</div>';
  } else {
    const verdictConfig = {
      PASS:   { c: '#16A34A', bg: '#F0FDF4', label: '✅ PASS' },
      WATCH:  { c: '#D97706', bg: '#FFFBEB', label: '👀 WATCH' },
      FAIL:   { c: '#DC2626', bg: '#FEF2F2', label: '❌ FAIL' },
      BLOCK:  { c: '#991B1B', bg: '#FFF1F2', label: '🚫 BLOCK' },
      RETURN: { c: '#64748B', bg: '#F1F5F9', label: '↩ RETURN' },
    };
    body.innerHTML = records.map(r => {
      const vc = verdictConfig[r.verdict] || verdictConfig.FAIL;
      return `<div class="hist-item" data-id="${r.id}">
        <div class="hist-item-header">
          <span class="hist-item-name" title="${escHtml(r.skillName || '')}">${escHtml(r.skillName || '未命名')}</span>
          <span class="hist-verdict-badge" style="background:${vc.bg};color:${vc.c}">${vc.label}</span>
        </div>
        <div class="hist-item-meta">
          <span class="hist-item-dir">${escHtml(r.directionName || r.direction || '—')}</span>
          <span class="hist-item-time">${escHtml(r.createdAt || '')}</span>
          <span>SQE: ${r.sqeScore?.toFixed(1) || '—'} · AQE: ${r.aqeScore?.toFixed(1) || '—'}</span>
        </div>
        <div class="hist-item-actions">
          <button onclick="loadHistory('${r.id}')" class="hist-load-btn">查看报告</button>
          <button onclick="deleteHistory('${r.id}')" class="hist-del-btn">删除</button>
        </div>
      </div>`;
    }).join('');
  }

  overlay.style.display = 'flex';
  requestAnimationFrame(() => overlay.classList.add('active'));
}

function closeHistoryDrawer() {
  const overlay = $('drawerOverlay');
  if (!overlay) return;
  overlay.classList.remove('active');
  setTimeout(() => { overlay.style.display = 'none'; }, 250);
}

function loadHistory(id) {
  const record = Storage.getById(id);
  if (!record || !record.html) return;
  _currentData = record.data || null;
  _currentHtml = record.html;
  closeHistoryDrawer();
  showReport(record.html, record.data);
}

function deleteHistory(id) {
  Storage.remove(id);
  openHistoryDrawer(); // 刷新
}

/* ═══════════════════════════════
   事件绑定
═══════════════════════════════ */
function bindEvents() {
  /* 开始评测 */
  const btnStart = $('btnStartEval');
  if (btnStart) btnStart.addEventListener('click', startEvaluation);

  /* 取消 */
  const btnCancel = $('btnCancel');
  if (btnCancel) btnCancel.addEventListener('click', () => {
    _aborted = true;
    showView('viewInput');
    showTip('⚠️ 已取消评测');
  });

  /* 重新评测 */
  const btnBack = $('btnBack');
  if (btnBack) btnBack.addEventListener('click', () => {
    showView('viewInput');
    showTip('💡 填写名称 + 描述即可开始评测，提供输出样本可获得更精准的 AQE 评测');
  });

  /* 下载/打印 */
  const btnExportHtml = $('btnExportHtml');
  if (btnExportHtml) btnExportHtml.addEventListener('click', downloadReportHtml);

  const btnExportJson = $('btnExportJson');
  if (btnExportJson) btnExportJson.addEventListener('click', downloadReportJson);

  const btnPrint = $('btnPrint');
  if (btnPrint) btnPrint.addEventListener('click', printReport);

  /* 历史记录 */
  const btnHistory = $('btnHistory');
  if (btnHistory) btnHistory.addEventListener('click', openHistoryDrawer);

  const drawerClose = $('drawerClose');
  if (drawerClose) drawerClose.addEventListener('click', closeHistoryDrawer);

  const drawerOverlay = $('drawerOverlay');
  if (drawerOverlay) drawerOverlay.addEventListener('click', e => {
    if (e.target === drawerOverlay) closeHistoryDrawer();
  });

  const btnClearAll = $('btnClearAll');
  if (btnClearAll) btnClearAll.addEventListener('click', () => {
    if (confirm('确定清空所有历史记录？')) {
      Storage.clearAll();
      openHistoryDrawer();
    }
  });

  /* ── API 设置弹窗 ── */
  const btnSettings = $('btnSettings');
  if (btnSettings) btnSettings.addEventListener('click', openSettingsModal);

  const btnCloseSettings = $('btnCloseSettings');
  if (btnCloseSettings) btnCloseSettings.addEventListener('click', closeSettingsModal);

  const btnSaveSettings = $('btnSaveSettings');
  if (btnSaveSettings) btnSaveSettings.addEventListener('click', saveAndTestSettings);

  const btnTestConn = $('btnTestConn');
  if (btnTestConn) btnTestConn.addEventListener('click', testApiConnection);

  const settingsModal = $('settingsModal');
  if (settingsModal) settingsModal.addEventListener('click', e => {
    if (e.target === settingsModal) closeSettingsModal();
  });

  /* ESC + Ctrl+Enter 键盘快捷键 */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const modal = $('settingsModal');
      if (modal && !modal.classList.contains('hidden')) closeSettingsModal();
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      if (_state === 'input') startEvaluation();
    }
  });

  /* 实时校验 Skill 名称 */
  const inputSkillName = $('inputSkillName');
  if (inputSkillName) {
    inputSkillName.addEventListener('input', () => {
      inputSkillName.style.border = '';
    });
  }
}

/* ═══════════════════════════════
   快速示例填充
═══════════════════════════════ */
function fillExample(type) {
  const examples = {
    ui: {
      name:  'ks-design-slide-deck',
      dir:   'ui',
      desc:  `这是一个 UI 生成 Skill，接受用户的自然语言描述，输出高质量的纯 HTML/CSS 界面代码。

# SKILL.md

## 名称
ks-design-slide-deck

## 功能描述
根据用户的自然语言需求，生成完整的响应式 Web 界面，使用 Tailwind CSS，支持多种组件（卡片、表格、图表、表单等）。

## 输入格式
用户用自然语言描述目标界面，例如：
- "生成一个用户管理控制台"
- "设计一个数据可视化 Dashboard"

## 输出格式
完整 HTML 文件（内联 CSS + Tailwind CDN），可直接在浏览器打开。

## 使用限制
- 不涉及后端逻辑
- 输出静态页面`,
      samples: `【输入 Prompt 1】
生成一个响应式的用户管理后台，包含侧边栏导航和用户列表表格

【输出 1】
<html>
<head>
<link href="https://cdn.tailwindcss.com" rel="stylesheet">
<title>用户管理</title>
</head>
<body class="flex bg-gray-50">
  <aside class="w-64 h-screen bg-white shadow-sm">
    <div class="p-4 text-lg font-bold text-blue-600">管理后台</div>
    <nav class="mt-4">
      <a class="flex items-center px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg mx-2">用户管理</a>
    </nav>
  </aside>
  <main class="flex-1 p-6">
    <h1 class="text-2xl font-bold mb-4">用户列表</h1>
    <table class="w-full bg-white rounded-xl shadow-sm">...</table>
  </main>
</body>
</html>`
    },
    doc: {
      name:  'slide-gen-ppt',
      dir:   'doc',
      desc:  `这是一个 PPT/幻灯片生成 Skill，接受主题或大纲，输出完整的 HTML 幻灯片（基于 reveal.js 或纯 HTML）。

# SKILL.md

## 名称
slide-gen-ppt

## 功能描述
根据用户提供的主题关键词或结构化大纲，自动生成专业风格的 PPT/幻灯片，输出为独立 HTML 文件。

## 输入格式
- 主题关键词：如"AI产品发展历程"
- 或提供大纲

## 输出格式
独立 HTML 幻灯片，含完整样式`,
      samples: `【输入 Prompt】
生成一个关于"AI产品2024年发展趋势"的5页PPT，包含封面、目录、3个内容页

【输出】
<!DOCTYPE html>
<html>
<head>
<style>
.slide { width:1080px;height:607px;background:#1E293B;color:white;padding:60px;display:flex;flex-direction:column;justify-content:center; }
.slide h1 { font-size:48px;font-weight:700;margin-bottom:16px; }
.slide p  { font-size:18px;opacity:0.8;line-height:1.6; }
</style>
</head>
<body>
<div class="slide">
  <h1>AI 产品 2024</h1>
  <h2>发展趋势与展望</h2>
</div>
</body>
</html>`
    },
    img: {
      name:  'ai-image-gen-poster',
      dir:   'img',
      desc:  `这是一个 AI 图片/海报生成 Skill，接受文字描述，生成高质量的商业海报或配图。

# SKILL.md

## 名称
ai-image-gen-poster

## 功能描述
基于 Stable Diffusion / DALL-E，根据用户描述生成专业商业图片，支持海报、Banner、产品配图等场景。

## 输入格式
中文/英文描述 + 风格要求（可选）

## 输出格式
PNG 图片，1080×1080 或 1920×1080`,
      samples: `【输入 Prompt 1】
生成一张科技感的产品发布会海报，主题"AI 新纪元"，蓝紫渐变背景，中文大标题居中

【输出 1】
（图片 URL）https://api.example.com/gen/result_001.png
尺寸：1920×1080，风格：科技/未来，主色：#1E40AF + #7C3AED

【输入 Prompt 2】
生成一个微信朋友圈封面图，品牌调性：温暖、简约

【输出 2】
（图片 URL）https://api.example.com/gen/result_002.png`
    }
  };

  const ex = examples[type];
  if (!ex) return;

  const nameEl = $('inputSkillName');
  const dirEl  = $('inputDirection');
  const descEl = $('inputDescription');
  const sampEl = $('inputSamples');

  if (nameEl) nameEl.value = ex.name;
  if (dirEl)  dirEl.value  = ex.dir;
  if (descEl) descEl.value = ex.desc;
  if (sampEl) sampEl.value = ex.samples || '';

  showTip('✅ 已填入示例数据，点击"开始 AQE 评测"立即体验');

  // 平滑滚动到表单
  const card = document.querySelector('.input-card');
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ═══════════════════════════════
   高级选项切换
═══════════════════════════════ */
function toggleAdvanced() {
  const body = $('advancedBody');
  const btn  = $('btnAdvanced');
  if (!body) return;
  const isHidden = body.classList.toggle('hidden');
  if (btn) {
    const svg = btn.querySelector('svg');
    if (svg) svg.style.transform = isHidden ? '' : 'rotate(180deg)';
    btn.classList.toggle('active', !isHidden);
  }
}

/* ═══════════════════════════════
   API 设置弹窗
═══════════════════════════════ */
function openSettingsModal() {
  const modal = $('settingsModal');
  if (!modal) return;

  const cfg = ApiService.getApiCfg();
  const baseEl  = $('cfgApiBase');
  const keyEl   = $('cfgApiKey');
  const modelEl = $('cfgModel');
  if (baseEl)  baseEl.value  = (cfg.base  !== 'https://api.openai.com') ? (cfg.base  || '') : '';
  if (keyEl)   keyEl.value   = cfg.key   || '';
  if (modelEl) modelEl.value = (cfg.model !== 'gpt-4o')                 ? (cfg.model || '') : '';

  const tip = $('settingsTip');
  if (tip) { tip.textContent = ''; tip.style.color = ''; }

  modal.classList.remove('hidden');
  setTimeout(() => { if (keyEl) keyEl.focus(); }, 80);
}

function closeSettingsModal() {
  const modal = $('settingsModal');
  if (modal) modal.classList.add('hidden');
}

async function saveAndTestSettings() {
  const base  = ($('cfgApiBase')?.value  || '').trim() || 'https://api.openai.com';
  const key   = ($('cfgApiKey')?.value   || '').trim();
  const model = ($('cfgModel')?.value    || '').trim() || 'gpt-4o';

  ApiService.saveApiCfg({ base, key, model });

  const tip     = $('settingsTip');
  const btnSave = $('btnSaveSettings');

  if (tip)     { tip.textContent = '⏳ 保存成功，正在检测连接…'; tip.style.color = '#64748B'; }
  if (btnSave)   btnSave.disabled = true;

  try {
    const status = await ApiService.checkStatus();
    if (status === 'online') {
      if (tip) { tip.textContent = '✅ 已连接，API 调用正常！'; tip.style.color = '#16A34A'; }
      _refreshConnStatus('online');
      setTimeout(closeSettingsModal, 1200);
    } else {
      const hint = key
        ? '❌ 连接失败，请检查 Key 和 Base URL 是否正确'
        : '💡 未填写 API Key，已切换到离线演示模式';
      if (tip) { tip.textContent = hint; tip.style.color = key ? '#DC2626' : '#D97706'; }
      _refreshConnStatus('offline');
    }
  } catch (err) {
    if (tip) { tip.textContent = `❌ 检测失败：${err.message || '网络错误'}`; tip.style.color = '#DC2626'; }
    _refreshConnStatus('offline');
  } finally {
    if (btnSave) btnSave.disabled = false;
  }
}

async function testApiConnection() {
  const tip     = $('settingsTip');
  const btnTest = $('btnTestConn');

  if (tip)     { tip.textContent = '⏳ 测试中…'; tip.style.color = '#64748B'; }
  if (btnTest)   btnTest.disabled = true;

  try {
    const status = await ApiService.checkStatus();
    if (status === 'online') {
      if (tip) { tip.textContent = '✅ 连接成功！'; tip.style.color = '#16A34A'; }
      _refreshConnStatus('online');
    } else {
      const cfg  = ApiService.getApiCfg();
      const hint = cfg.key
        ? '❌ 连接失败，请确认 Key 和 Base URL'
        : '⚠️ 未配置 API Key，使用离线演示模式';
      if (tip) { tip.textContent = hint; tip.style.color = cfg.key ? '#DC2626' : '#D97706'; }
      _refreshConnStatus('offline');
    }
  } catch (err) {
    if (tip) { tip.textContent = `❌ ${err.message}`; tip.style.color = '#DC2626'; }
  } finally {
    if (btnTest) btnTest.disabled = false;
  }
}

/* 刷新顶栏连接状态 */
function _refreshConnStatus(status) {
  const dot = $('connDot');
  const lbl = $('connLabel');
  const map = {
    online:  { c: '#16A34A', t: '已连接',      pulse: true  },
    offline: { c: '#EF4444', t: '离线·演示模式', pulse: false },
  };
  const m = map[status] || map.offline;
  if (dot) { dot.style.background = m.c; dot.classList.toggle('pulse', m.pulse); }
  if (lbl) { lbl.textContent = m.t; lbl.style.color = m.c; }
}

/* ═══════════════════════════════
   工具函数
═══════════════════════════════ */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
