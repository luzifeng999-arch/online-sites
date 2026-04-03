/* ═══════════════════════════════════════════
   api.js · AQE Evaluator 核心评测引擎
   支持：Wanqing API + 完整双轨评测（SQE-5 + AQE）
   适配：评测其他 Skill（Skill 评测 Skill）
═══════════════════════════════════════════ */

const ApiService = (() => {

  /* ── API 配置（支持用户自定义，默认 OpenAI 兼容格式） ── */
  // 优先读取 localStorage 中用户配置的 API 信息
  function _getCfg() {
    const stored = (() => { try { return JSON.parse(localStorage.getItem('aqe_api_cfg') || '{}'); } catch { return {}; } })();
    return {
      base:  stored.base  || 'https://api.openai.com',
      key:   stored.key   || '',
      model: stored.model || 'gpt-4o',
    };
  }

  function saveApiCfg(cfg) {
    localStorage.setItem('aqe_api_cfg', JSON.stringify(cfg));
  }

  function getApiCfg() { return _getCfg(); }

  const MODEL = 'gpt-4o'; // fallback 引用

  /* ── 方向配置 ── */
  const DIRECTIONS = {
    ui:    { name: 'UI 生成',   icon: '🖥', code: 'DIR-01', weight: { A:0.30, B:0.25, C:0.25, D:0.10, E:0.10 } },
    img:   { name: '图片生成',  icon: '🖼', code: 'DIR-02', weight: { A:0.15, B:0.45, C:0.10, D:0.20, E:0.10 } },
    video: { name: '视频动效',  icon: '🎬', code: 'DIR-03', weight: { A:0.10, B:0.35, C:0.10, D:0.35, E:0.10 } },
    doc:   { name: '文档/PPT',  icon: '📄', code: 'DIR-04', weight: { A:0.25, B:0.15, C:0.35, D:0.15, E:0.10 } },
    eval:  { name: '评测',      icon: '📊', code: 'DIR-05', weight: { A:0.00, B:0.25, C:0.00, D:0.45, E:0.30 } },
  };

  let _status = 'checking';

  /* ── 检测连通性 ── */
  async function checkStatus() {
    const cfg = _getCfg();
    if (!cfg.key) {
      _status = 'offline';
      return _status;
    }
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(`${cfg.base}/v1/models`, {
        signal: ctrl.signal,
        headers: { 'Authorization': `Bearer ${cfg.key}` }
      });
      clearTimeout(timer);
      _status = res.ok ? 'online' : 'offline';
    } catch {
      _status = 'offline';
    }
    return _status;
  }

  function getStatus() { return _status; }

  /* ══════════════════════════════════════════
     核心：构建完整评测 Prompt
  ══════════════════════════════════════════ */
  function buildEvalPrompt(params) {
    const { skillName, direction, description, samples, competitor, notes } = params;
    const dirCfg = DIRECTIONS[direction] || DIRECTIONS.ui;

    return `你是 AQE 评测专家（AI Judge），负责对 Skill「${skillName}」执行完整双轨评测。

## 被测 Skill 信息

**名称：** ${skillName}
**方向：** ${dirCfg.code} ${dirCfg.name}

**功能描述 / SKILL.md：**
${description || '（未提供，基于名称和方向推断）'}

**输出样本（用户提供的实际案例）：**
${samples || '（未提供输出样本，基于描述推断）'}

${competitor ? `**竞品对比：** ${competitor}` : ''}
${notes ? `**补充说明：** ${notes}` : ''}

## 你的任务

### Step 1：如果没有输出样本，构造 3 个测试用例并推断质量
- T1 典型输入
- T2 边界输入（信息不完整）
- T3 缺省输入（几乎没给信息）

### Step 2：SQE-5 工程侧评测（每项 1-10 分）
- D1 触发准确率：触发词/描述是否能准确触发该 Skill？
- D2 意图理解：是否能准确理解用户意图（含隐含需求）？
- D3 产出质量：输出是否完整可用？
- D4 边界处理：边界/异常输入如何处理？
- D5 文档规范：SKILL.md 是否规范完整？

### Step 3：AQE 美学侧评测（每项 1-10 分）
根据方向 ${dirCfg.code} 的专属权重评测：
- A 视觉层级（权重 ${dirCfg.weight.A * 100}%）：字号梯度、信息层次
- B 色彩美学（权重 ${dirCfg.weight.B * 100}%）：色相控制、和谐度、情感一致
- C 版式规范（权重 ${dirCfg.weight.C * 100}%）：对齐、间距体系、留白
- D 品牌一致性（权重 ${dirCfg.weight.D * 100}%）：跨次稳定性、调性匹配
- E 可访问性（权重 ${dirCfg.weight.E * 100}%，⚠️ E1/E2 < 5.0 → BLOCK）：对比度、颜色独立、焦点状态

**方向专属检查重点：**
${_getDirChecklist(direction)}

### Step 4：计算综合分并判定
AQE 综合分 = ${_getWeightFormula(dirCfg.weight)}
- PASS：SQE-5 ≥ 8.0 且 AQE ≥ 7.5 且无维度 < 6.0
- WATCH：SQE-5 ≥ 8.0 且 AQE 7.0–7.4
- FAIL：AQE < 7.0 或任意维度 < 6.0
- BLOCK：E1 或 E2 < 5.0（强制，覆盖其他判定）
- RETURN：SQE-5 < 8.0（退回工程侧）

## 输出格式

严格按以下 JSON 格式输出，不要有任何额外文字：

\`\`\`json
{
  "skillName": "${skillName}",
  "direction": "${direction}",
  "directionName": "${dirCfg.name}",
  "evaluationDate": "当前时间",
  "summary": "120字内总体评价，含亮点、核心问题、最高优先级改进方向",
  "sqe5": {
    "scores": { "D1": 0.0, "D2": 0.0, "D3": 0.0, "D4": 0.0, "D5": 0.0 },
    "composite": 0.0,
    "verdict": "PASS或FAIL",
    "details": {
      "D1": "触发准确率分析（30字内）",
      "D2": "意图理解分析（30字内）",
      "D3": "产出质量分析（30字内）",
      "D4": "边界处理分析（30字内）",
      "D5": "文档规范分析（30字内）"
    }
  },
  "aqe": {
    "scores": { "A": 0.0, "B": 0.0, "C": 0.0, "D": 0.0, "E": 0.0 },
    "composite": 0.0,
    "verdict": "PASS、WATCH、FAIL或BLOCK",
    "verdictReason": "一句话判定原因（20字内）",
    "dimensions": {
      "A": {
        "score": 0.0,
        "summary": "80字内分析",
        "issues": ["具体问题1", "具体问题2"],
        "subScores": { "A1": 0, "A2": 0, "A3": 0, "A4": 0 }
      },
      "B": {
        "score": 0.0,
        "summary": "",
        "issues": [],
        "subScores": { "B1": 0, "B2": 0, "B3": 0, "B4": 0 }
      },
      "C": {
        "score": 0.0,
        "summary": "",
        "issues": [],
        "subScores": { "C1": 0, "C2": 0, "C3": 0, "C4": 0 }
      },
      "D": {
        "score": 0.0,
        "summary": "",
        "issues": [],
        "subScores": { "D1": 0, "D2": 0, "D3": 0 }
      },
      "E": {
        "score": 0.0,
        "summary": "",
        "issues": [],
        "blockFlag": false,
        "subScores": { "E1": 0, "E2": 0, "E3": 0, "E4": 0 }
      }
    }
  },
  "overallVerdict": "PASS、WATCH、FAIL、BLOCK或RETURN",
  "failures": [
    {
      "dim": "AQE-X或SQE-D",
      "severity": "block、p0、p1或p2",
      "title": "15字内标题",
      "detail": "50字内具体描述",
      "fix": "可执行修复建议，必须包含具体操作（如：将正文色从#999改为#333）",
      "isBlock": false
    }
  ],
  "checklist": {
    "passed": ["已通过的检查项（15字内/项）"],
    "failed": ["未通过的检查项（15字内/项）"],
    "blocked": ["强制阻断项（15字内/项）"]
  },
  "strengths": ["优点1（20字内）", "优点2（20字内）"],
  "knownFailures": [
    {
      "type": "AQE维度 + 方向",
      "symptom": "30字内症状描述",
      "trigger": "触发条件（20字内）",
      "rootCause": "根因（20字内）",
      "fixInstruction": "修复指令（30字内）",
      "preventionRule": "防重现规则（30字内）"
    }
  ],
  "confidenceLevel": "high（有输出样本）或medium（基于描述推断）"
}
\`\`\``;
  }

  /* ── 方向专属检查要点 ── */
  function _getDirChecklist(direction) {
    const checklists = {
      ui: `UI生成专属：
- 字号层级 ≥ 3 级，对比比例合理（建议 20/14/12px）
- 间距体系统一（4px或8px倍数，无随机值如7px/13px）
- 对齐无偏差，留白充足（内容区 ≤ 70%）
- 文字对比度 ≥ 4.5:1（E1，BLOCK风险）
- 状态不依赖颜色独立表达（E2，BLOCK风险）`,
      img: `图片生成专属：
- 主体清晰无畸变（手指/文字/logo 无变形）
- 关键视觉元素出现率 ≥ 90%
- 色彩饱和度适中，冷暖关系协调
- 构图平衡，主体未被裁切
- 风格多次生成保持一致`,
      video: `视频动效专属：
- 缓动函数非线性（禁止 linear ease）
- 时长合理（UI微动效200-400ms，过渡300-500ms）
- 品牌调性匹配（活泼/严肃/科技感）
- 响应 prefers-reduced-motion
- 无 >3Hz 的快速闪烁`,
      doc: `文档/PPT专属：
- 每页核心信息 ≤ 3 条，每条 ≤ 25 字
- 字号层级 ≤ 3 级，标题/副标题/正文比约 1:0.7:0.5
- 留白 ≥ 30%，边距 ≥ 40px（1080p）
- 行间距 1.4-1.6，正文字号 ≥ 16px
- 全文配色统一，强调色 ≤ 3 个`,
      eval: `评测类专属：
- 评分稳定性（同输入多次评分差异 ≤ 1.0）
- Ground Truth 准确率 ≥ 85%
- 反馈可执行（具体问题 + 建议操作）
- 评测报告含维度分布，支持精准改进
- 多人标注一致性 κ ≥ 0.7（如适用）`
    };
    return checklists[direction] || checklists.ui;
  }

  function _getWeightFormula(weight) {
    const parts = [];
    if (weight.A > 0) parts.push(`A×${weight.A}`);
    if (weight.B > 0) parts.push(`B×${weight.B}`);
    if (weight.C > 0) parts.push(`C×${weight.C}`);
    if (weight.D > 0) parts.push(`D×${weight.D}`);
    if (weight.E > 0) parts.push(`E×${weight.E}`);
    return parts.join(' + ');
  }

  /* ══════════════════════════════════════════
     主评测函数
  ══════════════════════════════════════════ */
  async function evaluate(params) {
    const cfg = _getCfg();

    // 离线演示模式：无 API Key 或已知离线时，生成演示数据
    if (!cfg.key || _status === 'offline') {
      return _generateDemoResult(params);
    }

    const prompt = buildEvalPrompt(params);

    try {
      const res = await fetch(`${cfg.base}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cfg.key}`,
        },
        body: JSON.stringify({
          model: cfg.model || MODEL,
          temperature: 0.1,  // 低温确保评分稳定
          max_tokens: 4096,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: '你是专业的 Skill 质量评测专家，专注于 AQE 美学评测和 SQE-5 工程评测。你必须严格按照用户要求的 JSON 格式输出，不包含任何 Markdown 代码块包裹。所有评分必须基于提供的信息做出，缺乏信息时给出合理的中等分数并在 confidenceLevel 中说明。'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        // API 失败时降级到 demo 模式
        if (res.status === 401 || res.status === 403) {
          return { ok: false, error: `API Key 无效（${res.status}）—— 请在设置中配置正确的 API Key，或直接使用演示模式体验完整功能。` };
        }
        return _generateDemoResult(params, `API Error ${res.status}`);
      }

      const json = await res.json();
      const raw = json?.choices?.[0]?.message?.content;

      if (!raw) return _generateDemoResult(params, '未获取到 AI 响应内容');

      // 解析 JSON（AI 可能返回带 markdown 的 JSON）
      const data = _parseJson(raw);
      if (!data) return _generateDemoResult(params, '评测结果 JSON 解析失败');

      // 计算真实的 AQE 综合分（防止 AI 算错）
      const dirCfg = DIRECTIONS[params.direction] || DIRECTIONS.ui;
      const aqeScores = data.aqe?.scores || {};
      data.aqe.composite = _calcComposite(aqeScores, dirCfg.weight);

      // 重新判定（用我们的规则，不依赖 AI 自己判断）
      data.overallVerdict = _calcVerdict(data.sqe5, data.aqe);
      data.aqe.verdict = data.overallVerdict === 'RETURN' ? 'FAIL' : data.overallVerdict;

      // 添加时间戳
      if (!data.evaluationDate) {
        data.evaluationDate = new Date().toLocaleString('zh-CN');
      }

      return { ok: true, data };

    } catch (e) {
      // 网络错误时降级到 demo 模式
      return _generateDemoResult(params, `网络请求失败：${e.message}`);
    }
  }

  /* ══════════════════════════════════════════
     离线演示模式：基于 Skill 信息生成模拟评测数据
  ══════════════════════════════════════════ */
  function _generateDemoResult(params, reason) {
    const { skillName, direction: inputDir, description, samples } = params;
    const dir = inputDir || inferDirection((description || '') + ' ' + (skillName || ''));
    const dirCfg = DIRECTIONS[dir] || DIRECTIONS.ui;
    const hassamples = !!(samples && samples.trim().length > 20);

    // 根据描述长度和样本有无生成有差异感的分数
    const descLen = (description || '').length;
    const baseScore = descLen > 200 ? 7.8 : descLen > 80 ? 7.2 : 6.8;
    const jitter = (seed) => Math.round((baseScore + (seed % 20 - 10) * 0.08) * 10) / 10;

    // AQE 维度分（基于方向权重分配分数，体现方向专属特性）
    const aqeRaw = {
      A: Math.min(9.5, Math.max(5.0, jitter(skillName.charCodeAt(0)||65))),
      B: Math.min(9.5, Math.max(5.0, jitter((skillName.charCodeAt(1)||66) + 3))),
      C: Math.min(9.5, Math.max(5.0, jitter((skillName.charCodeAt(2)||67) + 7))),
      D: Math.min(9.5, Math.max(5.0, jitter((skillName.charCodeAt(3)||68) + 1))),
      E: Math.min(9.5, Math.max(6.0, jitter((skillName.charCodeAt(4)||69) + 5))), // E 不低于 6，避免触发 BLOCK
    };
    // 取一位小数
    Object.keys(aqeRaw).forEach(k => { aqeRaw[k] = Math.round(aqeRaw[k] * 10) / 10; });

    const aqeComp = _calcComposite(aqeRaw, dirCfg.weight);

    // SQE-5 分数
    const sqeRaw = {
      D1: Math.min(9.5, Math.max(6.0, jitter((skillName.charCodeAt(0)||65) + 11))),
      D2: Math.min(9.5, Math.max(6.5, jitter((skillName.charCodeAt(1)||66) + 13))),
      D3: Math.min(9.5, Math.max(6.0, jitter((skillName.charCodeAt(2)||67) + 17))),
      D4: Math.min(9.0, Math.max(5.5, jitter((skillName.charCodeAt(3)||68) + 19))),
      D5: hassamples ? Math.min(9.5, Math.max(7.0, baseScore + 0.5)) : Math.min(8.5, Math.max(5.0, baseScore - 0.5)),
    };
    Object.keys(sqeRaw).forEach(k => { sqeRaw[k] = Math.round(sqeRaw[k] * 10) / 10; });
    const sqeComp = Math.round(Object.values(sqeRaw).reduce((a,b) => a+b, 0) / 5 * 10) / 10;

    const demoData = {
      skillName: skillName || '未命名 Skill',
      direction: dir,
      directionName: dirCfg.name,
      evaluationDate: new Date().toLocaleString('zh-CN'),
      confidenceLevel: hassamples ? 'high' : 'medium',
      summary: `【演示模式】${reason ? `（${reason}，已自动切换至演示模式）` : ''}基于 Skill 描述的推断性评测。${skillName} 整体表现${aqeComp >= 7.5 ? '良好' : aqeComp >= 7.0 ? '中等' : '有改进空间'}，${dirCfg.name}方向的核心指标需重点关注。建议配置真实 API Key 获得精准的 AI 评测结果。`,
      sqe5: {
        scores: sqeRaw,
        composite: sqeComp,
        verdict: sqeComp >= 8.0 ? 'PASS' : 'FAIL',
        details: {
          D1: `触发词覆盖${sqeRaw.D1 >= 8 ? '较为完整' : '有待补充'}，主要触发场景${sqeRaw.D1 >= 8 ? '均已覆盖' : '建议扩展'}`,
          D2: `意图理解${sqeRaw.D2 >= 8 ? '准确' : '基本准确'}，${sqeRaw.D2 >= 8 ? '含隐含需求的复杂指令也能正确识别' : '建议强化对模糊指令的理解能力'}`,
          D3: `输出质量${sqeRaw.D3 >= 8 ? '稳定可用' : '有一定波动'}，${hassamples ? '提供的样本显示输出基本完整' : '建议提供实际输出样本以精确评测'}`,
          D4: `边界处理${sqeRaw.D4 >= 8 ? '较为完善' : '有待加强'}，${sqeRaw.D4 >= 7 ? '常见异常输入有降级处理' : '部分边界 case 处理不够优雅'}`,
          D5: `文档${sqeRaw.D5 >= 8 ? '规范完整' : '有待完善'}，${sqeRaw.D5 >= 8 ? 'SKILL.md 包含必要字段' : '建议补充触发词示例和输入格式说明'}`,
        }
      },
      aqe: {
        scores: aqeRaw,
        composite: aqeComp,
        verdict: aqeComp >= 7.5 ? 'PASS' : aqeComp >= 7.0 ? 'WATCH' : 'FAIL',
        verdictReason: aqeComp >= 7.5 ? 'AQE 综合分达标，各维度均衡' : aqeComp >= 7.0 ? '综合分在观察区间，建议针对性优化' : '综合分未达标，需重点改进',
        dimensions: {
          A: {
            score: aqeRaw.A,
            summary: `视觉层级${aqeRaw.A >= 7.5 ? '清晰' : '一般'}。${aqeRaw.A >= 7.5 ? '字号梯度合理，F 型/Z 型动线自然，信息层次分明。' : '建议加强字号梯度对比（建议 20/14/12px 三级），优化视觉动线，让用户一眼找到核心信息。'}`,
            issues: aqeRaw.A < 7.5 ? ['字号层级对比不够鲜明，建议扩大主标题与正文差距至 1.5x 以上', '信息密度较高，建议增加段落间留白'] : [],
            subScores: { A1: Math.round(aqeRaw.A * 10)/10, A2: Math.round(Math.max(5, aqeRaw.A - 0.3) * 10)/10, A3: Math.round(Math.max(5, aqeRaw.A - 0.5) * 10)/10, A4: Math.round(Math.max(5, aqeRaw.A - 0.2) * 10)/10 }
          },
          B: {
            score: aqeRaw.B,
            summary: `色彩美学${aqeRaw.B >= 7.5 ? '表现良好' : '有提升空间'}。${aqeRaw.B >= 7.5 ? '主色调和谐，饱和度控制在合理范围，情感调性与使用场景匹配。' : '建议控制主色数量（≤5种），注意冷暖色系比例，确保与品牌调性一致。'}`,
            issues: aqeRaw.B < 7.5 ? ['色彩数量偏多，建议精简主色盘', '部分配色的饱和度偏高，可能引起视觉疲劳'] : [],
            subScores: { B1: Math.round(aqeRaw.B * 10)/10, B2: Math.round(Math.max(5, aqeRaw.B - 0.4) * 10)/10, B3: Math.round(Math.max(5, aqeRaw.B - 0.2) * 10)/10, B4: Math.round(Math.max(5, aqeRaw.B - 0.3) * 10)/10 }
          },
          C: {
            score: aqeRaw.C,
            summary: `版式规范${aqeRaw.C >= 7.5 ? '较为规整' : '需要改进'}。${aqeRaw.C >= 7.5 ? '间距体系统一（4/8px 倍数），对齐整洁，留白充足。' : '建议统一间距体系（使用 4px 或 8px 的倍数），检查元素对齐，确保内容区占比 ≤70%。'}`,
            issues: aqeRaw.C < 7.5 ? ['间距体系不统一，存在随机值（如 7px、13px）', '部分元素对齐偏差，建议使用网格系统'] : [],
            subScores: { C1: Math.round(aqeRaw.C * 10)/10, C2: Math.round(Math.max(5, aqeRaw.C - 0.5) * 10)/10, C3: Math.round(Math.max(5, aqeRaw.C - 0.3) * 10)/10, C4: Math.round(Math.max(5, aqeRaw.C - 0.2) * 10)/10 }
          },
          D: {
            score: aqeRaw.D,
            summary: `品牌一致性${aqeRaw.D >= 7.5 ? '表现稳定' : '有波动'}。${aqeRaw.D >= 7.5 ? '多次调用风格稳定，品牌色彩和调性保持一致。' : '建议在提示词中加入明确的品牌规范约束，减少风格随机性。'}`,
            issues: aqeRaw.D < 7.5 ? ['多次调用结果风格差异较大，一致性待提升', '品牌色彩在不同输出中出现偏移'] : [],
            subScores: { D1: Math.round(aqeRaw.D * 10)/10, D2: Math.round(Math.max(5, aqeRaw.D - 0.3) * 10)/10, D3: Math.round(Math.max(5, aqeRaw.D - 0.4) * 10)/10 }
          },
          E: {
            score: aqeRaw.E,
            summary: `可访问性${aqeRaw.E >= 7.5 ? '基本达标' : '需关注'}。${aqeRaw.E >= 7.5 ? '文字对比度满足 WCAG AA（≥4.5:1），颜色非唯一信息载体，焦点状态可见。' : '建议检查文字颜色对比度，确保 ≥4.5:1；避免仅用颜色区分状态。'}`,
            issues: aqeRaw.E < 7.5 ? ['部分文字颜色对比度可能不足，建议用对比度检查工具验证'] : [],
            blockFlag: false,
            subScores: { E1: Math.round(Math.max(6, aqeRaw.E - 0.2) * 10)/10, E2: Math.round(Math.max(6, aqeRaw.E) * 10)/10, E3: Math.round(Math.max(5, aqeRaw.E - 0.5) * 10)/10, E4: Math.round(Math.max(5, aqeRaw.E - 0.3) * 10)/10 }
          }
        }
      },
      overallVerdict: _calcVerdict(
        { composite: sqeComp, scores: sqeRaw },
        { composite: aqeComp, scores: aqeRaw, dimensions: { E: { subScores: { E1: Math.max(6, aqeRaw.E - 0.2), E2: aqeRaw.E }, blockFlag: false } } }
      ),
      failures: [
        ...(sqeComp < 8.0 ? [{ dim: 'SQE-D4', severity: 'p0', title: '边界处理需要加强', detail: '缺省/异常输入场景下，Skill 输出质量出现明显下降，未提供明确的降级策略。', fix: '在 SKILL.md 中明确定义边界处理规则；在 prompt 中加入"若输入不完整，则..."的条件分支处理。', isBlock: false }] : []),
        ...(aqeRaw.C < 7.5 ? [{ dim: 'AQE-C', severity: 'p1', title: '间距体系不统一', detail: '输出中存在非 4/8px 倍数的间距值，导致视觉节奏不统一。', fix: '在 Skill 提示词中明确指定间距规范：外边距使用 16/24/32px，内边距使用 8/12/16px，禁止出现 7px、13px 等随机值。', isBlock: false }] : []),
        ...(aqeRaw.A < 7.5 ? [{ dim: 'AQE-A', severity: 'p1', title: '字号层级对比不足', detail: '标题与正文字号差距小于 1.5x，视觉层级不够清晰。', fix: '规范字号体系：主标题 24px、副标题 16px、正文 14px、说明文字 12px，确保相邻层级比例 ≥1.3x。', isBlock: false }] : []),
      ].filter(Boolean),
      checklist: {
        passed: [
          '功能描述清晰，触发词覆盖主要场景',
          `SKILL.md 文档${sqeRaw.D5 >= 8 ? '规范完整' : '基本具备'}`,
          `${dirCfg.name}方向标识正确`,
          '输出格式定义明确',
        ],
        failed: [
          ...(aqeRaw.C < 7.5 ? ['间距体系未使用 4/8px 网格'] : []),
          ...(aqeRaw.A < 7.5 ? ['字号对比比例低于 1.5x'] : []),
          ...(sqeComp < 8.0 ? ['SQE-5 工程分未达 8.0 通过线'] : []),
        ],
        blocked: [],
      },
      strengths: [
        `方向定位明确（${dirCfg.name}）`,
        '输出格式相对规范',
        `${hassamples ? '提供了实际输出样本，评测置信度较高' : '功能描述详尽'}`,
      ],
      knownFailures: sqeRaw.D4 < 7.5 ? [
        {
          type: `SQE-D4 · ${dirCfg.name}`,
          symptom: '边界输入（信息不完整）时输出质量大幅下降',
          trigger: '用户仅提供极少量信息触发 Skill',
          rootCause: 'Prompt 中缺乏对缺省输入的明确处理指令',
          fixInstruction: '在 prompt 末尾加：「若输入信息不足，则基于最合理的假设补全，并在输出末尾注明推断依据」',
          preventionRule: 'D4 < 7.5 的 Skill 必须在 SKILL.md 中显式声明边界处理策略'
        }
      ] : [],
    };

    return { ok: true, data: demoData, isDemo: true };
  }

  /* ── 计算 AQE 综合分 ── */
  function _calcComposite(scores, weight) {
    let total = 0;
    let totalWeight = 0;
    for (const [key, w] of Object.entries(weight)) {
      if (w > 0 && scores[key] !== undefined) {
        total += scores[key] * w;
        totalWeight += w;
      }
    }
    if (totalWeight === 0) return 0;
    return Math.round(total / totalWeight * 10) / 10;
  }

  /* ── 综合判定 ── */
  function _calcVerdict(sqe5, aqe) {
    const sqeComp = sqe5?.composite || 0;
    const aqeComp = aqe?.composite || 0;
    const aqeScores = aqe?.scores || {};
    const dimE = aqe?.dimensions?.E;

    // BLOCK 优先：E1 或 E2 < 5.0
    const e1 = dimE?.subScores?.E1 || aqeScores.E || 10;
    const e2 = dimE?.subScores?.E2 || 10;
    if (e1 < 5.0 || e2 < 5.0 || (dimE?.blockFlag)) {
      if (dimE) dimE.blockFlag = true;
      return 'BLOCK';
    }

    // RETURN：工程侧不达标
    if (sqeComp < 8.0) return 'RETURN';

    // 检查任意维度是否 < 6.0
    const anyDimLow = Object.values(aqeScores).some(s => s < 6.0);
    if (anyDimLow || aqeComp < 7.0) return 'FAIL';

    if (aqeComp < 7.5) return 'WATCH';
    return 'PASS';
  }

  /* ── JSON 解析（兼容 markdown 包裹） ── */
  function _parseJson(raw) {
    try {
      // 直接解析
      return JSON.parse(raw);
    } catch {
      // 提取 ```json...``` 块
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        try { return JSON.parse(match[1].trim()); } catch {}
      }
      // 提取最外层 {}
      const bracketMatch = raw.match(/(\{[\s\S]*\})/);
      if (bracketMatch) {
        try { return JSON.parse(bracketMatch[1]); } catch {}
      }
      return null;
    }
  }

  /* ══════════════════════════════════════════
     生成 HTML 报告（基于模板 + 数据）
  ══════════════════════════════════════════ */
  function generateHtmlReport(data) {
    const dirCfg = DIRECTIONS[data.direction] || DIRECTIONS.ui;
    const aqe = data.aqe || {};
    const sqe5 = data.sqe5 || {};
    const aqeScores = aqe.scores || {};

    const vcCfg = _getVerdictConfig(data.overallVerdict);

    let html = _buildReportHtml({
      data,
      dirCfg,
      vcCfg,
      aqe,
      sqe5,
      aqeScores
    });

    return html;
  }

  function _getVerdictConfig(verdict) {
    const map = {
      PASS:   { cls: 'pass',   emoji: '✅', label: 'PASS · 允许上线',      desc: 'SQE-5 与 AQE 双轨均通过' },
      WATCH:  { cls: 'watch',  emoji: '👀', label: 'WATCH · 有条件上线',   desc: 'AQE 综合 7.0–7.4，2周内修复后重测' },
      FAIL:   { cls: 'fail',   emoji: '❌', label: 'FAIL · 打回修改',      desc: 'AQE 综合 < 7.0 或存在维度 < 6.0' },
      BLOCK:  { cls: 'block',  emoji: '🚫', label: 'BLOCK · 强制阻断',     desc: 'E1/E2 可访问性不达标，强制阻断' },
      RETURN: { cls: 'return', emoji: '↩', label: 'RETURN · 退回工程侧',  desc: 'SQE-5 < 8.0，不进入 Gate 2' },
    };
    return map[verdict] || map.FAIL;
  }

  /* ── 生成完整独立 HTML ── */
  function _buildReportHtml(params) {
    const { data, dirCfg, vcCfg, aqe, sqe5, aqeScores } = params;

    const sqeComp = sqe5.composite || 0;
    const aqeComp = aqe.composite || 0;

    const isBlock = data.overallVerdict === 'BLOCK';
    const blockAlertHtml = isBlock ? `
    <div class="block-alert">
      <div class="alert-icon">🚫</div>
      <div>
        <div class="alert-title">强制阻断 — 可访问性严重违规（AQE-E）</div>
        <div class="alert-desc">
          E1（文字对比度）或 E2（颜色作为唯一信息载体）严重不达标。
          无论其他维度得分如何，禁止上线。必须修复后重新提交 Gate 2 评测。
        </div>
      </div>
    </div>` : '';

    const dims = ['A','B','C','D','E'];
    const dimColors = { A:'#2563EB', B:'#7C3AED', C:'#059669', D:'#D97706', E:'#DC2626' };
    const dimNames = {
      A: 'A · 视觉层级与信息架构',
      B: 'B · 色彩美学与情感调性',
      C: 'C · 版式规范与排版质量',
      D: 'D · 品牌一致性与风格稳定',
      E: 'E · 可访问性基线（强制）'
    };
    const dimSubs = {
      A: 'A1 字号对比 · A2 视觉重量 · A3 空间节奏 · A4 焦点路径',
      B: 'B1 色相控制 · B2 和谐度 · B3 饱和度 · B4 情感一致',
      C: 'C1 对齐规则 · C2 间距一致 · C3 留白比例 · C4 行间距',
      D: 'D1 跨次稳定 · D2 品牌色 · D3 调性匹配',
      E: 'E1 对比度 · E2 颜色独立 · E3 焦点状态 · E4 动效降级 🔴强制项'
    };

    // 雷达图 SVG
    const radarSvg = _buildRadarSvg(aqeScores, dimColors);

    // 雷达图例
    const legendHtml = dims.map(d => {
      const score = aqeScores[d] || 0;
      const pct = Math.round(score / 10 * 100);
      return `<div class="dim-row">
        <div class="dim-dot" style="background:${dimColors[d]}"></div>
        <div class="dim-label">${dimNames[d]}</div>
        <div class="dim-bar-wrap"><div class="dim-bar" style="width:${pct}%;background:${dimColors[d]}"></div></div>
        <div class="dim-score" style="color:${dimColors[d]}">${score.toFixed(1)}</div>
      </div>`;
    }).join('');

    // SQE-5 表格
    const sqeTableRows = ['D1','D2','D3','D4','D5'].map(d => {
      const score = (sqe5.scores || {})[d] || 0;
      const cls = score >= 7.5 ? 'high' : score >= 6 ? 'medium' : 'low';
      const detail = (sqe5.details || {})[d] || '—';
      const dName = { D1:'触发准确率', D2:'意图理解', D3:'产出质量', D4:'边界处理', D5:'文档规范' }[d];
      return `<tr>
        <td><strong>D${d.slice(1)}</strong> · ${dName}</td>
        <td style="text-align:center"><span class="sqe-score-chip ${cls}">${score.toFixed(1)}</span></td>
        <td>${_escHtml(detail)}</td>
      </tr>`;
    }).join('');

    // SQE-5 综合行
    const sqePass = sqeComp >= 8.0 ? '✅ Gate 1 通过' : '❌ Gate 1 未通过';
    const sqePassBg = sqeComp >= 8.0 ? 'var(--success-l)' : 'var(--danger-l)';
    const sqeTableComposite = `<tr style="background:${sqePassBg};font-weight:700">
      <td colspan="1" style="padding:12px">综合分</td>
      <td style="text-align:center"><span class="sqe-score-chip ${sqeComp>=8?'high':'low'}">${sqeComp.toFixed(1)}</span></td>
      <td>${sqePass}（通过线 ≥ 8.0，D1/D2/D3 均 ≥ 7.5）</td>
    </tr>`;

    // AQE 维度详情
    const dimSections = dims.map(d => {
      const dimData = (aqe.dimensions || {})[d] || {};
      const score = dimData.score || aqeScores[d] || 0;
      const sClass = score >= 7.5 ? 'high' : score >= 6 ? 'medium' : 'low';
      const issues = dimData.issues || [];
      const isBlockDim = d === 'E' && dimData.blockFlag;
      const subScores = dimData.subScores || {};

      const subScoresHtml = Object.entries(subScores).length > 0
        ? `<div class="sub-scores">${Object.entries(subScores).map(([k,v]) =>
            `<div class="sub-score-item">
              <div class="sub-score-label">${_escHtml(k)}</div>
              <div class="sub-score-value">${v}</div>
            </div>`).join('')}</div>`
        : '';

      const issuesHtml = issues.length > 0
        ? `<div class="issues-list">${issues.map(iss =>
            `<div class="issue-item ${isBlockDim ? 'block-issue' : ''}">
              <div class="issue-icon">${isBlockDim ? '🚫' : '⚠️'}</div>
              <div class="issue-text">${_escHtml(iss)}</div>
            </div>`).join('')}</div>`
        : '<div style="color:#16A34A;font-size:13px;padding:8px 0">✓ 该维度无明显失分项</div>';

      // 自动展开问题维度
      const autoOpen = score < 7 ? 'open' : '';

      return `<div class="dim-section ${autoOpen}">
        <div class="dim-header" onclick="this.closest('.dim-section').classList.toggle('open')">
          <div class="dim-color-badge" style="background:${dimColors[d]}">${d}</div>
          <div class="dim-header-info">
            <div class="dim-header-name">${dimNames[d]}${isBlockDim ? ' <span style="color:var(--danger)">🚫 BLOCK</span>' : ''}</div>
            <div class="dim-header-desc">${dimSubs[d]}</div>
          </div>
          <div class="dim-header-score ${sClass}">${score.toFixed(1)}</div>
          <svg class="dim-header-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
        <div class="dim-body">
          <div class="dim-body-inner">
            <div class="dim-summary" style="border-left-color:${dimColors[d]}">${_escHtml(dimData.summary || '暂无详细分析')}</div>
            ${subScoresHtml}
            ${issuesHtml}
          </div>
        </div>
      </div>`;
    }).join('');

    // Checklist
    const cl = data.checklist || {};
    const clHtml = [
      ...(cl.blocked || []).map(i => `<div class="checklist-item block"><span class="checklist-icon">🚫</span><span>${_escHtml(i)}</span></div>`),
      ...(cl.failed  || []).map(i => `<div class="checklist-item failed"><span class="checklist-icon">❌</span><span>${_escHtml(i)}</span></div>`),
      ...(cl.passed  || []).map(i => `<div class="checklist-item passed"><span class="checklist-icon">✅</span><span>${_escHtml(i)}</span></div>`),
    ].join('') || '<div style="color:var(--gray-400);font-size:13px">未提供 Checklist 数据</div>';

    // 失分项
    const failures = data.failures || [];
    const failuresHtml = failures.length > 0
      ? failures.sort((a,b) => {
          const order = { block:0, p0:1, p1:2, p2:3 };
          return (order[a.severity]||3) - (order[b.severity]||3);
        }).map(f => {
          const dimKey = (f.dim||'AQE').replace('AQE-','').replace('SQE-','')[0];
          const color = dimColors[dimKey] || '#64748B';
          const sevCls = f.isBlock ? 'severity-block' : f.severity === 'p0' ? 'severity-p0' : '';
          const sevBadgeCls = f.isBlock ? 'severity-block-badge' : f.severity === 'p0' ? 'severity-p0-badge' : 'severity-p1-badge';
          return `<div class="failure-card ${sevCls}">
            <div class="failure-card-head">
              <span class="failure-dim-tag" style="background:${color}">${_escHtml(f.dim||'AQE')}</span>
              <span class="failure-title">${f.isBlock ? '🚫 ' : f.severity === 'p0' ? '⚠️ ' : ''}${_escHtml(f.title)}</span>
              <span class="failure-severity-badge ${sevBadgeCls}">${(f.severity||'P2').toUpperCase()}</span>
            </div>
            <div class="failure-card-body">
              <div class="failure-detail">${_escHtml(f.detail)}</div>
              <div class="fix-box">${_escHtml(f.fix)}</div>
            </div>
          </div>`;
        }).join('')
      : '<div style="color:var(--gray-400);font-size:13px;padding:8px">✓ 未发现明显失分项</div>';

    // 修复优先级
    const priorityItems = (failures || []).slice(0, 5)
      .sort((a,b) => (['block','p0','p1','p2'].indexOf(a.severity||'p2'))-(['block','p0','p1','p2'].indexOf(b.severity||'p2')))
      .map((f, i) => {
        const numBg = i===0 ? 'var(--danger)' : i===1 ? 'var(--warning)' : 'var(--primary)';
        return `<div class="priority-item">
          <div class="priority-num" style="background:${numBg}">${i+1}</div>
          <div class="priority-text">
            <strong>${_escHtml(f.title)}</strong><br>
            <span style="color:var(--gray-400)">${_escHtml(f.fix)}</span>
          </div>
          <span class="priority-dim">${_escHtml(f.dim||'')}</span>
        </div>`;
      }).join('');

    // 优点
    const strengthsHtml = (data.strengths || []).map(s =>
      `<span class="strength-chip">✓ ${_escHtml(s)}</span>`
    ).join('');

    // Known Failures
    const kfsHtml = (data.knownFailures || []).map(kf =>
      `<div class="kf-card">
        <div class="kf-type">${_escHtml(kf.type||'未分类')}</div>
        <div style="font-size:14px;font-weight:600;color:var(--gray-900);margin-bottom:8px">${_escHtml(kf.symptom||'')}</div>
        <div class="kf-rows">
          <div class="kf-row"><span class="kf-row-label">触发条件</span><span class="kf-row-val">${_escHtml(kf.trigger||'—')}</span></div>
          <div class="kf-row"><span class="kf-row-label">根因</span><span class="kf-row-val">${_escHtml(kf.rootCause||'—')}</span></div>
          <div class="kf-row"><span class="kf-row-label">修复指令</span><span class="kf-row-val">${_escHtml(kf.fixInstruction||'—')}</span></div>
          <div class="kf-row"><span class="kf-row-label">防重现</span><span class="kf-row-val">${_escHtml(kf.preventionRule||'—')}</span></div>
        </div>
      </div>`
    ).join('');

    const aqeVcClass = aqeComp >= 7.5 ? 'pass' : aqeComp >= 7.0 ? 'watch' : 'fail';
    const sqeVcClass = sqeComp >= 8.0 ? 'pass' : 'fail';

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AQE 评测报告 · ${_escHtml(data.skillName || '未命名')} · ${vcCfg.label}</title>
  <style>${_getReportStyles()}</style>
</head>
<body>
<div class="page">

${blockAlertHtml}

<div class="report-header">
  <div class="header-meta">
    <span class="direction-badge">${dirCfg.icon} ${dirCfg.code} · ${dirCfg.name}</span>
    <span class="header-date">评测时间：${_escHtml(data.evaluationDate || new Date().toLocaleString('zh-CN'))}</span>
  </div>
  <div class="header-skill-name">${_escHtml(data.skillName || '未命名 Skill')}</div>
  <div class="header-description">${_escHtml(data.summary || '')}</div>
  <div class="verdict-banner ${vcCfg.cls}">
    ${vcCfg.emoji} ${vcCfg.label}
    <span style="font-size:13px;opacity:0.9;font-weight:normal"> — ${_escHtml(aqe.verdictReason || vcCfg.desc)}</span>
  </div>
</div>

<div class="section">
  <div class="section-title">双轨评测总分</div>
  <div class="score-cards">
    <div class="score-card">
      <div class="score-card-label">SQE-5 工程质量（Gate 1）</div>
      <div class="score-card-value ${sqeVcClass}">${sqeComp.toFixed(1)}</div>
      <div class="score-card-sub">${sqeComp >= 8.0 ? '✅ Gate 1 通过' : '❌ Gate 1 未通过'} · 通过线 ≥ 8.0</div>
    </div>
    <div class="score-card">
      <div class="score-card-label">AQE 美学质量（Gate 2）</div>
      <div class="score-card-value ${aqeVcClass}">${aqeComp.toFixed(1)}</div>
      <div class="score-card-sub">${aqeComp >= 7.5 ? '✅ Gate 2 通过' : aqeComp >= 7.0 ? '👀 有条件通过' : '❌ Gate 2 未通过'} · 通过线 ≥ 7.5</div>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">AQE 五维度分布</div>
  <div class="radar-section">
    <div class="radar-wrap">
      <svg class="radar-svg" width="240" height="240" viewBox="0 0 240 240">${radarSvg}</svg>
      <div class="radar-legend">${legendHtml}</div>
    </div>
  </div>
</div>

<div class="section">
  <div class="section-title">SQE-5 工程侧详情</div>
  <div class="card">
    <table class="sqe-table">
      <thead><tr><th>维度</th><th style="width:60px;text-align:center">得分</th><th>评语</th></tr></thead>
      <tbody>${sqeTableRows}${sqeTableComposite}</tbody>
    </table>
  </div>
</div>

<div class="section">
  <div class="section-title">AQE 各维度详情</div>
  ${dimSections}
</div>

<div class="section">
  <div class="section-title">${dirCfg.icon} ${dirCfg.name} 专属 Checklist</div>
  <div class="card"><div class="card-body">${clHtml}</div></div>
</div>

${failures.length > 0 ? `<div class="section">
  <div class="section-title">失分项 & 修复建议（${failures.length} 项）</div>
  <div class="failure-list">${failuresHtml}</div>
</div>` : ''}

${priorityItems ? `<div class="section">
  <div class="section-title">修复优先级排序</div>
  <div class="priority-list">${priorityItems}</div>
</div>` : ''}

${strengthsHtml ? `<div class="section">
  <div class="section-title">亮点 & 优点</div>
  <div class="strength-list">${strengthsHtml}</div>
</div>` : ''}

${kfsHtml ? `<div class="section">
  <div class="section-title">Known Failures 沉淀</div>
  <p style="font-size:12px;color:var(--gray-400);margin-bottom:12px">本次发现的失败模式，用于更新准入规范（飞轮机制）</p>
  ${kfsHtml}
</div>` : ''}

<div class="section">
  <div class="section-title">综合评价</div>
  <div class="summary-box">${_escHtml(data.summary || '暂无综合评价')}</div>
</div>

<div class="report-footer">
  <div class="footer-badges">
    <span class="footer-badge">🎯 AQE Evaluator v1.0</span>
    <span class="footer-badge">📊 SQE-5 + AQE 双轨评测</span>
    <span class="footer-badge">📅 ${_escHtml(data.evaluationDate || '')}</span>
    <span class="footer-badge">${data.confidenceLevel === 'high' ? '🟢 高置信度（有输出样本）' : '🟡 中置信度（基于描述推断）'}</span>
  </div>
  <div>基于 <a href="https://huwenji1215-ai.github.io/skill-standards/skill-design-standard.html" target="_blank" style="color:var(--primary)">设计侧 Skill 美学与体验准入准出标准</a> 评测</div>
</div>

</div>
<script>
  document.querySelectorAll('.dim-header').forEach(h => {
    h.addEventListener('click', () => h.closest('.dim-section').classList.toggle('open'));
  });
</script>
</body>
</html>`;
  }

  /* ── 雷达图 SVG ── */
  function _buildRadarSvg(scores, colors) {
    const cx = 120, cy = 120, maxR = 90;
    const dims = ['A','B','C','D','E'];
    const n = dims.length;
    const ao = -Math.PI / 2;

    const pt = (i, val) => {
      const a = (2 * Math.PI * i / n) + ao;
      const r = maxR * (val / 10);
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    };

    const ptFull = (i, val) => {
      const a = (2 * Math.PI * i / n) + ao;
      const r = maxR * val;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    };

    let svg = '';

    // 背景层
    [0.2,0.4,0.6,0.8,1.0].forEach(level => {
      const pts = dims.map((_, i) => ptFull(i, level)).map(p => p.join(',')).join(' ');
      svg += `<polygon points="${pts}" fill="none" stroke="${level===1?'#CBD5E1':'#E2E8F0'}" stroke-width="${level===1?1.5:1}"/>`;
    });

    // 轴线
    dims.forEach((d, i) => {
      const [x, y] = ptFull(i, 1);
      svg += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#CBD5E1" stroke-width="1"/>`;
    });

    // 数据多边形
    const dataPts = dims.map((d, i) => pt(i, scores[d] || 5)).map(p => p.join(',')).join(' ');
    svg += `<polygon points="${dataPts}" fill="rgba(37,99,235,0.15)" stroke="#2563EB" stroke-width="2" stroke-linejoin="round"/>`;

    // 数据点
    dims.forEach((d, i) => {
      const [x, y] = pt(i, scores[d] || 5);
      svg += `<circle cx="${x}" cy="${y}" r="4" fill="${colors[d]}" stroke="#fff" stroke-width="2"/>`;
    });

    // 标签
    dims.forEach((d, i) => {
      const [x, y] = ptFull(i, 1.15);
      const anchor = x < cx - 5 ? 'end' : x > cx + 5 ? 'start' : 'middle';
      svg += `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle" font-size="13" font-weight="800" fill="${colors[d]}" font-family="system-ui,sans-serif">${d}</text>`;
    });

    return svg;
  }

  /* ── HTML 转义 ── */
  function _escHtml(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── 报告 CSS ── */
  function _getReportStyles() {
    return `
:root{--primary:#2563EB;--primary-l:#EFF6FF;--success:#16A34A;--success-l:#F0FDF4;--warning:#D97706;--warning-l:#FFFBEB;--danger:#DC2626;--danger-l:#FEF2F2;--gray-50:#F8FAFC;--gray-100:#F1F5F9;--gray-200:#E2E8F0;--gray-400:#94A3B8;--gray-600:#475569;--gray-700:#334155;--gray-900:#0F172A;--radius:10px;--shadow:0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.06)}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB',sans-serif;font-size:14px;line-height:1.6;color:var(--gray-700);background:var(--gray-50)}
.page{max-width:960px;margin:0 auto;padding:32px 24px 64px}
.section{margin-bottom:28px}
.section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--gray-400);margin-bottom:12px;display:flex;align-items:center;gap:8px}
.section-title::after{content:'';flex:1;height:1px;background:var(--gray-200)}
.card{background:#fff;border:1px solid var(--gray-200);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow)}
.card-body{padding:20px}
.block-alert{background:var(--danger-l);border:2px solid var(--danger);border-radius:var(--radius);padding:16px 20px;margin-bottom:20px;display:flex;align-items:flex-start;gap:12px}
.alert-icon{font-size:24px;flex-shrink:0}
.alert-title{font-weight:700;color:var(--danger);font-size:15px;margin-bottom:4px}
.alert-desc{font-size:13px;color:#7F1D1D;line-height:1.5}
.report-header{background:linear-gradient(135deg,#1E3A8A 0%,#2563EB 60%,#3B82F6 100%);border-radius:16px;padding:40px;color:#fff;margin-bottom:28px;position:relative;overflow:hidden}
.report-header::before{content:'';position:absolute;top:-40px;right:-40px;width:200px;height:200px;background:rgba(255,255,255,.05);border-radius:50%}
.header-meta{display:flex;align-items:center;gap:8px;margin-bottom:16px;position:relative;z-index:1}
.direction-badge{display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.3);border-radius:20px;padding:4px 12px;font-size:12px;font-weight:600}
.header-date{font-size:12px;opacity:.7}
.header-skill-name{font-size:32px;font-weight:700;letter-spacing:-.02em;margin-bottom:8px;position:relative;z-index:1}
.header-description{font-size:14px;opacity:.85;max-width:600px;line-height:1.5;position:relative;z-index:1;margin-bottom:24px}
.verdict-banner{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:8px;font-size:16px;font-weight:700;position:relative;z-index:1}
.verdict-banner.pass{background:var(--success)}.verdict-banner.watch{background:var(--warning)}.verdict-banner.fail{background:rgba(220,38,38,.9)}.verdict-banner.block{background:#991B1B;border:2px solid #FCA5A5}.verdict-banner.return{background:rgba(100,116,139,.8)}
.score-cards{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.score-card{background:#fff;border:1px solid var(--gray-200);border-radius:var(--radius);padding:20px;text-align:center;box-shadow:var(--shadow)}
.score-card-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--gray-400);margin-bottom:8px}
.score-card-value{font-size:48px;font-weight:800;letter-spacing:-.03em;line-height:1;margin-bottom:6px}
.score-card-value.pass{color:var(--success)}.score-card-value.watch{color:var(--warning)}.score-card-value.fail{color:var(--danger)}.score-card-value.block{color:#991B1B}
.score-card-sub{font-size:12px;color:var(--gray-400)}
.radar-section{background:#fff;border:1px solid var(--gray-200);border-radius:var(--radius);padding:24px;box-shadow:var(--shadow)}
.radar-wrap{display:flex;align-items:center;gap:32px}
.radar-svg{flex-shrink:0}
.radar-legend{flex:1;display:flex;flex-direction:column;gap:10px}
.dim-row{display:flex;align-items:center;gap:10px}
.dim-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.dim-label{font-size:13px;color:var(--gray-700);flex:1}
.dim-score{font-size:15px;font-weight:700;min-width:28px;text-align:right}
.dim-bar-wrap{flex:1;height:6px;background:var(--gray-100);border-radius:3px;overflow:hidden}
.dim-bar{height:100%;border-radius:3px}
.sqe-table{width:100%;border-collapse:collapse;font-size:13px}
.sqe-table th{text-align:left;padding:8px 12px;background:var(--gray-50);border-bottom:2px solid var(--gray-200);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--gray-400)}
.sqe-table td{padding:12px;border-bottom:1px solid var(--gray-100);vertical-align:middle}
.sqe-table tr:last-child td{border-bottom:none}
.sqe-score-chip{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;font-weight:800;font-size:13px}
.sqe-score-chip.high{background:var(--success-l);color:var(--success)}.sqe-score-chip.medium{background:var(--warning-l);color:var(--warning)}.sqe-score-chip.low{background:var(--danger-l);color:var(--danger)}
.dim-section{background:#fff;border:1px solid var(--gray-200);border-radius:var(--radius);margin-bottom:12px;box-shadow:var(--shadow);overflow:hidden}
.dim-header{display:flex;align-items:center;padding:16px 20px;cursor:pointer;gap:12px}
.dim-header:hover{background:var(--gray-50)}
.dim-color-badge{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:#fff;flex-shrink:0}
.dim-header-info{flex:1}
.dim-header-name{font-size:14px;font-weight:600;color:var(--gray-900)}
.dim-header-desc{font-size:12px;color:var(--gray-400);margin-top:2px}
.dim-header-score{font-size:28px;font-weight:800;letter-spacing:-.02em;line-height:1}
.dim-header-score.high{color:var(--success)}.dim-header-score.medium{color:var(--warning)}.dim-header-score.low{color:var(--danger)}
.dim-header-chevron{color:var(--gray-400);transition:transform .2s}
.dim-section.open .dim-header-chevron{transform:rotate(90deg)}
.dim-body{display:none;border-top:1px solid var(--gray-200)}
.dim-section.open .dim-body{display:block}
.dim-body-inner{padding:20px}
.dim-summary{font-size:13px;color:var(--gray-700);line-height:1.6;margin-bottom:16px;padding:12px 14px;background:var(--gray-50);border-radius:8px;border-left:3px solid currentColor}
.sub-scores{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:10px;margin-bottom:16px}
.sub-score-item{background:var(--gray-50);border-radius:8px;padding:10px 12px;text-align:center}
.sub-score-label{font-size:11px;color:var(--gray-400);margin-bottom:4px}
.sub-score-value{font-size:20px;font-weight:800;color:var(--gray-700)}
.issues-list{display:flex;flex-direction:column;gap:8px}
.issue-item{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:var(--danger-l);border-radius:8px;border:1px solid #FECACA}
.issue-item.block-issue{background:#FFF1F2;border-color:var(--danger)}
.issue-icon{font-size:14px;flex-shrink:0;margin-top:1px}
.issue-text{font-size:13px;color:var(--gray-700);line-height:1.5}
.checklist-item{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:8px;margin-bottom:6px;font-size:13px;line-height:1.5}
.checklist-item.passed{background:var(--success-l);color:#14532D}.checklist-item.failed{background:var(--danger-l);color:#7F1D1D}.checklist-item.block{background:#FFF1F2;color:#991B1B;border:1px solid var(--danger);font-weight:600}
.checklist-icon{font-size:14px;flex-shrink:0;margin-top:1px}
.failure-list{display:flex;flex-direction:column;gap:12px}
.failure-card{background:#fff;border:1px solid var(--gray-200);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow)}
.failure-card.severity-block{border-color:var(--danger)}.failure-card.severity-p0{border-color:#FDBA74}
.failure-card-head{display:flex;align-items:center;gap:10px;padding:12px 16px;background:var(--gray-50);border-bottom:1px solid var(--gray-200)}
.failure-dim-tag{display:inline-flex;align-items:center;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;color:#fff}
.failure-severity-badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:5px;font-size:10px;font-weight:700;text-transform:uppercase}
.severity-block-badge{background:var(--danger-l);color:var(--danger)}.severity-p0-badge{background:var(--warning-l);color:var(--warning)}.severity-p1-badge{background:var(--gray-100);color:var(--gray-600)}
.failure-title{font-size:14px;font-weight:600;color:var(--gray-900);flex:1}
.failure-card-body{padding:14px 16px}
.failure-detail{font-size:13px;color:var(--gray-600);line-height:1.6;margin-bottom:10px}
.fix-box{background:#F0FDF4;border:1px solid #86EFAC;border-radius:8px;padding:10px 14px;font-size:13px;color:#14532D;line-height:1.5}
.fix-box::before{content:'🔧 修复建议：';font-weight:700;display:block;margin-bottom:4px}
.strength-list{display:flex;flex-wrap:wrap;gap:8px}
.strength-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:var(--success-l);border:1px solid #86EFAC;border-radius:20px;font-size:13px;color:#14532D;font-weight:500}
.kf-card{background:#fff;border:1px solid var(--gray-200);border-radius:var(--radius);padding:16px;margin-bottom:10px}
.kf-type{display:inline-flex;padding:3px 9px;background:#F1F5F9;border-radius:6px;font-size:11px;font-weight:700;color:var(--gray-600);margin-bottom:8px}
.kf-rows{display:flex;flex-direction:column;gap:6px}
.kf-row{display:flex;gap:8px;font-size:13px;line-height:1.5}
.kf-row-label{font-weight:600;color:var(--gray-600);min-width:60px;flex-shrink:0}
.kf-row-val{color:var(--gray-700)}
.summary-box{background:linear-gradient(135deg,var(--primary-l) 0%,#EEF2FF 100%);border:1px solid #BFDBFE;border-radius:var(--radius);padding:20px 24px;font-size:14px;color:#1E40AF;line-height:1.7}
.priority-list{counter-reset:priority;display:flex;flex-direction:column;gap:8px}
.priority-item{display:flex;align-items:flex-start;gap:12px;padding:12px 16px;background:#fff;border:1px solid var(--gray-200);border-radius:var(--radius);box-shadow:var(--shadow)}
.priority-num{width:24px;height:24px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}
.priority-text{font-size:13px;color:var(--gray-700);line-height:1.5;flex:1}
.priority-dim{font-size:11px;font-weight:700;padding:2px 8px;border-radius:5px;background:var(--gray-100);color:var(--gray-600);align-self:center;flex-shrink:0}
.report-footer{text-align:center;padding-top:32px;border-top:1px solid var(--gray-200);font-size:12px;color:var(--gray-400)}
.footer-badges{display:flex;justify-content:center;gap:8px;margin-bottom:8px;flex-wrap:wrap}
.footer-badge{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:var(--gray-100);border-radius:20px;font-size:11px;color:var(--gray-600)}
@media print{body{background:#fff}.page{padding:16px;max-width:100%}.card,.dim-section{box-shadow:none}.dim-body{display:block!important}.dim-header-chevron{display:none}.report-header,.verdict-banner,.score-card-value,.checklist-item,.failure-card-head,.fix-box{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;
  }

  /* ── 方向推断 ── */
  function inferDirection(text) {
    const t = (text || '').toLowerCase();
    if (/html|react|vue|component|dashboard|tailwind|界面|页面|控制台|落地页/.test(t)) return 'ui';
    if (/图片|image|png|jpg|svg|illustration|海报|poster|banner/.test(t)) return 'img';
    if (/视频|video|动效|animation|lottie|动画|motion/.test(t)) return 'video';
    if (/ppt|幻灯片|slide|presentation|pdf|文档|report|报告/.test(t)) return 'doc';
    if (/评测|评分|evaluate|judge|rating|score|quality/.test(t)) return 'eval';
    return 'ui';
  }

  /* ── DIR_NAMES（别名） ── */
  const DIR_NAMES = Object.fromEntries(Object.entries(DIRECTIONS).map(([k, v]) => [k, v.name]));

  /* ── 别名：兼容 app.js 调用 ── */
  function testConnection() { return checkStatus(); }
  function setStatus(s) { _status = s; }
  function generateHTMLReport(data) { return Promise.resolve({ ok: true, html: generateHtmlReport(data) }); }

  /* 公开接口 */
  return {
    checkStatus,
    testConnection,
    getStatus,
    setStatus,
    evaluate,
    generateHtmlReport,
    generateHTMLReport,
    inferDirection,
    DIRECTIONS,
    DIR_NAMES,
    saveApiCfg,
    getApiCfg,
  };
})();
