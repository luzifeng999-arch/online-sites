/* ═══════════════════════════════════════════
   evaluator.js · AQE 评测逻辑 & Checklist 数据
═══════════════════════════════════════════ */

const Evaluator = (() => {

  /* ─── AQE 维度配置 ─── */
  const DIMS = [
    { key: 'A', name: 'A · 视觉层级与信息架构', color: '#2563EB', bg: '#EFF6FF' },
    { key: 'B', name: 'B · 色彩美学与情感调性', color: '#7C3AED', bg: '#F5F3FF' },
    { key: 'C', name: 'C · 版式规范与排版质量', color: '#059669', bg: '#ECFDF5' },
    { key: 'D', name: 'D · 品牌一致性与风格稳定', color: '#D97706', bg: '#FFFBEB' },
    { key: 'E', name: 'E · 可访问性基线 (强制)', color: '#DC2626', bg: '#FEF2F2' },
  ];

  /* ─── 各方向权重配置 ─── */
  const WEIGHTS = {
    ui:    { A: 0.30, B: 0.20, C: 0.25, D: 0.15, E: 0.10 },
    img:   { A: 0.15, B: 0.35, C: 0.10, D: 0.25, E: 0.15 },
    video: { A: 0.15, B: 0.35, C: 0.10, D: 0.25, E: 0.15 },
    doc:   { A: 0.30, B: 0.20, C: 0.25, D: 0.15, E: 0.10 },
    eval:  { A: 0.00, B: 0.30, C: 0.00, D: 0.40, E: 0.30 },
  };

  /* ─── Checklist 数据（五大方向）─── */
  const CHECKLISTS = {
    ui: [
      {
        section: '前提条件确认',
        badge: 'PRE', color: '#64748B',
        items: [
          { id:'ui_pre_1', label:'输出格式已锁定', desc:'React组件 / 纯HTML / 截图，且有完整输出示例', tag:'pre' },
          { id:'ui_pre_2', label:'组件库已指定', desc:'shadcn/ui / Ant Design / Tailwind / 无框架，建设中不变更', tag:'pre' },
          { id:'ui_pre_3', label:'竞品对标已确定', desc:'v0.dev / Claude Artifacts / Framer AI，并有竞品截图存档', tag:'pre' },
          { id:'ui_pre_4', label:'字体方案合规', desc:'仅使用系统字体或开源授权字体，无未授权商用字体（苹方/微软雅黑等）', tag:'pre' },
        ]
      },
      {
        section: 'AQE-A · 视觉层级',
        badge: 'A', color: '#2563EB',
        items: [
          { id:'ui_a_1', label:'字号层级 ≥ 3 级', desc:'对比比例合理（建议20/14/12px），一眼可区分主次', tag:'aqe-a', dim:'A' },
          { id:'ui_a_2', label:'视觉动线清晰', desc:'最重要信息在视觉焦点位置（左上或中央），次要信息不抢眼', tag:'aqe-a', dim:'A' },
          { id:'ui_a_3', label:'最低分辨率下布局不崩溃', desc:'B端 ≥ 1280px，H5 ≥ 375px，无截断/叠压/越界', tag:'aqe-a', dim:'A' },
        ]
      },
      {
        section: 'AQE-C · 版式规范',
        badge: 'C', color: '#059669',
        items: [
          { id:'ui_c_1', label:'间距体系统一', desc:'所有间距使用4px或8px的倍数，同类元素间距相同，无随机值（7px/13px等）', tag:'aqe-c', dim:'C' },
          { id:'ui_c_2', label:'对齐无偏差', desc:'所有元素有明确对齐基准（左对齐/居中/右对齐），无浮动偏移', tag:'aqe-c', dim:'C' },
          { id:'ui_c_3', label:'留白充足', desc:'内容区域不超过页面70%，边距合理，无「满屏堆砌」感', tag:'aqe-c', dim:'C' },
        ]
      },
      {
        section: 'AQE-B · 色彩美学',
        badge: 'B', color: '#7C3AED',
        items: [
          { id:'ui_b_1', label:'主色系 ≤ 5 个色相', desc:'强调色 ≤ 2个，整体色彩和谐无冲突', tag:'aqe-b', dim:'B' },
        ]
      },
      {
        section: 'AQE-E · 可访问性（强制 BLOCK）',
        badge: 'E', color: '#DC2626',
        items: [
          { id:'ui_e_1', label:'文字对比度 ≥ 4.5:1', desc:'正文文字与背景对比度达标（WCAG AA）—— 强制BLOCK项', tag:'aqe-e', dim:'E', isBlock: true },
          { id:'ui_e_2', label:'状态不依赖颜色独立表达', desc:'错误/成功/警告状态有文字标注或图标，灰度截图仍可理解 —— 强制BLOCK项', tag:'aqe-e', dim:'E', isBlock: true },
          { id:'ui_e_3', label:'可交互元素有 focus 样式', desc:'Tab键遍历可见，按钮有hover/active状态', tag:'aqe-e', dim:'E' },
        ]
      },
      {
        section: 'AQE-D · 品牌一致性',
        badge: 'D', color: '#D97706',
        items: [
          { id:'ui_d_1', label:'跨次输出风格一致', desc:'同一Prompt调用3次，色调/布局风格无明显漂移', tag:'aqe-d', dim:'D' },
        ]
      },
    ],

    img: [
      {
        section: '前提条件确认',
        badge: 'PRE', color: '#64748B',
        items: [
          { id:'img_pre_1', label:'输出格式和最低分辨率已确定', desc:'SVG代码 / PNG / WebP，最低分辨率 ≥ 1024×1024', tag:'pre' },
          { id:'img_pre_2', label:'版权路线已确认', desc:'AI生成（确认模型许可证）/ 开源图库（确认商用协议）/ 自有素材', tag:'pre' },
          { id:'img_pre_3', label:'内容安全过滤机制已说明', desc:'不生成未授权真实人物、暴力、成人内容', tag:'pre' },
        ]
      },
      {
        section: 'AQE-B · 色彩美学与主体质量',
        badge: 'B', color: '#7C3AED',
        items: [
          { id:'img_b_1', label:'主体清晰无畸变', desc:'人物/物体/文字边界清晰，无明显AI变形特征（手指异常、文字乱码等）', tag:'aqe-b', dim:'B' },
          { id:'img_b_2', label:'关键元素出现率 ≥ 90%', desc:'Prompt中描述的关键视觉元素在输出图中可识别', tag:'aqe-b', dim:'B' },
          { id:'img_b_3', label:'色彩饱和度适中', desc:'不过饱和（色块刺眼）/ 不过灰（失去活力），冷暖关系协调', tag:'aqe-b', dim:'B' },
        ]
      },
      {
        section: 'AQE-A · 构图',
        badge: 'A', color: '#2563EB',
        items: [
          { id:'img_a_1', label:'构图平衡', desc:'主体未被裁切，有合理留白，无极端偏角或大面积无意义空白', tag:'aqe-a', dim:'A' },
        ]
      },
      {
        section: 'AQE-D · 风格一致性',
        badge: 'D', color: '#D97706',
        items: [
          { id:'img_d_1', label:'风格一致性', desc:'相同Prompt多次生成，整体风格（色调/笔触/风格类型）稳定，无随机漂移', tag:'aqe-d', dim:'D' },
        ]
      },
      {
        section: 'AQE-E · 可访问性（强制 BLOCK）',
        badge: 'E', color: '#DC2626',
        items: [
          { id:'img_e_1', label:'文字对比度 ≥ 4.5:1（含文字图片）', desc:'如图片中含文字说明/标题 —— 强制BLOCK项', tag:'aqe-e', dim:'E', isBlock: true },
          { id:'img_e_2', label:'图片内文字排版正常', desc:'字间距/行间距合理，不出现文字叠压或截断', tag:'aqe-c', dim:'C' },
        ]
      },
    ],

    video: [
      {
        section: '前提条件确认',
        badge: 'PRE', color: '#64748B',
        items: [
          { id:'vid_pre_1', label:'动效复杂度分级已选定', desc:'L1微动效(≤0.5s) / L2独立动效(≤3s) / L3复杂视频(≤30s)', tag:'pre' },
          { id:'vid_pre_2', label:'技术路线已确定', desc:'CSS / SVG / Lottie JSON / Remotion / AI视频，交付格式已明确', tag:'pre' },
          { id:'vid_pre_3', label:'时长范围和帧率标准已约束', desc:'L1:≤0.5s / L2:≤3s / L3:≤30s；≥60fps', tag:'pre' },
        ]
      },
      {
        section: 'AQE-B · 动效美学',
        badge: 'B', color: '#7C3AED',
        items: [
          { id:'vid_b_1', label:'缓动函数非线性', desc:'无linear ease（匀速）作为主要动效，使用ease-out / ease-in-out 或自定义贝塞尔', tag:'aqe-b', dim:'B' },
          { id:'vid_b_2', label:'时长合理', desc:'UI微动效200–400ms，过渡动效300–500ms，无过快(<100ms)或过慢(>1s)', tag:'aqe-b', dim:'B' },
        ]
      },
      {
        section: 'AQE-D · 品牌一致性',
        badge: 'D', color: '#D97706',
        items: [
          { id:'vid_d_1', label:'品牌调性匹配', desc:'动效速度/节奏与品牌性格一致（活泼品牌→弹性动效，严肃品牌→克制过渡）', tag:'aqe-d', dim:'D' },
          { id:'vid_d_2', label:'跨次风格稳定', desc:'相同参数多次生成，动效节奏/风格无明显漂移', tag:'aqe-d', dim:'D' },
        ]
      },
      {
        section: 'AQE-E · 可访问性（强制）',
        badge: 'E', color: '#DC2626',
        items: [
          { id:'vid_e_1', label:'响应 prefers-reduced-motion', desc:'系统设置「减少动态效果」时，动效停止或降级为简单淡入淡出', tag:'aqe-e', dim:'E' },
          { id:'vid_e_2', label:'无快速闪烁', desc:'不含频率 > 3Hz 的闪烁内容（防止光敏性癫痫风险）', tag:'aqe-e', dim:'E', isBlock: true },
        ]
      },
    ],

    doc: [
      {
        section: '前提条件确认',
        badge: 'PRE', color: '#64748B',
        items: [
          { id:'doc_pre_1', label:'路线已选定', desc:'「信息架构完备」路线 vs「美学表现优先」路线，二选一', tag:'pre' },
          { id:'doc_pre_2', label:'输出格式已确定', desc:'.pptx 文件 / HTML 幻灯片 / Markdown+CSS / Marp', tag:'pre' },
          { id:'doc_pre_3', label:'字体方案已确定', desc:'仅使用 Noto Sans SC / 思源黑体 / MiSans / Inter 等开源授权字体', tag:'pre' },
          { id:'doc_pre_4', label:'竞品对标已确定', desc:'品牌屋PPT → Skywork Agent / 视觉风格 → Gamma.app', tag:'pre' },
        ]
      },
      {
        section: 'AQE-A · 信息架构',
        badge: 'A', color: '#2563EB',
        items: [
          { id:'doc_a_1', label:'每页核心信息 ≤ 3 条', desc:'每条 ≤ 25字，无「论文摘要式」大段文字页面', tag:'aqe-a', dim:'A' },
          { id:'doc_a_2', label:'字号层级 ≤ 3 级', desc:'标题/副标题/正文，字号比例合理（建议1:0.7:0.5）', tag:'aqe-a', dim:'A' },
        ]
      },
      {
        section: 'AQE-C · 版式规范',
        badge: 'C', color: '#059669',
        items: [
          { id:'doc_c_1', label:'留白 ≥ 30% 版面', desc:'内容不超过版面70%，边距 ≥ 40px（1080p基准）', tag:'aqe-c', dim:'C' },
          { id:'doc_c_2', label:'行间距 1.4–1.6', desc:'正文字号 ≥ 16px（PPT投影场景），无密密麻麻的小字', tag:'aqe-c', dim:'C' },
        ]
      },
      {
        section: 'AQE-B · 色彩美学',
        badge: 'B', color: '#7C3AED',
        items: [
          { id:'doc_b_1', label:'全文配色统一', desc:'主色调一致，强调色 ≤ 3个，每页配色方案相同', tag:'aqe-b', dim:'B' },
        ]
      },
      {
        section: 'AQE-E · 可访问性（强制 BLOCK）',
        badge: 'E', color: '#DC2626',
        items: [
          { id:'doc_e_1', label:'文字对比度 ≥ 4.5:1', desc:'特别注意浅色背景上的浅色文字 —— 强制BLOCK项', tag:'aqe-e', dim:'E', isBlock: true },
        ]
      },
      {
        section: 'AQE-D · 风格一致性',
        badge: 'D', color: '#D97706',
        items: [
          { id:'doc_d_1', label:'风格跨页一致', desc:'所有页面布局框架、字体使用、配色方案统一，不出现「前半段商务风、后半段卡通风」', tag:'aqe-d', dim:'D' },
        ]
      },
    ],

    eval: [
      {
        section: '前提条件确认',
        badge: 'PRE', color: '#64748B',
        items: [
          { id:'eval_pre_1', label:'评测对象类型已明确', desc:'UI截图 / 图片文件 / 代码 / 文档，评测输入精确定义', tag:'pre' },
          { id:'eval_pre_2', label:'评分输出格式已确定', desc:'数值分(0-10) / 等级(ABCDE) / 布尔(pass/fail) / 维度报告', tag:'pre' },
          { id:'eval_pre_3', label:'≥ 10 条 Ground Truth 样本已准备', desc:'用于验证评测 Skill 的准确率', tag:'pre' },
          { id:'eval_pre_4', label:'每个维度有明确锚点描述', desc:'1分/5分/10分各是什么样的描述已写明', tag:'pre' },
        ]
      },
      {
        section: '准确性要求',
        badge: 'B', color: '#7C3AED',
        items: [
          { id:'eval_b_1', label:'Ground Truth 准确率 ≥ 85%', desc:'用10条已知答案样本测试，评测Skill打分与人工判断一致率 ≥ 85%', tag:'aqe-b', dim:'B' },
          { id:'eval_b_2', label:'多人标注一致性 κ ≥ 0.7', desc:'涉及多人标注时，Cohen\'s κ 或 Krippendorff\'s α ≥ 0.7', tag:'aqe-b', dim:'B' },
        ]
      },
      {
        section: '反馈质量',
        badge: 'D', color: '#D97706',
        items: [
          { id:'eval_d_1', label:'评测反馈可执行', desc:'每条问题描述包含「具体问题 + 建议操作」，不是纯分数，无「视觉效果差」等模糊描述', tag:'aqe-d', dim:'D' },
          { id:'eval_d_2', label:'评测报告含维度分布', desc:'总分 + 各维度得分 + 失分维度排名 + 典型失败案例', tag:'aqe-d', dim:'D' },
        ]
      },
    ]
  };

  /* ─── 渲染 Checklist ─── */
  function renderChecklist(direction) {
    const container = document.getElementById('checklistContainer');
    const data = CHECKLISTS[direction] || CHECKLISTS.ui;

    container.innerHTML = data.map(section => `
      <div class="checklist-section" data-section="${section.section}">
        <div class="checklist-section-header" onclick="toggleSection(this)">
          <span class="checklist-dim-badge" style="background:${section.color}">${section.badge}</span>
          <span class="checklist-section-title">${section.section}</span>
          <span class="checklist-section-count">${section.items.length} 项</span>
          <svg class="section-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="checklist-section-body">
          ${section.items.map(item => `
            <div class="checklist-item ${item.isBlock ? 'is-block' : ''}" data-id="${item.id}" onclick="Evaluator.toggleCheck('${item.id}')">
              <div class="checklist-checkbox" id="cb_${item.id}"></div>
              <div class="checklist-item-text">
                <div class="checklist-item-label">${item.label}${item.isBlock ? ' <span style="color:var(--fail);font-size:11px">🔴 BLOCK</span>' : ''}</div>
                <div class="checklist-item-desc">${item.desc}</div>
              </div>
              <span class="tag tag-${item.tag}">${item.tag.toUpperCase()}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    // 恢复已勾选状态
    const checks = AppState.checklist[direction] || {};
    Object.entries(checks).forEach(([id, checked]) => {
      if (checked) {
        const el = document.querySelector(`[data-id="${id}"]`);
        if (el) el.classList.add('checked');
        const cb = document.getElementById(`cb_${id}`);
        if (cb) cb.classList.add('checked');
      }
    });
  }

  /* ─── 切换勾选 ─── */
  function toggleCheck(id) {
    const dir = AppState.direction;
    if (!AppState.checklist[dir]) AppState.checklist[dir] = {};
    AppState.checklist[dir][id] = !AppState.checklist[dir][id];

    const el = document.querySelector(`[data-id="${id}"]`);
    const cb = document.getElementById(`cb_${id}`);
    if (el) el.classList.toggle('checked', AppState.checklist[dir][id]);
    if (cb) cb.classList.toggle('checked', AppState.checklist[dir][id]);
  }

  /* ─── 渲染评分滑块 ─── */
  function renderScoreSliders() {
    const container = document.getElementById('scoreSliders');
    container.innerHTML = DIMS.map(d => `
      <div class="score-slider-row" id="slider_row_${d.key}">
        <div class="score-slider-header">
          <div class="score-dim-label">
            <span class="score-dim-dot" style="background:${d.color}"></span>
            ${d.name}
          </div>
          <div class="score-value" id="score_val_${d.key}" style="color:${d.color}">
            ${AppState.scores[d.key] || 5}
          </div>
        </div>
        <div class="score-track">
          <div class="score-fill" id="score_fill_${d.key}" style="width:${((AppState.scores[d.key]||5)-1)/9*100}%;background:${d.color}"></div>
          <input type="range" class="score-input" min="1" max="10" step="0.5"
            value="${AppState.scores[d.key] || 5}"
            data-dim="${d.key}"
            oninput="Evaluator.updateScore('${d.key}', this.value)">
        </div>
        <div class="score-ticks">
          ${Array.from({length:10},(_,i)=>`<span class="score-tick">${i+1}</span>`).join('')}
        </div>
      </div>
    `).join('');

    updateCompositeScore();
  }

  /* ─── 更新单项分 ─── */
  function updateScore(dim, val) {
    const v = parseFloat(val);
    AppState.scores[dim] = v;
    document.getElementById(`score_val_${dim}`).textContent = v.toFixed(1);
    const fillPct = (v - 1) / 9 * 100;
    document.getElementById(`score_fill_${dim}`).style.width = fillPct + '%';
    updateCompositeScore();
  }

  /* ─── 计算综合分 ─── */
  function updateCompositeScore() {
    const dir = AppState.direction || 'ui';
    const weights = WEIGHTS[dir] || WEIGHTS.ui;
    let composite = 0;
    let weightSum = 0;

    DIMS.forEach(d => {
      const score = AppState.scores[d.key] || 5;
      const w = weights[d.key] || 0;
      if (w > 0) {
        composite += score * w;
        weightSum += w;
      }
    });

    // 归一化：不管权重总和是否为1，都正确计算加权平均
    if (weightSum > 0) composite = composite / weightSum;

    AppState.scores.composite = parseFloat(composite.toFixed(2));

    // 判定
    const E = AppState.scores.E || 5;
    let verdict;
    const hasBlockItem = E < 5.0;
    const hasFailDim = DIMS.some(d => (AppState.scores[d.key] || 5) < 6.0);

    if (hasBlockItem) {
      verdict = 'BLOCK';
    } else if (composite < 7.0 || hasFailDim) {
      verdict = 'FAIL';
    } else if (composite < 7.5) {
      verdict = 'WATCH';
    } else {
      verdict = 'PASS';
    }

    AppState.scores.verdict = verdict;

    // 更新UI
    const scoreEl = document.getElementById('compositeScore');
    const badgeEl = document.getElementById('verdictBadge');
    const bannerEl = document.getElementById('blockBanner');

    if (scoreEl) {
      scoreEl.textContent = composite.toFixed(1);
      const colorMap = { PASS:'var(--pass)', WATCH:'var(--watch)', FAIL:'var(--fail)', BLOCK:'var(--block)' };
      scoreEl.style.color = colorMap[verdict];
    }

    if (badgeEl) {
      badgeEl.textContent = verdict;
      badgeEl.className = 'verdict-badge ' + verdict.toLowerCase();
    }

    // BLOCK 横幅
    if (bannerEl) {
      if (verdict === 'BLOCK') {
        bannerEl.style.display = 'flex';
        const reasons = [];
        if (E < 5.0) reasons.push('AQE-E（可访问性分 ' + E + '）');
        document.getElementById('blockReason').textContent = reasons.join('、');
        // 补偿横幅占用的空间
        document.querySelector('.main-content').style.paddingTop = 'calc(var(--nav-height) + 40px + var(--space-6))';
      } else {
        bannerEl.style.display = 'none';
        document.querySelector('.main-content').style.paddingTop = '';
      }
    }

    // 更新权重说明
    updateWeightInfo(weights);
  }

  function updateWeightInfo(weights) {
    const el = document.getElementById('weightInfo');
    if (!el) return;
    const dir = AppState.direction || 'ui';
    const dirNames = { ui:'UI生成', img:'图片生成', video:'视频动效', doc:'文档PPT', eval:'评测' };
    el.textContent = `${dirNames[dir]} 权重：A${Math.round(weights.A*100)}% B${Math.round(weights.B*100)}% C${Math.round(weights.C*100)}% D${Math.round(weights.D*100)}% E${Math.round(weights.E*100)}%`;
  }

  /* ─── 应用 AI 自动分析结果 ─── */
  function applyAiScores(aiData) {
    if (!aiData?.scores) return;
    DIMS.forEach(d => {
      if (aiData.scores[d.key] != null) {
        const v = Math.max(1, Math.min(10, parseFloat(aiData.scores[d.key])));
        AppState.scores[d.key] = v;
        // 更新滑块
        const input = document.querySelector(`input[data-dim="${d.key}"]`);
        if (input) input.value = v;
        Evaluator.updateScore(d.key, v);
      }
    });
    // 存储 AI 分析文本
    AppState.aiAnalysis = aiData;
  }

  return {
    DIMS, WEIGHTS, CHECKLISTS,
    renderChecklist, toggleCheck,
    renderScoreSliders, updateScore, updateCompositeScore,
    applyAiScores
  };
})();

/* 全局辅助函数 */
function toggleSection(header) {
  header.parentElement.classList.toggle('collapsed');
}
