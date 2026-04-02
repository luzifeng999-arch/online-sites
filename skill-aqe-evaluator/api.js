/* ═══════════════════════════════════════════
   api.js · 内置 Wanqing API + 完整 AQE 提示词
═══════════════════════════════════════════ */

const ApiService = (() => {

  /* ── 内置配置 ── */
  const CFG = {
    key:   'k0h3hn2v5rrobqodhr3zpwwmrhors9yn6xtc',
    base:  'https://wanqing-api.corp.kuaishou.com/api/gateway/v1',
    model: 'ep-yi4t2l-1775115584174507438',
  };

  /* ── 状态管理 ── */
  let _status = 'unknown';
  function getStatus() { return _status; }
  function setStatus(s) {
    _status = s;
    const dot  = document.getElementById('connDot');
    const lbl  = document.getElementById('connLabel');
    if (!dot) return;
    const map = {
      unknown: { c:'#94A3B8', t:'检测中', p:false },
      online:  { c:'#16A34A', t:'已连接', p:true  },
      offline: { c:'#EF4444', t:'离线',   p:false },
    };
    const m = map[s] || map.unknown;
    dot.style.background = m.c;
    dot.classList.toggle('pulse', m.p);
    if (lbl) { lbl.textContent = m.t; lbl.style.color = m.c; }
  }

  /* ── 底层 POST ── */
  async function post(messages, maxTokens, system) {
    const body = { model: CFG.model, max_tokens: maxTokens, messages };
    if (system) body.system = system;
    const res = await fetch(`${CFG.base}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CFG.key}` },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error?.message || `HTTP ${res.status}`);
    }
    return res.json();
  }

  /* ── 连接测试 ── */
  async function testConnection() {
    setStatus('unknown');
    try {
      await post([{ role:'user', content:'hi' }], 5);
      setStatus('online');
      return true;
    } catch {
      setStatus('offline');
      return false;
    }
  }

  /* ══════════════════════════════════════════
     系统提示词：专业 AQE 评测专家
  ══════════════════════════════════════════ */
  const SYSTEM = `你是顶级 UI/UX 设计评审专家，专注 AQE（Aesthetic Quality Evaluation）美学质量评测。

【AQE 五维度标准】
AQE-A 视觉层级与信息架构：字号梯度≥1.5x差、视觉重量对比鲜明、信息模块边界清晰、F/Z动线自然
AQE-B 色彩美学与情感调性：主色≤5种、饱和度30%-80%、色彩情感与场景匹配、无脏色/刺眼色
AQE-C 版式规范与排版质量：4/8px间距体系、行高1.5-1.8x、负空间≥40%、无孤立元素
AQE-D 品牌一致性与风格稳定：多次输出风格一致≥90%、组件语言统一、品牌调性明确
AQE-E 可访问性基线（强制）：对比度≥4.5:1(WCAG AA)、颜色非唯一信息、焦点可见、交互区域≥44px

【分数释义】9-10标杆级 · 7-8.9合格 · 6-6.9需关注 · 5-5.9有明显问题 · <5严重缺陷

【判定规则】
PASS：综合分≥7.5 且无维度<6.0
WATCH：综合分7.0-7.4，可有条件上线（2周内修复）
FAIL：综合分<7.0，或任意维度<6.0，打回修改
BLOCK：AQE-E任意子项<5.0，🚫强制阻断禁止上线

【权重体系】
UI生成:    A×0.30 B×0.25 C×0.25 D×0.10 E×0.10
图片生成:  A×0.20 B×0.45 C×0.15 D×0.10 E×0.10
视频动效:  A×0.25 B×0.30 C×0.20 D×0.15 E×0.10
文档/PPT:  A×0.25 B×0.15 C×0.30 D×0.15 E×0.15
评测:      A×0.00 B×0.30 C×0.00 D×0.40 E×0.30

你必须只返回 JSON，不要任何额外文字。`;

  /* ── 方向映射 ── */
  const DIR_CN = { ui:'UI生成', img:'图片生成', video:'视频动效', doc:'文档/PPT', eval:'评测' };
  const WEIGHTS = {
    ui:    { A:0.30, B:0.25, C:0.25, D:0.10, E:0.10 },
    img:   { A:0.20, B:0.45, C:0.15, D:0.10, E:0.10 },
    video: { A:0.25, B:0.30, C:0.20, D:0.15, E:0.10 },
    doc:   { A:0.25, B:0.15, C:0.30, D:0.15, E:0.15 },
    eval:  { A:0.00, B:0.30, C:0.00, D:0.40, E:0.30 },
  };

  /* ══════════════════════════════════════════
     主函数：AQE 全自动评测
     参数：{ direction, htmlContent, fileList, description }
  ══════════════════════════════════════════ */
  async function evaluate({ direction, htmlContent, fileList, description }) {
    const dir = direction || 'ui';
    const w = WEIGHTS[dir] || WEIGHTS.ui;
    const dirName = DIR_CN[dir] || dir;

    const filesStr = (fileList || []).slice(0, 25)
      .map(f => `  - ${f.name}${f.sizeStr ? ` (${f.sizeStr})` : ''}`)
      .join('\n');

    const htmlSnippet = (htmlContent || '').slice(0, 6000);

    const userMsg =
`请对以下 Skill 产出物进行完整 AQE 评测。

方向：${dirName}
权重：A=${w.A} B=${w.B} C=${w.C} D=${w.D} E=${w.E}
描述：${description || '（未提供）'}

文件列表：
${filesStr || '  （未提供）'}

主要内容（HTML 节选）：
---
${htmlSnippet || '（无 HTML 文件）'}
---

请严格按照以下 JSON 格式返回评测结果，不输出任何 JSON 以外的内容：
{
  "skillName": "<从内容识别的 Skill 名，如无则写未命名 Skill>",
  "direction": "${dir}",
  "directionName": "${dirName}",
  "scores": { "A": <1.0-10.0>, "B": <>, "C": <>, "D": <>, "E": <> },
  "composite": <加权综合分，保留1位小数>,
  "verdict": "<PASS|WATCH|FAIL|BLOCK>",
  "verdictReason": "<一句话判定原因，30字内>",
  "dimensions": {
    "A": { "score": <分>, "summary": "<60字内分析>", "issues": ["<具体问题>"] },
    "B": { "score": <分>, "summary": "<60字内>", "issues": [] },
    "C": { "score": <分>, "summary": "<60字内>", "issues": [] },
    "D": { "score": <分>, "summary": "<60字内>", "issues": [] },
    "E": { "score": <分>, "summary": "<60字内>", "issues": [], "blockFlag": <true/false> }
  },
  "failures": [
    { "dim": "<如 AQE-C>", "severity": "<block|p0|p1|p2>", "title": "<15字内>", "detail": "<50字内>", "fix": "<60字内可执行修复>", "isBlock": <true/false> }
  ],
  "strengths": ["<优点1，25字内>", "<优点2>"],
  "summary": "<120字内总体评价，包含亮点、核心问题、最高优先级改进方向>"
}`;

    try {
      const data = await post([{ role:'user', content: userMsg }], 2000, SYSTEM);
      const raw = data.content?.[0]?.text || '';

      /* 提取 JSON（兼容 AI 包在 ```json ``` 里的情况）*/
      let jsonStr = raw;
      const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fence) jsonStr = fence[1];
      const brace = jsonStr.match(/\{[\s\S]*\}/);
      if (!brace) throw new Error('AI 未返回有效 JSON');
      const result = JSON.parse(brace[0]);

      /* 重算综合分（防止 AI 出错）*/
      let comp = 0;
      const sw = WEIGHTS[result.direction || dir] || WEIGHTS.ui;
      ['A','B','C','D','E'].forEach(d => {
        result.scores[d] = parseFloat(result.scores[d]) || 5;
        comp += result.scores[d] * (sw[d] || 0);
      });
      result.composite = Math.round(comp * 10) / 10;

      /* 重算 verdict */
      const E = result.scores.E;
      const hasLow = ['A','B','C','D','E'].some(d => result.scores[d] < 6.0);
      if (result.dimensions?.E?.blockFlag || E < 5.0) result.verdict = 'BLOCK';
      else if (result.composite >= 7.5 && !hasLow) result.verdict = 'PASS';
      else if (result.composite >= 7.0) result.verdict = 'WATCH';
      else result.verdict = 'FAIL';

      setStatus('online');
      return { ok: true, data: result };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  return { testConnection, evaluate, getStatus, setStatus };
})();
